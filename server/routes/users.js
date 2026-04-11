import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { listUsers, createUser } from '../services/userStore.js'

const router = Router()

router.use(requireAuth)

// List all users (admin only)
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await listUsers()
    res.json({ users })
  } catch (e) {
    next(e)
  }
})

// Create a new user (admin only)
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { username, displayName, password, role, color } = req.body || {}
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'username, displayName, and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' })
    }
    const user = await createUser({ username, displayName, password, role: role || 'editor', color })
    res.status(201).json({ user })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
