import { describe, expect, it } from 'vitest'
import { AUTH_MESSAGES, describeAuthError } from '../authErrors'

const named = (name: string, message: string) => Object.assign(new Error(message), { name })

describe('describeAuthError', () => {
    it('says the deployment is not configured, whatever the error', () => {
        expect(describeAuthError(new Error('Load failed'), false)).toBe(AUTH_MESSAGES.notConfigured)
    })

    it.each(['Load failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.'])(
        'turns the browser network error "%s" into a readable message',
        (message) => {
            expect(describeAuthError(new Error(message), true)).toBe(AUTH_MESSAGES.unreachable)
        },
    )

    it('treats a retryable fetch error from supabase-js as unreachable', () => {
        expect(describeAuthError(named('AuthRetryableFetchError', '{}'), true)).toBe(AUTH_MESSAGES.unreachable)
    })

    it('keeps the server message for real auth errors', () => {
        expect(describeAuthError(named('AuthApiError', 'Invalid login credentials'), true)).toBe(
            'Invalid login credentials',
        )
    })
})
