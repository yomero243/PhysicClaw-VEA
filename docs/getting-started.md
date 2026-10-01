# Getting Started

## Prerequisites

- **Node.js 24+** (the CI pipeline runs on Node 24)
- A **Supabase project** (free tier works) — [supabase.com](https://supabase.com)
- Optionally: an OpenAI-compatible LLM gateway for AI chat (an "OpenClaw" gateway, or any endpoint that serves `/v1/chat/completions`)

## 1. Clone and install

```bash
git clone https://github.com/yomero243/PhysicClaw-VEA.git
cd PhysicClaw-VEA
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in the two required variables from your Supabase dashboard (**Settings → API**):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

See [Configuration](configuration.md) for the full list.

## 3. Prepare Supabase

1. **Enable anonymous sign-ins** — the app signs every visitor in anonymously.
   Dashboard → **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
   Without this the app shows `INITIALIZING` forever and a toast reading *"Error al iniciar sesión anónima."*
2. **Apply the migrations** in `supabase/migrations/` (in order). With the Supabase CLI:

    ```bash
    npx supabase link --project-ref <your-project-ref>
    npx supabase db push
    ```

3. *(Optional, for AI chat)* Deploy the `chat` Edge Function and set its secrets — see [Backend](backend.md#chat-edge-function).

## 4. Run

```bash
npm run dev
```

The app is served at `http://localhost:5173`. You should see the 3D scene, the header switch from `INITIALIZING` to your scene name, and the chat panel at the bottom.

## Scripts reference

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build (runs `verify-env` first) |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Full gate: env check, typecheck, tests, lint |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Demo mode

Append `?demo` to the URL (`http://localhost:5173/?demo`) to load the standalone **MoodDemo** view without auth or persistence — useful for testing shaders and moods in isolation.
