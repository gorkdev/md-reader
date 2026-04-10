// Parse HTML-comment frontmatter, e.g. <!-- title: Foo -->
// Frontmatter = contiguous comment lines + blank lines at file start.
// Everything after is the body.
export function parseFrontmatter(raw) {
  const lines = raw.split('\n')
  const meta = {}
  let bodyStart = 0
  let sawMeta = false

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^<!--\s*(\w+):\s*(.+?)\s*-->$/)
    if (match) {
      meta[match[1]] = match[2]
      bodyStart = i + 1
      sawMeta = true
    } else if (lines[i].trim() === '') {
      bodyStart = i + 1
    } else {
      break
    }
  }

  // If we never saw meta but consumed leading blank lines, keep them as body
  if (!sawMeta) {
    return {
      meta: {},
      frontmatterLines: [],
      body: raw,
    }
  }

  return {
    meta,
    frontmatterLines: lines.slice(0, bodyStart),
    body: lines.slice(bodyStart).join('\n'),
  }
}

// Rebuild a full file from frontmatterLines + body
export function serialize(frontmatterLines, body) {
  if (frontmatterLines.length === 0) return body
  const head = frontmatterLines.join('\n')
  // frontmatterLines already includes the trailing blank-line separator
  // (its last element is ''). Just join and append body.
  return head + '\n' + body
}
