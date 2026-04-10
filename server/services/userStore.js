import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { DATA_ROOT } from '../utils/root.js'

const USERS_FILE = path.join(DATA_ROOT, 'users.json')

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_ROOT, { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

function strip(user) {
  if (!user) return user
  const { passwordHash, ...rest } = user
  return rest
}

export async function listUsers() {
  const users = await readUsers()
  return users.map(strip)
}

export async function findByUsername(username) {
  const users = await readUsers()
  return users.find(u => u.username === username) || null
}

export async function findById(id) {
  const users = await readUsers()
  return users.find(u => u.id === id) || null
}

export async function verifyPassword(username, plainPassword) {
  const user = await findByUsername(username)
  if (!user) return null
  const ok = await bcrypt.compare(plainPassword, user.passwordHash)
  if (!ok) return null
  return strip(user)
}

export async function createUser({ username, displayName, password, role }) {
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    throw new Error(`Invalid role: ${role}`)
  }
  if (!username || !password || !displayName) {
    throw new Error('username, displayName, and password are required')
  }
  const users = await readUsers()
  if (users.some(u => u.username === username)) {
    throw new Error(`Username already exists: ${username}`)
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: `u_${nanoid(10)}`,
    username,
    displayName,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  await writeUsers(users)
  return strip(user)
}
