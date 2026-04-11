import fs from 'fs/promises'
import path from 'path'
import { createWriteQueue } from '../utils/writeQueue.js'

export async function createLockManager({ lockFile, staleMs = 2 * 60 * 1000 }) {
  let state = {}
  const queue = createWriteQueue()

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
    // Atomic write: write to temp file then rename
    const tmp = lockFile + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(state, null, 2))
    await fs.rename(tmp, lockFile)
  }

  await load()

  function get(filePath) {
    return state[filePath] || null
  }

  async function acquire(filePath, user) {
    return queue.run(async () => {
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
    })
  }

  async function release(filePath, user) {
    return queue.run(async () => {
      const existing = state[filePath]
      if (!existing) return false
      if (existing.userId !== user.id) return false
      delete state[filePath]
      await persist()
      return true
    })
  }

  async function forceRelease(filePath) {
    return queue.run(async () => {
      if (!state[filePath]) return false
      delete state[filePath]
      await persist()
      return true
    })
  }

  async function heartbeat(filePath, user) {
    return queue.run(async () => {
      const existing = state[filePath]
      if (!existing || existing.userId !== user.id) return false
      existing.lastHeartbeat = new Date().toISOString()
      await persist()
      return true
    })
  }

  async function sweep() {
    return queue.run(async () => {
      const now = Date.now()
      const released = []
      for (const [fp, lock] of Object.entries(state)) {
        const age = now - new Date(lock.lastHeartbeat).getTime()
        if (age > staleMs) {
          released.push(fp)
          delete state[fp]
        }
      }
      if (released.length > 0) await persist()
      return released
    })
  }

  function all() {
    return { ...state }
  }

  return { acquire, release, forceRelease, heartbeat, sweep, get, all }
}
