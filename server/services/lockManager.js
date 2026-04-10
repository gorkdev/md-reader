import fs from 'fs/promises'
import path from 'path'

export async function createLockManager({ lockFile, staleMs = 2 * 60 * 1000 }) {
  let state = {}

  async function load() {
    try {
      const raw = await fs.readFile(lockFile, 'utf8')
      state = JSON.parse(raw)
    } catch (e) {
      if (e.code === 'ENOENT') state = {}
      else throw e
    }
  }

  async function persist() {
    await fs.mkdir(path.dirname(lockFile), { recursive: true })
    await fs.writeFile(lockFile, JSON.stringify(state, null, 2))
  }

  await load()

  function get(filePath) {
    return state[filePath] || null
  }

  async function acquire(filePath, user) {
    const existing = state[filePath]
    if (existing && existing.userId !== user.id) {
      return { ok: false, holder: existing }
    }
    const now = new Date().toISOString()
    state[filePath] = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      acquiredAt: existing?.acquiredAt || now,
      lastHeartbeat: now,
    }
    await persist()
    return { ok: true, lock: state[filePath] }
  }

  async function release(filePath, user) {
    const existing = state[filePath]
    if (!existing) return false
    if (existing.userId !== user.id) return false
    delete state[filePath]
    await persist()
    return true
  }

  async function forceRelease(filePath) {
    if (!state[filePath]) return false
    delete state[filePath]
    await persist()
    return true
  }

  async function heartbeat(filePath, user) {
    const existing = state[filePath]
    if (!existing || existing.userId !== user.id) return false
    existing.lastHeartbeat = new Date().toISOString()
    await persist()
    return true
  }

  async function sweep() {
    const now = Date.now()
    const released = []
    for (const [filePath, lock] of Object.entries(state)) {
      const age = now - new Date(lock.lastHeartbeat).getTime()
      if (age > staleMs) {
        released.push(filePath)
        delete state[filePath]
      }
    }
    if (released.length > 0) await persist()
    return released
  }

  function all() {
    return { ...state }
  }

  return { acquire, release, forceRelease, heartbeat, sweep, get, all }
}
