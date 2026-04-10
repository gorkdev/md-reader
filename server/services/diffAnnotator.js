import { diffArrays } from 'diff'

const COMMENT_RE = /^<!--\s*düzenleyen:\s*(.+?)\s+—\s+(.+?)\s*-->$/

function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function makeComment(displayName, date) {
  return `<!-- düzenleyen: ${displayName} — ${formatDate(date)} -->`
}

// Remove all annotation comment lines from a text body, leaving content only.
export function stripAnnotations(text) {
  if (!text) return text
  return text.split('\n').filter(line => !COMMENT_RE.test(line)).join('\n')
}

// Walk a raw text and split into:
//  - contentLines: only the content lines (annotations removed)
//  - annotationMap: contentLineIndex → array of annotation lines that preceded it
function parseWithAnnotations(rawText) {
  const lines = rawText.split('\n')
  const contentLines = []
  const annotationMap = new Map()
  let pending = []
  for (const line of lines) {
    if (COMMENT_RE.test(line)) {
      pending.push(line)
    } else {
      if (pending.length > 0) annotationMap.set(contentLines.length, pending)
      contentLines.push(line)
      pending = []
    }
  }
  // Trailing annotations (no content line after them) — drop them
  return { contentLines, annotationMap }
}

// Run a line-array diff, emitting per-line ops with old/new indices.
function lineArrayDiff(oldLines, newLines) {
  const chunks = diffArrays(oldLines, newLines)
  const ops = []
  let oldIdx = 0
  let newIdx = 0
  for (const chunk of chunks) {
    for (const line of chunk.value) {
      if (chunk.added) {
        ops.push({ kind: 'added', line, newIdx: newIdx++ })
      } else if (chunk.removed) {
        ops.push({ kind: 'removed', line, oldIdx: oldIdx++ })
      } else {
        ops.push({ kind: 'same', line, oldIdx: oldIdx++, newIdx: newIdx++ })
      }
    }
  }
  return ops
}

/**
 * annotate(oldRaw, newCleanText, user, date)
 *
 * Takes the OLD body (which may contain `<!-- düzenleyen: ... -->` annotation
 * lines) and a NEW body that does NOT contain any annotations (because it
 * comes from a WYSIWYG editor that strips them).
 *
 * Returns the new body with annotations re-injected:
 *  - Unchanged content lines retain their existing annotations.
 *  - Added/changed content lines get a fresh annotation by `user`.
 *  - Removed content lines have their annotations dropped along with them.
 *  - When a change replaces an existing annotation:
 *      - same user → replace timestamp
 *      - different user → prepend new annotation above old one (history stack)
 */
export function annotate(oldRaw, newCleanText, user, date = new Date()) {
  const { contentLines: oldContent, annotationMap } = parseWithAnnotations(oldRaw)
  const stripNew = stripAnnotations(newCleanText) // safety: also strip in case any leaked through
  const newContent = stripNew.split('\n')

  // Fast path: nothing changed → preserve old as-is (annotations included).
  if (oldContent.length === newContent.length && oldContent.every((l, i) => l === newContent[i])) {
    return oldRaw
  }

  const ops = lineArrayDiff(oldContent, newContent)
  const result = []
  const newComment = makeComment(user.displayName, date)

  let i = 0
  while (i < ops.length) {
    const op = ops[i]

    if (op.kind === 'removed') {
      i++
      continue
    }

    if (op.kind === 'same') {
      // Re-emit any existing annotations attached to this line
      const oldAnns = annotationMap.get(op.oldIdx) || []
      for (const ann of oldAnns) result.push(ann)
      result.push(op.line)
      i++
      continue
    }

    // op.kind === 'added' — start of a change block.
    // Inherit annotations from any immediately preceding removed lines
    // (because diff treats modifications as remove+add).
    let inherited = []
    let lb = i - 1
    while (lb >= 0 && ops[lb].kind === 'removed') {
      const anns = annotationMap.get(ops[lb].oldIdx) || []
      inherited = [...anns, ...inherited]
      lb--
    }

    // Apply merge rule for the new annotation
    const sameUserIdx = inherited.findIndex(a => {
      const m = a.match(COMMENT_RE)
      return m && m[1] === user.displayName
    })
    if (sameUserIdx >= 0) {
      inherited[sameUserIdx] = newComment
    } else {
      inherited = [newComment, ...inherited]
    }

    for (const ann of inherited) result.push(ann)

    // Consume the contiguous added/removed run
    while (i < ops.length && (ops[i].kind === 'added' || ops[i].kind === 'removed')) {
      if (ops[i].kind === 'added') result.push(ops[i].line)
      i++
    }
  }

  return result.join('\n')
}
