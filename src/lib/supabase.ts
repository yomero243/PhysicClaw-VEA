import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Guard: fail loudly in dev, fail gracefully in production so the UI still renders.
if (!supabaseUrl || !supabaseAnonKey) {
    const msg =
        '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env\n' +
        'Copy .env.example to .env and fill in your Supabase project credentials.\n' +
        'Authentication will NOT work until these variables are configured.'
    if (import.meta.env.DEV) {
        // In dev mode, throw immediately so the developer sees a clear error.
        throw new Error(msg)
    } else {
        console.error(msg)
    }
}

// Falls back to localhost so createClient does not throw on undefined – the
// Supabase SDK will return auth errors when the user tries to sign in.
export const supabase = createClient(
    supabaseUrl ?? 'http://localhost:54321',
    supabaseAnonKey ?? 'anon-key-not-configured',
)
