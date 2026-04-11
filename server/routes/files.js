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
import { annotate, stripAnnotations, lineArrayDiff } from '../services/diffAnnotator.js'
import { readBlame, writeBlame, initBlame, alignBlame, updateBlameFromDiff } from '../services/blameStore.js'
import { readHistory, appendHistory, buildDiffDetails } from '../services/historyStore.js'
import { getUserHue } from '../utils/userColor.js'
import { parseFrontmatter, serialize } from '../utils/frontmatter.js'
import { decodeId } from '../utils/paths.js'
import { broadcast } from '../realtime.js'

// Backfill hue for entries that lack it, and fill null entries with a fallback
function normalizeBlame(lines, fallback) {
  return lines.map(entry => {
    if (!entry) return fallback
    if (entry.hue == null) {
      entry.hue = getUserHue(entry.username || entry.user || '')
    }
    return entry
  })
}

const router = Router()

// sendBeacon can't set Authorization headers — promote body.token so requireAuth works.
function beaconAuth(req, res, next) {
  if (!req.headers.authorization && req.body?.token) {
    req.headers.authorization = `Bearer ${req.body.token}`
  }
  next()
}

// This route must be registered BEFORE the global requireAuth,
// because sendBeacon can't set headers and needs beaconAuth first.
router.post('/:id/lock/release', beaconAuth, requireAuth, requireRole('editor'), releaseLock)

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
    const blame = await readBlame(file.path)
    // Ensure blame array matches content line count and has hue data.
    // Fill null entries with a fallback based on file metadata.
    const contentLineCount = file.bodyClean.split('\n').length
    const fallback = {
      user: file.frontmatter?.author || 'Unknown',
      userId: null,
      username: null,
      hue: getUserHue(file.frontmatter?.author || ''),
      date: file.frontmatter?.date ? new Date(file.frontmatter.date).toISOString() : file.date || null,
    }
    const aligned = normalizeBlame(alignBlame(blame.lines, contentLineCount), fallback)
    const history = await readHistory(file.path)
    res.json({ file, lock: locks.get(file.path), blame: aligned, history: history.entries })
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

router.delete('/:id/lock', requireRole('editor'), releaseLock)

async function releaseLock(req, res, next) {
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
}

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
    const now = new Date()
    const current = await readFile(req.params.id)
    const oldParsed = parseFrontmatter(current.content)
    const oldClean = stripAnnotations(oldParsed.body)

    // Compute line-level diff for both annotation and blame
    const oldLines = oldClean.split('\n')
    const newLines = stripAnnotations(newCleanBody).split('\n')
    const ops = lineArrayDiff(oldLines, newLines)

    // Build detailed diff for history
    const diff = buildDiffDetails(ops)

    // Update blame data
    const oldBlame = await readBlame(filePath)
    const newBlameLines = updateBlameFromDiff(oldBlame.lines, ops, req.user, now)
    await writeBlame(filePath, { lines: newBlameLines })

    // Append history entry with diff details
    const updatedHistory = await appendHistory(filePath, { user: req.user, date: now, diff })

    // Re-inject annotations (history preserved, new edits attributed)
    const annotatedBody = annotate(oldParsed.body, newCleanBody, req.user, now)
    const finalRaw = serialize(oldParsed.frontmatterLines, annotatedBody)
    await writeFileContent(req.params.id, finalRaw)
    await locks.heartbeat(filePath, req.user)
    broadcast('file:updated', {
      id: req.params.id,
      path: filePath,
      updatedBy: { id: req.user.id, displayName: req.user.displayName },
      updatedAt: now.toISOString(),
    })
    const updated = await readFile(req.params.id)
    updated.bodyClean = stripAnnotations(updated.body)
    const updatedBlame = await readBlame(filePath)
    res.json({ file: updated, blame: updatedBlame.lines, history: updatedHistory.entries })
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
    // Initialize blame for every content line, attributed to the creator
    const created = await readFile(id)
    const cleanBody = stripAnnotations(created.body)
    const lineCount = cleanBody.split('\n').length
    const blameLines = initBlame(lineCount, req.user, new Date())
    await writeBlame(relative, { lines: blameLines })
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
