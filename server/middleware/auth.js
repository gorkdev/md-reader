import jwt from 'jsonwebtoken'
import { findById } from '../services/userStore.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  findById(payload.sub)
    .then(user => {
      if (!user) return res.status(401).json({ error: 'User not found' })
      const { passwordHash, ...safe } = user
      req.user = safe
      next()
    })
    .catch(next)
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}
