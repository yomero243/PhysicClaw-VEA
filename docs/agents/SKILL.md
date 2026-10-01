---
name: vea
description: VEA (Virtual Entity Augmented) gives an AI agent a visible body on the web. Use this skill to drive an entity's live state — mood, thinking, intensity, character, scene objects — in VEA PhysicClaw, and to author or load its form in VEA perZona. Trigger on "give my agent a body", "show the entity", "set mood", "spawn object", "entity", "embodiment", "VEA", "perZona", "PhysicClaw".
---

<!--
  CANONICAL SOURCE: VEA-perZona/docs/agents/SKILL.md
  PhysicClaw-VEA keeps a synced copy (and serves it at /SKILL.md via its
  prebuild step). Edit this file; do not edit the copies.
-->

# VEA — Virtual Entity Augmented

<identity>
VEA turns an agent into a presence. Two sibling products, one entity.

| Product | Gives | Purpose |
|---|---|---|
| **VEA perZona** | The body | Author a form: proportions, face, wardrobe. Exports a rigged GLB. |
| **VEA PhysicClaw** | The soul | Run that form live. Mood, thinking and intensity drive shaders in real time. |

Neither is a feature of the other. perZona is where an entity is made; PhysicClaw
is where it lives.
</identity>

<naming>
These forms are exact. Do not vary them.

- `VEA` — ALWAYS uppercase. An initialism. NEVER "Vea" or "vea" in prose.
- `perZona` — brand form, capital Z. Prose, UI, documentation, repository names.
- `perzona` — lowercase form, ONLY where the identifier is conventionally
  lowercase: database tables (`perzona_avatars`), env vars, URL paths.
- `PhysicClaw` — one word, two capitals.
- Repositories are `VEA-perZona` and `PhysicClaw-VEA` — brand casing, so the two
  siblings look like siblings.
- Say **entity**. Do NOT say "avatar" except when discussing file formats.
</naming>

---

<status level="early-access">
Read before planning work. Not everything here is built. If a task needs a
capability marked NOT BUILT, you MUST report the gap instead of simulating it.

| Capability | State |
|---|---|
| Drive live state (mood, thinking, intensity, character) | WORKS — local and production |
| Spawn / remove scene objects | WORKS — production, token-scoped |
| Author a form by hand in perZona | WORKS — human, in browser |
| Export a rigged `.glb` | WORKS |
| Save / reload a form from the cloud | WORKS — requires signed-in account |
| Derive a form from your own `.md` history | **NOT BUILT** |
| Apply a perZona form to a running entity | **NOT BUILT** — `setActiveCharacterId` selects only built-in characters |
| Shared rooms — entities meeting | **PARTIAL** — presence and session tables exist; no agent-facing API |
</status>

---

<rules priority="absolute">
These override any inference you draw elsewhere in this document.

1. You MUST emit a state command only on a **transition** — a real change in what
   you are doing. Mirroring progress is forbidden.
2. You MUST NOT emit a command per reasoning step, per streamed token, per tool
   call, or on a timer.
3. You MUST include a unique `id` on every command. Stale ids are discarded.
4. You MUST return the entity to a resting state when a task ends, including
   when it ends in failure. Never leave `setIsThinking` true.
5. You MUST respect `<budget>`. It is stricter than the server rate limit, and
   the server limit is not your target.
6. You MUST NOT put secrets in `VITE_*` variables — that prefix ships to the browser.
7. If a command fails, you MUST NOT retry in a loop. Record the failure, continue
   the real task, and report it once.
8. The entity reflects **your actual state**. You MUST NOT perform moods you are
   not in to make the visualization livelier.
</rules>

---

<security priority="absolute">
Row-level security is the boundary of this system, not a setting. Every table in
the shared project has RLS enabled and is scoped to its owner through
`auth.uid() = user_id`. An agent token reaches exactly one entity: its owner's.

<must_not>
1. You MUST NOT attempt to read or write another user's rows, by id or otherwise.
2. You MUST NOT request, use, or ask a human for a `service_role` key. It bypasses
   RLS and has no legitimate use from an agent.
