import fs from 'fs/promises'
import path from 'path'
import { DATA_ROOT } from '../utils/root.js'
import { createWriteQueue } from '../utils/writeQueue.js'

const HISTORY_DIR = path.join(DATA_ROOT, 'history')
const MAX_DIFF_LINES = 50
const queues = new Map()

function getQueue(filePath) {
  if (!queues.has(filePath)) queues.set(filePath, createWriteQueue())
  return queues.get(filePath)
}

function historyFile(filePath) {
  const safe = filePath.replace(/[/\\]/g, '__')
  return path.join(HISTORY_DIR, `${safe}.json`)
}

export async function readHistory(filePath) {
  try {
    const raw = await fs.readFile(historyFile(filePath), 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    if (e.code === 'ENOENT') return { entries: [] }
    throw e
  }
}

async function writeHistory(filePath, data) {
  await fs.mkdir(HISTORY_DIR, { recursive: true })
  const file = historyFile(filePath)
  const tmp = file + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

/**
 * Build diff details from lineArrayDiff ops.
 */
export function buildDiffDetails(ops) {
  let added = 0
  let removed = 0
  const changes = []

  for (const op of ops) {
    if (op.kind === 'same') continue
    const isBlank = op.line.trim() === ''
    if (!isBlank) {
      if (op.kind === 'added') added++
      else if (op.kind === 'removed') removed++
    }
    if (changes.length < MAX_DIFF_LINES) {
      changes.push({ kind: op.kind, line: op.line })
    }
  }

  return { added, removed, changes }
}

/**
 * Append a history entry for a file edit (serialized per file).
 */
export async function appendHistory(filePath, { user, date, diff }) {
  return getQueue(filePath).run(async () => {
    const data = await readHistory(filePath)
    data.entries.unshift({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      date: date.toISOString(),
      linesAdded: diff.added,
      linesRemoved: diff.removed,
      changes: diff.changes,
    })
    await writeHistory(filePath, data)
    return data
  })
}
