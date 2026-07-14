# Roadmap

## Phase status

| Phase | Goal | Status |
|-------|------|--------|
| **v1.x** | Single-user local app: reactive VEA, AI chat, FBX/GLB support | ✅ Done |
| **v2.0** | Auth + cloud scene persistence (Supabase, RLS) | ✅ Done — anonymous auth; account linking pending |
| **v2.5** | Real-time collaborative scenes (presence, realtime events) | 🟡 In progress — client + schema ready, production migration sync pending |
| **v3.0** | CI/CD, staging/production environments, monitoring | 🟡 In progress — CI + Vercel deploys live; Sentry/monitoring pending |
| **v3.5** | Agent marketplace: per-user system prompts, models, avatars | ⬜ Planned — agent tokens (migration 012) are the first building block |
| **v4.0** | WebGPU renderer + TSL shaders | ⬜ Planned |

## Near-term backlog

- [ ] Sync migrations `005`–`012` to the production project
- [ ] Deploy `chat` + `control` Edge Functions with secrets
- [ ] Account linking: upgrade anonymous sessions to permanent accounts
- [ ] LLM response streaming (Edge Function SSE pass-through)
- [ ] Unify message history sources (DB as single source of truth)
- [ ] Sentry + Vercel Analytics (closes v3.0)
- [ ] Mobile-responsive layout for side panels

## Design explorations

Longer-form ideas live in the repo under `docs/ENHANCEMENT-multiagent-open-world.md` (multi-agent open world concept).