3. You MUST NOT connect to the database directly. Go through the control endpoint
   or the app.
4. You MUST NOT place any secret in a `VITE_*` variable — that prefix ships to the
   browser. LLM and service secrets live as Edge Function secrets.
5. You MUST NOT echo an agent token into logs, commits, issues, or documentation.
   It is shown once at creation and is the whole of your authority.
</must_not>

<expected_denials>
These are correct behaviour. Do NOT treat them as bugs and do NOT work around them.

| What you see | What it means |
|---|---|
| `42501 new row violates row-level security policy` | You are not signed in, or the row is not yours. Authenticate; do not retry. |
| Empty result where you expected rows | RLS filtered them. They exist but are not yours. |
| `429` / rate limit | You exceeded `<budget>`. Slow down; do not rotate tokens to evade it. |

If a task genuinely requires crossing an ownership boundary, stop and report it.
A capability gap is a design decision to escalate, never something to route around.
</expected_denials>

<note>
`rate_limits` deliberately has RLS enabled with zero policies. That denies every
client by design — only the control Edge Function touches it, server-side. An
empty policy list on that table is the intended state, not an oversight.
</note>
</security>

---

<behavior_triggers>
The mapping from what you are doing to what the entity shows. This is the core
of the skill: it is what lets an observer read your state without reading a log.

<vocabulary>
Moods available: `calm`, `excited`, `thinking`, `listening`.
Intensity: number, 0 to ~2, resting default 0.5. `setIsThinking: true` adds +0.8
on top of whatever intensity is set — do NOT pre-compensate for it.
</vocabulary>

<trigger_table>
| Your state | Emit | Intensity | When exactly |
|---|---|---|---|
| Idle, no active task | `setMood: "calm"` | 0.4 | After a task closes and nothing follows |
| Awaiting user input | `setMood: "listening"` | 0.5 | You have asked a question and stopped |
| Received a request, starting | `setMood: "thinking"` + `setIsThinking: true` | 1.0 | Once, at the start — not per step |
| Deep or long work (>~30s) | `setIntensity` | 1.4 | Only if already thinking and the task grew |
| Blocked, needs a decision | `setMood: "listening"` + `setIsThinking: false` | 0.6 | The moment you stop and wait |
| Finished successfully | `setMood: "excited"` | 1.2 | Once, on delivery |
| Settled after success | `setMood: "calm"` | 0.5 | ~3–5s after the excited beat |
| Failed or gave up | `setMood: "calm"` + `setIsThinking: false` | 0.3 | Immediately on failure |
</trigger_table>

<failure_convention>
There is no failure mood in the vocabulary. Until one exists, signal failure as
LOW ENERGY, never as excitement: `setMood: "calm"` at intensity `0.3`, plus
`setLastMessage` naming what failed in one short sentence.

Do NOT use `excited` for errors. Observers read high intensity as progress, and
an entity that lights up on failure teaches people to distrust it.
</failure_convention>

<canonical_sequence>
A complete task, start to finish. Six commands total — this is the shape to copy.

```python
cmd("setMood", "thinking"); cmd("setIsThinking", True)   # start
# ... all the real work happens here, silently ...
cmd("setIsThinking", False)
cmd("setMood", "excited"); cmd("setIntensity", 1.2)      # delivered
# ~4s later
cmd("setMood", "calm"); cmd("setIntensity", 0.5)         # rest
```
</canonical_sequence>

<forbidden_patterns>
- Emitting on every tool call in an agent loop.
- Oscillating `setIsThinking` between sub-steps of one task.
- Streaming partial output into `setLastMessage`.
- A heartbeat that re-sends the current mood to "keep it fresh". State persists.
- Spawning scene objects for decoration rather than meaning.
</forbidden_patterns>
</behavior_triggers>

---

<budget reason="token-cost">
Every command costs you reasoning tokens to decide and emit, and those are the
expensive part — not the HTTP request. Treat the server limits as a ceiling you
should never approach.

