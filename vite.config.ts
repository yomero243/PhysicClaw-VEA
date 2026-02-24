import { defineConfig, Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

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
                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*')
                    res.setHeader('Access-Control-Allow-Methods', 'POST')
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
                    res.writeHead(204)
                    res.end()
                    return
                }
                if (req.method !== 'POST') return next()

                res.setHeader('Access-Control-Allow-Origin', '*')
                res.setHeader('Content-Type', 'application/json')

                let body = ''
                req.on('data', chunk => { body += chunk })
                req.on('end', () => {
                    try {
                        const command = JSON.parse(body)
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

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), openClawControlPlugin()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            // Proxy OpenClaw API so the browser doesn't need direct access to localhost:18789
            '/v1': {
                target: 'http://127.0.0.1:18789',
                changeOrigin: true,
            },
        },
    },
})
