import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { findById } from './services/userStore.js'

let io = null
const onlineUsers = new Map() // socketId → { id, displayName, role }

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Missing token'))
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await findById(payload.sub)
      if (!user) return next(new Error('User not found'))
      const { passwordHash, ...safe } = user
      socket.data.user = safe
      next()
    } catch (e) {
      next(new Error('Auth failed'))
    }
  })

  io.on('connection', socket => {
    const user = socket.data.user
    onlineUsers.set(socket.id, {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
    })
    emitPresence()

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id)
      emitPresence()
    })
  })

  return io
}

function emitPresence() {
  if (!io) return
  const unique = new Map()
  for (const u of onlineUsers.values()) {
    unique.set(u.id, u)
  }
  io.emit('presence:update', Array.from(unique.values()))
}

export function broadcast(event, payload) {
  if (io) io.emit(event, payload)
}