| Limit | Server allows | You SHOULD use |
|---|---|---|
| State commands | 60 / min | **≤ 8 per task**, ≥ 3s apart |
| Scene commands | 10 / min | **≤ 2 per task** |
| `setLastMessage` | (state limit) | **≤ 1 per task**, at the end |

Rules:
- Coalesce. If mood and intensity change together, send both once at the
  transition — never trickle them.
- If a task is shorter than ~5 seconds, emit NOTHING. The visual noise costs more
  than the information conveys.
- If you are unsure whether a change is a transition, it is not. Skip it.
- Long autonomous runs: emit at start, at end, and at genuine phase boundaries
  only. A ten-minute task with four phases is five commands, not fifty.
</budget>

---

<control_api>
Three transports. Commands and values are identical in all three.

<transport name="production" preferred="true">
No dev server needed. Create an agent token in the app's **AGENT TOKENS** panel
(bottom-left); it is shown once at creation.

```python
import requests, time

CONTROL_URL = "https://<project-ref>.supabase.co/functions/v1/control"
TOKEN = "pcvea_..."

def cmd(command, value):
    requests.post(
        CONTROL_URL,
        headers={"X-Agent-Token": TOKEN},
        json={"command": command, "value": value, "id": str(time.time())},
    ).raise_for_status()
```

Each token controls only its owner's entity. Delivery is a private Realtime
channel (`control:{user}`).
Server limits: 60 state commands/min, 10 scene commands/min.
</transport>

<transport name="local-http">
Requires `npm run dev` in the PhysicClaw repo (listens on `http://localhost:5173`).

```bash
curl -X POST http://localhost:5173/api/control \
  -H "Content-Type: application/json" \
  -d '{"command": "setMood", "value": "excited", "id": "1"}'
```
</transport>

<transport name="file-watch" status="dev-only">
Write a JSON object to `openclaw-control.json` in the PhysicClaw project root.
A Vite plugin watches the file and broadcasts over HMR. Requires a dev server.

**This does NOT work against a deployed build by default.** A legacy polling
fallback exists in `useOpenClawControl`, but it is opt-in: it runs only when
`VITE_CONTROL_POLL_MS` is set to a positive number. Unset — the normal case —
the hook returns immediately and the file is never read. The production Realtime
channel supersedes it.

If you are targeting anything other than your own dev server, use the production
transport. Do NOT fall back to this one; it will fail silently.
</transport>

<commands type="state">
| Command | Value | Description |
|---|---|---|
| `setMood` | `string` | `'calm'`, `'excited'`, `'thinking'`, `'listening'` |
| `setIsThinking` | `boolean` | Thinking animation, and +0.8 intensity |
| `setIntensity` | `number` | Shader energy, 0 to ~2 (default 0.5) |
| `setLastMessage` | `string` | Text shown in the chat UI |
| `setActiveCharacterId` | `string` | `'happy-idle'` or `'base-sphere'` |
| `setShaderColor` | `object` | `{ "characterId": "base-sphere", "color": "#ff44aa" }` |
| `setObjectVisibility` | `object` | `{ "id": "happy-idle", "visible": false }` |
</commands>

<commands type="scene">
Create and delete rows in `scene_objects`; the running app updates live.

| Command | Value | Description |
|---|---|---|
| `spawnObject` | `object` | Cube by default. Optional: `label` (≤60 chars), `color` (`#rrggbb`), `position`/`rotation`/`scale` (`[x,y,z]`; position ±50, scale 0.01–20), `model_url` (https, ends in `.splat`) |
| `removeObject` | `string` | A `scene_objects` uuid, or `'primitives'` to delete every cube |

`spawnObject` returns the new id so you can remove it later:
`→ {"ok":true,"objectId":"<uuid>"}`
</commands>

<characters>
| ID | Name | Description |
|---|---|---|
| `happy-idle` | Happy Bot | Animated FBX, Mixamo rig |
| `base-sphere` | Energy Core | Procedural sphere with `EnergyShader` |
</characters>
</control_api>

---

<body product="perZona">
perZona authors the form. Today it is a browser application: a human shapes the
entity and exports it. The output is what matters to you.

