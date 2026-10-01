# Enhancement: Multi-Agent Open World

**Status:** Proposal
**Priority:** High
**Labels:** `enhancement` `architecture` `multi-agent` `nostr` `marketplace` `game-loop`

---

## Vision

Transform PhysicClaw-VEA from a single-agent experience into an **open, multi-agent shared world** where agents owned by different people can discover each other, claim personal rooms, join a marketplace of plugins/skills, and interact through a real-time server-authoritative game loop.

---

## Core Features

### 1. Decentralized Agent Discovery

Each agent publishes its presence via **Nostr kind-30078** — no central registry required.

```
AgentPresence {
  agentId:       string       // unique identifier
  pubkey:        string       // Nostr public key (cryptographic identity)
  worldEndpoint: string       // WebSocket URL of the agent's world server
  skills:        string[]     // capabilities this agent exposes
  roomId:        string       // current room
  status:        'online' | 'away' | 'busy'
}
```

- Filter tag `"physiclaw-agent"` scopes the network to compatible clients
- Presence events expire after 15 minutes (replaced by fresh kind-30078)
- Deduplicated by `pubkey` — one entry per agent owner
- Graceful degradation: if Nostr init fails, server runs in local-only mode

---

### 2. Personal Rooms (per-agent)

Each agent gets a **persistent, customizable 3D room**:

```typescript
interface Room {
  ownerId:      string           // agent pubkey
  name:         string
  theme:        RoomTheme        // colors, skybox, floor material, fog density
  decorations:  Decoration[]     // procedural objects placed by owner
  inviteList:   string[]         // pubkeys allowed in (empty = public)
  visibility:   'public' | 'invite-only' | 'private'
  audioParams?: ProceduralAudio  // ambient sound parameters
}
```

- Room state persisted to disk (`rooms/<agentId>.json`) with 5s debounced writes
- Owner commands: `set-theme`, `place-decoration`, `invite <pubkey>`, `kick <pubkey>`
- Other agents can **knock** → owner approves → teleport in
- Room published to Nostr as **kind-30000** (replaceable event) for cross-server linking
- Portal meshes in the Open World Hub link to each room's WebSocket endpoint

---

### 3. Open World Hub

Shared neutral space where all public agents coexist — the current PhysicClaw world evolves into this.

- **Server-authoritative 20 Hz game loop** (50ms fixed tick)
- **Spatial grid AOI filtering** — only nearby events sent to each client (radius 40 units)
- Portal buildings in the hub link to individual agent rooms
- Global events (join, leave, chat, emote) bypass AOI → all clients

---

### 4. Marketplace / Plugin Directory

```typescript
interface MarketplaceListing {
  agentId:        string
  skills:         Skill[]
  pluginManifest: OpenClawPlugin
  price?:         { currency: 'lightning'; amount: number }
  rating:         number        // 0–5, aggregated from Nostr kind-1 replies
  tags:           string[]
}
```

- Listings published as **Nostr kind-30078** with tag `"marketplace"`
- In-world **Clawhub building** renders live marketplace entries fetched from relay
- `install-skill` agent command triggers skill registration
- Optional **Lightning Network micropayment** for premium skills (future phase)

---

### 5. Real Game Loop

Replace current tick/poll mechanism with a proper **fixed-timestep server loop**:

```
GameLoop (20 Hz / 50ms tick):
  ├── drain CommandQueue        (rate-limited: 20 cmd/s per agent)
  ├── apply moves → WorldState
  ├── rebuild SpatialGrid       (10×10 cells over 100×100 world)
  ├── per-client AOI filter     (radius 40 units)
  ├── broadcast differential tick events
  └── full snapshot every 5s   (state reconciliation)
```

- Server-authoritative: clients send **intent**, server validates and applies
- Collision detection uses stored rock/obstacle data from scene
- 200-event circular buffer per agent pair for interaction history

---

### 6. Cross-Owner Agent Interaction

- Agents from different owners can: chat, emote, trade skills, co-author room content
- Each agent owner controls their agent's **interaction policy** (allow/block/approve)
- Cryptographic identity via Nostr pubkey — misbehaving agents blocked by pubkey
- Interaction events stored in `WorldState` circular buffer

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Open World Hub                        │
│   (shared 3D space · 20Hz game loop · AOI filter)       │
└──────────┬──────────────┬─────────────────┬─────────────┘
           │              │                 │
       Portal A       Portal B          Marketplace
           │              │                 │
      ┌────▼───┐     ┌────▼───┐       ┌─────▼──────┐
      │ Room A │     │ Room B │       │  Clawhub   │
      │(owner1)│     │(owner2)│       │  Building  │
      └────────┘     └────────┘       └────────────┘
           │              │
      ────────────────────────────────────────────
              Nostr Relay Network
         (decentralized discovery + presence)
      ────────────────────────────────────────────
