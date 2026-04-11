import fs from 'fs/promises'
import path from 'path'
import { DATA_ROOT } from '../utils/root.js'
import { getUserHue } from '../utils/userColor.js'

const BLAME_DIR = path.join(DATA_ROOT, 'blame')

// Convert file path to a safe filename for blame storage
function blameFile(filePath) {
  const safe = filePath.replace(/[/\\]/g, '__')
  return path.join(BLAME_DIR, `${safe}.json`)
}

export async function readBlame(filePath) {
  try {
    const raw = await fs.readFile(blameFile(filePath), 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    if (e.code === 'ENOENT') return { lines: [] }
    throw e
  }
}

export async function writeBlame(filePath, blame) {
  await fs.mkdir(BLAME_DIR, { recursive: true })
  await fs.writeFile(blameFile(filePath), JSON.stringify(blame, null, 2), 'utf8')
}

/**
 * Create initial blame data for a newly created file.
 * Every content line is attributed to the creator.
 */
export function initBlame(contentLineCount, user, date) {
  const hue = getUserHue(user.username || user.displayName)
  const entry = {
    user: user.displayName,
    userId: user.id,
    username: user.username,
    hue,
    date: date.toISOString(),
  }
  return Array.from({ length: contentLineCount }, () => ({ ...entry }))
}

/**
 * Ensure blame array length matches content line count.
 * Pads with null if too short, trims if too long.
 */
export function alignBlame(blameLines, contentLineCount) {
  if (blameLines.length === contentLineCount) return blameLines
  if (blameLines.length < contentLineCount) {
    return [...blameLines, ...Array(contentLineCount - blameLines.length).fill(null)]
  }
  return blameLines.slice(0, contentLineCount)
}

/**
 * Update blame data after a file edit.
 *
 * - Unchanged lines keep their existing blame entry
 * - Added/changed lines get the new user's blame entry with computed hue
 * - Removed lines are dropped
 */
export function updateBlameFromDiff(oldBlameLines, ops, user, date) {
  const hue = getUserHue(user.username || user.displayName)
  const newBlame = []

  for (const op of ops) {
    if (op.kind === 'removed') continue
    if (op.kind === 'same') {
      const existing = (op.oldIdx < oldBlameLines.length ? oldBlameLines[op.oldIdx] : null) || null
      // Backfill hue for legacy entries that lack it
      if (existing && existing.hue == null) {
        existing.hue = getUserHue(existing.username || existing.user || '')
      }
      newBlame.push(existing)
    }
    if (op.kind === 'added') {
      newBlame.push({
        user: user.displayName,
        userId: user.id,
        username: user.username,
        hue,
        date: date.toISOString(),
      })
    }
  }

  return newBlame
}
