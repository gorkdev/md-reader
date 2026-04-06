// Load all .md files from content/ as raw strings
const mdFiles = import.meta.glob('/content/**/*.md', { eager: true, query: '?raw', import: 'default' })

function parseFrontmatter(raw) {
  const lines = raw.split('\n')
  const meta = {}
  let contentStart = 0

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^<!--\s*(\w+):\s*(.+?)\s*-->$/)
    if (match) {
      meta[match[1]] = match[2]
      contentStart = i + 1
    } else if (lines[i].trim() === '') {
      contentStart = i + 1
    } else {
      break
    }
  }

  return {
    meta,
    content: lines.slice(contentStart).join('\n')
  }
}

export function loadMarkdownFiles() {
  return Object.entries(mdFiles).map(([path, raw]) => {
    const { meta, content } = parseFrontmatter(raw)

    // Extract folder name as category fallback
    const pathParts = path.split('/')
    const folder = pathParts[pathParts.length - 2]
    const fileName = pathParts[pathParts.length - 1]

    return {
      id: path,
      title: meta.title || fileName.replace('.md', ''),
      date: meta.date || 'Bilinmiyor',
      category: meta.category || folder,
      fileName,
      path,
      content,
      raw,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    }
  }).sort((a, b) => new Date(b.date) - new Date(a.date))
}
