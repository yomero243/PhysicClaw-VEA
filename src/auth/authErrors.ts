// ============================================================
// PhysicClaw-VEA — user-facing auth errors
// When a request never gets an answer, browsers throw engine-specific text:
// Safari "Load failed", Chrome "Failed to fetch", Firefox "NetworkError when
// attempting to fetch resource." supabase-js passes it through unchanged,
// and on its own it tells the user nothing.
// ============================================================

const NETWORK_ERROR_RE = /load failed|failed to fetch|networkerror|network request failed/i

export const AUTH_MESSAGES = {
    notConfigured:
        'This deployment has no Supabase project configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting provider, then redeploy.',
    unreachable: "Can't reach the login server. Check your connection and try again.",
} as const

export function describeAuthError(error: Error, supabaseConfigured: boolean): string {
    if (!supabaseConfigured) return AUTH_MESSAGES.notConfigured
    // supabase-js raises AuthRetryableFetchError when fetch throws and on 502–504.
    if (error.name === 'AuthRetryableFetchError' || NETWORK_ERROR_RE.test(error.message)) {
        return AUTH_MESSAGES.unreachable
    }
    return error.message
}
