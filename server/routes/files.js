import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import {
  listFiles,
  readFile,
  writeFileContent,
  createFile,
  deleteFile,
} from '../services/fileStore.js'
import { locks } from '../services/locks.js'
import { annotate, stripAnnotations } from '../services/diffAnnotator.js'
import { parseFrontmatter, serialize } from '../utils/frontmatter.js'
import { decodeId } from '../utils/paths.js'
import { broadcast } from '../realtime.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const files = await listFiles()
    const withLocks = files.map(f => ({ ...f, lock: locks.get(f.path) }))
    res.json({ files: withLocks })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const file = await readFile(req.params.id)
    // bodyClean is what the WYSIWYG editor receives — no annotation comments.
    file.bodyClean = stripAnnotations(file.body)
    res.json({ file, lock: locks.get(file.path) })
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    next(e)
  }
})

router.post('/:id/lock', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const result = await locks.acquire(filePath, req.user)
    if (!result.ok) {
      return res.status(409).json({ error: 'Locked', holder: result.holder })
    }
    broadcast('lock:acquired', {
      id: req.params.id,
      path: filePath,
      holder: result.lock,
    })
    res.json({ lock: result.lock })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/lock/heartbeat', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const ok = await locks.heartbeat(filePath, req.user)
    if (!ok) return res.status(409).json({ error: 'Lock lost' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/lock', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const released = await locks.release(filePath, req.user)
    if (released) {
      broadcast('lock:released', { id: req.params.id, path: filePath })
    }
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const lock = locks.get(filePath)
    if (!lock || lock.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not hold the lock for this file' })
    }
    // The WYSIWYG editor sends a clean body (no annotations).
    // The frontmatter is preserved server-side from the existing file.
    const { body: newCleanBody } = req.body || {}
    if (typeof newCleanBody !== 'string') {
      return res.status(400).json({ error: 'body (string) required' })
    }
    const current = await readFile(req.params.id)
    const oldParsed = parseFrontmatter(current.content)
    // Diff the old body (which still has annotations) against the new clean body,
    // re-injecting annotations as needed (history preserved, new edits attributed).
    const annotatedBody = annotate(oldParsed.body, newCleanBody, req.user, new Date())
    const finalRaw = serialize(oldParsed.frontmatterLines, annotatedBody)
    await writeFileContent(req.params.id, finalRaw)
    await locks.heartbeat(filePath, req.user)
    broadcast('file:updated', {
      id: req.params.id,
      path: filePath,
      updatedBy: { id: req.user.id, displayName: req.user.displayName },
      updatedAt: new Date().toISOString(),
    })
    const updated = await readFile(req.params.id)
    updated.bodyClean = stripAnnotations(updated.body)
    res.json({ file: updated })
  } catch (e) {
    next(e)
  }
})

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const { category, fileName, title, content } = req.body || {}
    if (!category || !fileName) {
      return res.status(400).json({ error: 'category and fileName required' })
    }
    const { id, path: relative } = await createFile({ category, fileName, title, content })
    broadcast('file:created', { id, path: relative })
    res.status(201).json({ id, path: relative })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const lock = locks.get(filePath)
    if (lock && lock.userId !== req.user.id) {
      return res.status(409).json({ error: 'File is locked by another user', holder: lock })
    }
    await deleteFile(req.params.id)
    await locks.forceRelease(filePath)
    broadcast('file:deleted', { id: req.params.id, path: filePath })
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    next(e)
  }
})

export default router
