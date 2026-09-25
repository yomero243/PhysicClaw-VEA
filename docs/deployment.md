# Deployment & Operations

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| **CI** (`ci.yml`) | push / PR to `main`, `develop` | `verify-env`, typecheck, tests, lint, production build |
| **Deploy to Vercel** (`deploy.yml`) | manual only (`workflow_dispatch`) | Kept as a fallback; normal deploys go through Vercel's Git integration |
| **Claude Code** (`claude.yml`) | `@claude` mention in issues/PRs | AI assistant on demand |
| **Claude Code Review** (`claude-code-review.yml`) | every PR | Automated AI code review — requires the `CLAUDE_CODE_OAUTH_TOKEN` repo secret |
| **Dependabot** | scheduled | Dependency update PRs |

`main` is protected by a ruleset: PRs required, 1 approving review, linear history (squash/rebase merges).

## Hosting

- **Frontend:** Vercel, connected to the GitHub repo. Push to `main` → production deploy at [physicclaw.vercel.app](https://physicclaw.vercel.app); PRs get preview URLs. Static asset caching is configured in `vercel.json`.
- **Backend:** Supabase project (`PhysicClaw`) — Postgres, Auth, Realtime, Storage, Edge Functions.
- **Docs:** this site builds on [Read the Docs](https://readthedocs.org) from `mkdocs.yml` + `.readthedocs.yaml` on every push.

## Supabase production checklist

The repo's migrations are ahead of the production database. To bring production fully up to date:

1. **Sync migrations** (review `009` vs `010` policy ordering first — `010`'s header documents the hazard):

    ```bash
    npx supabase link --project-ref <project-ref>
    npx supabase db push
    ```

2. **Deploy Edge Functions:**

    ```bash
    npx supabase functions deploy chat
    npx supabase functions deploy control
    ```

3. **Set function secrets:**

    ```bash
    npx supabase secrets set \
      OPENCLAW_SECRET_TOKEN=<gateway-token> \
      OPENCLAW_API_URL=<gateway-url> \
      CHAT_ALLOWED_ORIGINS=https://physicclaw.vercel.app
    ```

4. **Dashboard settings** (one-time):
    - Authentication → enable **anonymous sign-ins**
    - Authentication → enable **leaked password protection**
    - Verify the `models` storage bucket is private after migration `007`

5. **Re-run the advisors** (Dashboard → Advisors) — security and performance should both be clean.

## Releases

Releases are tagged on `main` (`vX.Y.Z`) with the version bumped in `package.json`, and published as GitHub Releases with highlights + known gaps. First release: [v0.2.0](https://github.com/yomero243/PhysicClaw-VEA/releases/tag/v0.2.0).

## Monitoring

Planned for the v3.0 phase (see [Roadmap](roadmap.md)): Sentry for client runtime errors and Vercel Analytics. Until then:

- **Client errors** → surfaced to users via the toast system; details in the browser console
- **Edge Function logs** → Supabase Dashboard → Edge Functions → Logs
- **Database health** → Supabase Advisors + `get_logs`