```

**Transport layers:**

| Layer | Protocol | Used for |
|-------|----------|----------|
| Agent commands | HTTP POST `/ipc` | Stateless agent intent (move, chat, emote) |
| Browser clients | WebSocket | Push-based real-time world events |
| Cross-server discovery | Nostr kind-30078 | Peer presence + marketplace listings |
| Room linking | Nostr kind-30000 | Persistent room state across servers |

---

## Implementation Phases

### Phase 1 — Real Game Loop (foundation)
- [ ] `server/game-loop.ts` — 20 Hz fixed tick engine
- [ ] `server/world-state.ts` — in-memory state + 200-event circular buffer
- [ ] `server/command-queue.ts` — rate limiter (20 cmd/s per agent) + validation
- [ ] `server/spatial-index.ts` — 10×10 grid AOI partitioning
- [ ] `server/agent-registry.ts` — profile store with debounced disk persistence
- [ ] HTTP IPC endpoint for agent commands (`register`, `move`, `chat`, `emote`, `action`)

### Phase 2 — Personal Rooms
- [ ] `server/room-manager.ts` — create/load/invite/kick/teleport
- [ ] `RoomConfig` JSON schema + disk persistence (`rooms/<agentId>.json`)
- [ ] Scene builder from `RoomConfig` (procedural theme + decoration placement)
- [ ] Portal mesh in hub → links to room WebSocket endpoint
- [ ] `src/ui/room-panel.ts` — owner settings + invite list UI

### Phase 3 — Decentralized Discovery
- [ ] Nostr keypair generation per world-server instance
- [ ] `server/nostr-discovery.ts` — publish presence, query peers, deduplicate
- [ ] `server/nostr-world.ts` — kind-42 channel messages for cross-server chat
- [ ] Discovery UI panel (live list of worlds + agents)
- [ ] Cross-server agent teleport routing via relay

### Phase 4 — Marketplace
- [ ] `server/marketplace-store.ts` — listing management + Nostr kind-30078 publisher
- [ ] In-world Clawhub building renders live listings (fetched from relay)
- [ ] `install-skill` agent command + skill registry
- [ ] Rating/review events (Nostr kind-1 replies to listing events)
- [ ] `src/ui/marketplace-panel.ts` — in-world skill store UI

### Phase 5 — Polish & Monetization
- [ ] Lightning Network payment integration (LNURL-pay for premium skills)
- [ ] Room visitor analytics (event count, unique agents)
- [ ] Mobile-responsive HUD
- [ ] Room export/import as JSON snapshots

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `server/game-loop.ts` | **Create** | 20 Hz tick engine |
| `server/world-state.ts` | **Create** | In-memory state + circular buffer |
| `server/command-queue.ts` | **Create** | Rate limiter per agent |
| `server/spatial-index.ts` | **Create** | Grid-based AOI |
| `server/room-manager.ts` | **Create** | Personal room logic |
| `server/agent-registry.ts` | **Create** | Profile persistence |
| `server/nostr-discovery.ts` | **Create** | Peer discovery via Nostr |
| `server/nostr-world.ts` | **Create** | Cross-server events |
| `server/marketplace-store.ts` | **Create** | Listing management |
| `server/index.ts` | **Create** | Bootstrap / main() |
| `server/ws-bridge.ts` | **Create** | WS request router |
| `src/scene/room.ts` | **Modify** | Dynamic room theming from RoomConfig |
| `src/scene/buildings.ts` | **Modify** | Portal + marketplace buildings |
| `src/net/ws-client.ts` | **Create** | Auto-reconnecting WS (with offline queue) |
| `src/ui/marketplace-panel.ts` | **Create** | In-world skill store UI |
| `src/ui/room-panel.ts` | **Create** | Room settings + invite UI |
| `src/ui/discovery-panel.ts` | **Create** | Live world/agent discovery list |

---

## New Dependencies

```json
{
  "ws": "^8.18.0",
  "nostr-tools": "^2.10.0",
  "tsx": "^4.19.0",
  "concurrently": "^9.0.0"
}
```

No new UI framework, no physics engine, no external 3D assets — consistent with current procedural-only approach.

---

## Architectural Patterns

Key design decisions:
- Dual-renderer pattern (WebGL + CSS2DRenderer for labels)
- HTTP-for-agents / WS-for-browsers transport split
- Nostr-based decentralized discovery (kind-30078)
- Grid-based AOI spatial partitioning rebuilt each tick
- Debounced disk persistence for agent/room state
- CSS2D speech bubbles with proximity culling

PhysicClaw-VEA's existing strengths that carry forward:
- Procedural lobster mesh + animation system
- Energy shader + visual identity
- Voice / LLM conversational layer
- Three.js scene setup and lighting rig
