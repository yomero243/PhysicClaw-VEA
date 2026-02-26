import { defineConfig, Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Origins allowed to POST to /api/control. Extend as needed.
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

// Secret token for /api/control. Set CONTROL_API_TOKEN in your shell before
// starting the dev server. Falls back to a random token so the endpoint is
// never accidentally open with an empty secret.
const CONTROL_API_TOKEN =
    process.env.CONTROL_API_TOKEN ??
    (() => {
        const random = Math.random().toString(36).slice(2)
        console.warn('[openclaw-control] CONTROL_API_TOKEN not set. Using auto-generated token for this session.')
        return random
    })()

// Allowed commands and their value validators
const COMMAND_VALIDATORS: Record<string, (v: unknown) => boolean> = {
    setMood: v => typeof v === 'string' && ['calm', 'excited', 'thinking', 'listening'].includes(v),
    setIsThinking: v => typeof v === 'boolean',
    setIntensity: v => typeof v === 'number' && v >= 0 && v <= 2,
    setLastMessage: v => typeof v === 'string' && v.length <= 500,
    setActiveCharacterId: v => typeof v === 'string' && v.length > 0 && v.length <= 64,
}

// Simple in-memory rate limiter: max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
        return false
    }
    entry.count++
    return entry.count > RATE_LIMIT
}

function openClawControlPlugin(): Plugin {
    let lastProcessedId: string | null = null

    function broadcast(server: ViteDevServer, command: Record<string, unknown>) {
        const id = String(command.id ?? '')
        if (id && id === lastProcessedId) return
        lastProcessedId = id
        server.ws.send({ type: 'custom', event: 'openclaw-command', data: command })
    }

    return {
        name: 'openclaw-control',
        configureServer(server) {
            const controlFile = path.resolve(process.cwd(), 'openclaw-control.json')

            // Watch the directory so it works even before the file is created
            const watcher = fs.watch(path.dirname(controlFile), (_event, filename) => {
                if (filename !== 'openclaw-control.json') return
                try {
                    const raw = fs.readFileSync(controlFile, 'utf-8')
                    broadcast(server, JSON.parse(raw))
                } catch {
                    // file not ready yet or invalid JSON
                }
            })
            server.httpServer?.on('close', () => watcher.close())

            // HTTP endpoint so OpenClaw can POST commands directly
            server.middlewares.use('/api/control', (req, res, next) => {
                const origin = req.headers.origin ?? ''
                const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
                    res.setHeader('Vary', 'Origin')
                    res.setHeader('Access-Control-Allow-Methods', 'POST')
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                    res.writeHead(204)
                    res.end()
                    return
                }

                if (req.method !== 'POST') return next()

                // Rate limiting
                const clientIp = req.socket.remoteAddress ?? 'unknown'
                if (isRateLimited(clientIp)) {
                    res.writeHead(429)
                    res.end(JSON.stringify({ error: 'Too many requests' }))
                    return
                }

                // Token authentication
                const authHeader = req.headers.authorization ?? ''
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
                if (token !== CONTROL_API_TOKEN) {
                    res.writeHead(401)
                    res.end(JSON.stringify({ error: 'Unauthorized' }))
                    return
                }

                res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
                res.setHeader('Vary', 'Origin')
                res.setHeader('Content-Type', 'application/json')

                let body = ''
                req.on('data', (chunk: Buffer) => {
                    body += chunk
                    if (body.length > 4096) {
                        res.writeHead(413)
                        res.end(JSON.stringify({ error: 'Payload too large' }))
                        req.destroy()
                    }
                })
                req.on('end', () => {
                    try {
                        const command = JSON.parse(body) as Record<string, unknown>

                        // Validate command
                        const { command: cmd, value, id } = command
                        if (typeof cmd !== 'string' || !(cmd in COMMAND_VALIDATORS)) {
                            res.writeHead(400)
                            res.end(JSON.stringify({ error: 'Invalid command' }))
                            return
                        }
                        if (!COMMAND_VALIDATORS[cmd](value)) {
                            res.writeHead(400)
                            res.end(JSON.stringify({ error: 'Invalid value for command' }))
                            return
                        }
                        if (id !== undefined && typeof id !== 'string') {
                            res.writeHead(400)
                            res.end(JSON.stringify({ error: 'id must be a string' }))
                            return
                        }

                        broadcast(server, command)
                        res.writeHead(200)
                        res.end(JSON.stringify({ ok: true }))
                    } catch {
                        res.writeHead(400)
                        res.end(JSON.stringify({ error: 'Invalid JSON' }))
                    }
                })
            })
        },
    }
}

// Allowed proxy paths to prevent SSRF
const ALLOWED_PROXY_PATHS = ['/v1/chat/completions', '/v1/models']

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), openClawControlPlugin()],
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            '/v1': {
                target: 'http://127.0.0.1:18789',
                changeOrigin: true,
                bypass(req) {
                    if (!ALLOWED_PROXY_PATHS.some(p => req.url?.startsWith(p))) {
                        return false
                    }
                    return undefined
                },
            },
        },
    },
})
