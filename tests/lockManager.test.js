import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createLockManager } from '../server/services/lockManager.js'

let tmpDir
let lockFile
let manager

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lock-test-'))
  lockFile = path.join(tmpDir, 'locks.json')
  manager = await createLockManager({ lockFile, staleMs: 2000 })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
  vi.useRealTimers()
})

const alice = { id: 'u1', username: 'alice', displayName: 'Alice' }
const bob = { id: 'u2', username: 'bob', displayName: 'Bob' }

describe('lockManager', () => {
  it('acquires a lock for a file', async () => {
    const result = await manager.acquire('content/a.md', alice)
    expect(result.ok).toBe(true)
    expect(result.lock.userId).toBe('u1')
  })

  it('rejects lock when already held by another user', async () => {
    await manager.acquire('content/a.md', alice)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(false)
    expect(result.holder.userId).toBe('u1')
  })

  it('allows same user to re-acquire (refresh)', async () => {
    await manager.acquire('content/a.md', alice)
    const result = await manager.acquire('content/a.md', alice)
    expect(result.ok).toBe(true)
  })

  it('releases a lock', async () => {
    await manager.acquire('content/a.md', alice)
    await manager.release('content/a.md', alice)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(true)
  })

  it('does not release a lock held by someone else', async () => {
    await manager.acquire('content/a.md', alice)
    await manager.release('content/a.md', bob)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(false)
  })

  it('updates heartbeat', async () => {
    await manager.acquire('content/a.md', alice)
    const before = manager.get('content/a.md').lastHeartbeat
    await new Promise(r => setTimeout(r, 10))
    const ok = await manager.heartbeat('content/a.md', alice)
    expect(ok).toBe(true)
    expect(manager.get('content/a.md').lastHeartbeat).not.toBe(before)
  })

  it('sweeps stale locks', async () => {
    await manager.acquire('content/a.md', alice)
    const lock = manager.get('content/a.md')
    lock.lastHeartbeat = new Date(Date.now() - 10_000).toISOString()
    const released = await manager.sweep()
    expect(released).toContain('content/a.md')
    expect(manager.get('content/a.md')).toBeNull()
  })

  it('persists to disk and reloads', async () => {
    await manager.acquire('content/a.md', alice)
    const manager2 = await createLockManager({ lockFile, staleMs: 2000 })
    expect(manager2.get('content/a.md').userId).toBe('u1')
  })
})
