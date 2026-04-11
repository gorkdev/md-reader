import express from 'express'
import http from 'http'
import path from 'path'
import cors from 'cors'
import dotenv from 'dotenv'
import { DIST_DIR } from './utils/root.js'
import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'
import usersRoutes from './routes/users.js'
import { locks } from './services/locks.js'
import { initRealtime, broadcast } from './realtime.js'

dotenv.config()

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[server] JWT_SECRET is missing or too short (min 32 chars). Set it in .env')
  process.exit(1)
}

const IS_DEV = process.env.NODE_ENV !== 'production'

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/users', usersRoutes)

// Stale lock sweep — every 30s, drop locks with no heartbeat for 2 minutes
setInterval(async () => {
  try {
    const released = await locks.sweep()
    for (const filePath of released) {
      broadcast('lock:released', { path: filePath })
    }
  } catch (e) {
    console.error('[lock-sweep]', e)
  }
}, 30_000)

initRealtime(server)

// Static serving (production only — in dev Vite serves the SPA)
if (!IS_DEV) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 3001
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})

export { app, server }
