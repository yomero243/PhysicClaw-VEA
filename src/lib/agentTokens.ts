import { supabase } from './supabase'

export interface AgentToken {
    id: string
    name: string
    created_at: string
    last_used_at: string | null
    revoked: boolean
}

const TOKEN_PREFIX = 'pcvea_'
const TOKEN_COLUMNS = 'id, name, created_at, last_used_at, revoked'

/** Crypto-random agent token secret. Shown to the user exactly once. */
export function generateTokenSecret(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return TOKEN_PREFIX + hex
}

/** Lowercase SHA-256 hex digest (matches what the control function computes). */
export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const agentTokensApi = {
    /** Create a token; returns the row plus the plaintext secret (show once). */
    async create(userId: string, name: string): Promise<{ token: AgentToken; secret: string }> {
        const secret = generateTokenSecret()
        const token_hash = await sha256Hex(secret)
        const { data, error } = await supabase
            .from('agent_tokens')
            .insert({ user_id: userId, name, token_hash })
            .select(TOKEN_COLUMNS)
            .single()
        if (error || !data) {
            throw new Error(`[Supabase/agentTokensApi.create] ${error?.message ?? 'No data returned'}`)
        }
        return { token: data as unknown as AgentToken, secret }
    },

    async list(userId: string): Promise<AgentToken[]> {
        const { data, error } = await supabase
            .from('agent_tokens')
            .select(TOKEN_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (error) throw new Error(`[Supabase/agentTokensApi.list] ${error.message}`)
        return (data ?? []) as unknown as AgentToken[]
    },

    async revoke(id: string): Promise<void> {
        const { error } = await supabase
            .from('agent_tokens')
            .update({ revoked: true })
            .eq('id', id)
        if (error) throw new Error(`[Supabase/agentTokensApi.revoke] ${error.message}`)
    },
}
