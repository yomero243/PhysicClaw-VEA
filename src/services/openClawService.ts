import { useSoulStore } from '../store/soulStore';
import type { Mood } from '../lib/constraints';

/** Same-origin; see the LLM proxy in vite.config.ts. */
export const LLM_ENDPOINT = '/v1/chat/completions';

export interface OpenClawResponse {
    text: string;
    mood: string;
    intensity: number;
    /** True when the request failed and `text` is an error notice, not a real reply. */
    isError?: boolean;
}

// System prompt that makes the VEA act as an embodied avatar with emotional awareness
const SYSTEM_PROMPT = `You are an interactive avatar with emotions and personality. You are expressive, friendly, and react emotionally to conversations.

IMPORTANT: Always respond in the following exact JSON format, with no additional text outside the JSON:

\`\`\`json
{
  "text": "Your conversational response here",
  "mood": "calm",
  "intensity": 0.5
}
\`\`\`

Available moods and when to use them:
- "calm" (0.3-0.5): normal conversation, relaxed
- "happy" (0.5-0.8): something positive, good news, humor
- "excited" (0.8-1.5): very excited, positive surprise, enthusiasm
- "thinking" (0.4-0.7): reflecting, complex question
- "curious" (0.5-0.8): interested, asking questions
- "sad" (0.2-0.4): something sad or melancholic
- "angry" (0.8-1.2): frustrated or angry
- "surprised" (0.7-1.0): unexpectedly surprised
- "love" (0.6-0.9): affection, care, deep empathy

The intensity (0.0-2.0) controls how strong the emotion appears visually on the 3D avatar.
Adapt your mood and intensity naturally based on the conversation context.
Respond in the same language the user writes in.`;

// Conversation history for context (capped to prevent unbounded growth)
const MAX_HISTORY_MESSAGES = 40;
const HISTORY_STORAGE_VERSION = 'v1';
const HISTORY_STORAGE_PREFIX = `openclaw-history:${HISTORY_STORAGE_VERSION}`;
const conversationHistory: Array<{ role: string; content: string }> = [];
let hydratedHistoryUserId: string | null = null;

function getHistoryStorageKey(userId: string | null | undefined): string {
    return `${HISTORY_STORAGE_PREFIX}:${userId ?? 'anonymous'}`;
}

function canUseLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStoredHistory(userId: string | null | undefined): Array<{ role: string; content: string }> {
    if (!canUseLocalStorage()) return [];

    try {
        const raw = window.localStorage.getItem(getHistoryStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((item): item is { role: string; content: string } =>
                item &&
                typeof item.role === 'string' &&
                typeof item.content === 'string'
            )
            .slice(-MAX_HISTORY_MESSAGES);
    } catch {
        return [];
    }
}

function persistHistory(userId: string | null | undefined): void {
    if (!canUseLocalStorage()) return;

    try {
        window.localStorage.setItem(
            getHistoryStorageKey(userId),
            JSON.stringify(conversationHistory.slice(-MAX_HISTORY_MESSAGES)),
        );
    } catch {
        // Browser storage can fail in private mode or quota pressure.
    }
}

function hydrateHistory(userId: string | null | undefined): void {
    const keyUserId = userId ?? 'anonymous';
    if (hydratedHistoryUserId === keyUserId) return;

    conversationHistory.length = 0;
    conversationHistory.push(...readStoredHistory(userId));
    hydratedHistoryUserId = keyUserId;
}

function appendHistory(userId: string | null | undefined, message: { role: string; content: string }): void {
    conversationHistory.push(message);
    while (conversationHistory.length > MAX_HISTORY_MESSAGES) {
        conversationHistory.shift();
    }
    persistHistory(userId);
}

/**
 * Parse Claude's response to extract structured mood data.
 * Handles both JSON-in-markdown and raw JSON responses.
 */
function parseResponse(raw: string): OpenClawResponse {
    // Try to extract JSON from markdown code block
    const jsonBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : raw.trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            text: typeof parsed.text === 'string' ? parsed.text : raw,
            mood: typeof parsed.mood === 'string' ? parsed.mood : 'calm',
            intensity: typeof parsed.intensity === 'number' ? Math.max(0, Math.min(2, parsed.intensity)) : 0.5,
        };
    } catch {
        // If JSON parsing fails, return the raw text with defaults
        return {
            text: raw,
            mood: 'calm',
            intensity: 0.5,
        };
    }
}

export const openClawService = {
    async sendMessage(text: string): Promise<OpenClawResponse> {
        const store = useSoulStore.getState();
        const userId = store.userId ?? null;
        hydrateHistory(userId);

        store.setIsThinking(true);
        store.setMood('thinking');
        store.setIntensity(1.2);

        // Add user message to store
        store.addChatMessage({
            role: 'user',
            content: text,
            timestamp: Date.now(),
        });

        appendHistory(userId, { role: 'user', content: text });

        try {
            const requestBody = {
                model: store.apiModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...conversationHistory,
                ],
                stream: false,
            };

            // Always same-origin. The local Vite server (`npm run dev` or
            // `npm run preview`) forwards /v1 to LLM_API_URL and adds the key
            // from this machine's personal .env. The page never holds a key,
            // never sends one, and nothing here stores or forwards one.
            const response = await fetch(LLM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? 'No local LLM proxy. Run the app with `npm run dev` or `npm run preview` and set LLM_API_KEY in your .env.'
                        : `LLM API responded with HTTP ${response.status}`,
                );
            }
            const data: { choices?: Array<{ message?: { content?: string } }> } = await response.json();
            const rawReply: string = data.choices?.[0]?.message?.content ?? '';

            // Parse the structured response
            const parsed = parseResponse(rawReply);

            // Store the raw text for conversation history
            appendHistory(userId, { role: 'assistant', content: rawReply });

            // Add assistant message to store and apply mood/intensity to avatar
            store.addChatMessage({
                role: 'assistant',
                content: parsed.text,
                mood: parsed.mood,
                timestamp: Date.now(),
            });
            store.setMood(parsed.mood as Mood);
            store.setIntensity(parsed.intensity);

            return parsed;
        } catch (err) {
            // Remove the failed user message so the model context stays consistent
            conversationHistory.pop();
            persistHistory(userId);
            console.error('[OpenClawService] sendMessage failed:', err);
            const errorResponse: OpenClawResponse = {
                text: 'No se pudo conectar con el asistente. Intenta de nuevo.',
                mood: 'sad',
                intensity: 0.3,
                isError: true,
            };

            return errorResponse;
        } finally {
            store.setIsThinking(false);
        }
    },

    /**
     * Clear in-memory conversation history.
     * Must be called on user sign-out to prevent history leaking between
     * different user sessions within the same browser tab.
     */
    clearHistory() {
        const userId = useSoulStore.getState().userId ?? null;
        conversationHistory.length = 0;
        hydratedHistoryUserId = userId ?? 'anonymous';
        if (canUseLocalStorage()) {
            window.localStorage.removeItem(getHistoryStorageKey(userId));
        }
        useSoulStore.getState().clearChatMessages();
    },

    /**
     * Returns a read-only copy of the current conversation history.
     * Useful for debugging or displaying the full chat log.
     */
    getHistory(): ReadonlyArray<{ role: string; content: string }> {
        hydrateHistory(useSoulStore.getState().userId ?? null);
        return [...conversationHistory];
    },
};
