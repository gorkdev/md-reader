import { Router } from 'express'
import { verifyPassword } from '../services/userStore.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  const user = await verifyPassword(username, password)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user)
  res.json({ token, user })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