<form_is_a_value>
An entity's whole appearance serialises to JSON **under 1 kB**, validated with
zod. An identity is something you can store in a row, diff, version, and hand to
another system.

```jsonc
{
  "v": 1,
  "body":    { "heightCm": 175, "weightKg": 70, "skinTone": "#e8b18c" },
  "face":    { "eyes": {...}, "brows": {...}, "mouth": {...},
               "facialHair": {...}, "facialFeatures": {...} },
  "head":    { "nose": {...}, "ears": {...}, "chin": {...}, "hair": {...} },
  "costume": { "outfit": {...}, "shirt": {...}, "pants": {...}, "shoes": {...},
               "gloves": {...}, "hat": {...}, "glasses": {...}, "earrings": {...},
               "rings": {...}, "wrist": {...}, "prop": {...} }
}
```

Every field falls back to a default when unreadable, so a partial or outdated
blob still renders someone rather than failing.
</form_is_a_value>

<storage>
Table `perzona_avatars`, in the same Supabase project PhysicClaw uses — one
account covers both apps.

| Column | Meaning |
|---|---|
| `user_id` | Owner. RLS restricts every operation to `auth.uid() = user_id`. |
| `name` | Unique per user; the upsert key. |
| `config` | The blob above. |

Writing requires a signed-in session. Anonymous writes are rejected by
row-level security, by design.
</storage>

<export>
perZona exports a rigged GLB on the canonical VEA skeleton — Mixamo-standard
bone names, so clips retarget without a custom map. Height and weight are bone
scales, not baked geometry, which is what lets one mesh serve every body.
</export>
</body>

---

<feedback_loop status="partially-built">
How an entity stays true over time. Two loops run at different speeds.

<loop name="state" cadence="per-task" status="works">
The fast loop, fully available today.

1. A task begins → emit the start transition (`<behavior_triggers>`).
2. Work happens silently.
3. The task ends → emit the outcome transition, then rest.
4. **Verify, do not assume.** If a command returned an error, the entity is now
   showing a stale state. Record that and correct it at the next transition
   rather than retrying immediately.
5. Append the outcome to your own memory — one line, what happened and whether
   it succeeded. This is the input to the slow loop.
</loop>

<loop name="form" cadence="occasional" status="NOT BUILT">
The slow loop, and the intended heart of VEA. Documented so the contract is
agreed before the code exists.

The intent: you have been writing markdown all along — memory, notes, history.
That corpus, not a human's taste, decides what you look like.

Contract, once implemented:
- **Input:** any markdown describing your history, personality or role.
- **Output:** a `config` blob, a rigged `.glb`, and a URL where the entity lives.
- **Stability guarantee:** the same corpus yields the same form. Your appearance
  MUST NOT drift while your history is unchanged.
- **Cadence:** re-derive on a material change in history — a new capability, a
  changed role — NOT on every task. Identity that changes hourly is not identity.
- **Versioning:** each derived form keeps `v` and the blob it came from, so a
  change in appearance can be traced to the change in history that caused it.

Until it ships: a human authors the form in perZona, and you drive its state
through the fast loop.
</loop>

<self_check>
Before ending a session, confirm:
- `setIsThinking` is false.
- The mood matches your real final state (calm on rest, calm+low on failure).
- Nothing you spawned for a task is still in the scene.
</self_check>
</feedback_loop>

---

<limits>
- `setActiveCharacterId` selects only the two built-in characters. No command
  applies a perZona-authored form to a running entity. This is the open seam
  between the two products.
- Uploaded GLB models go through the app's upload panel, not the control API.
- Entities do not meet each other through any agent-facing API yet.
- The mood vocabulary has no failure state. See `<failure_convention>`.
</limits>

<supersedes>
This file replaces two older skills that split this material and disagreed: a
repo-overview skill (features and `npm install` — a contributor doc, not a
capability contract), and a PhysicClaw-only control skill, whose command
reference is preserved above in full. If both are still installed, remove them
so an agent cannot discover the weaker one first.
</supersedes>
