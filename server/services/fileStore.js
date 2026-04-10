import fs from 'fs/promises'
import path from 'path'
import { CONTENT_ROOT } from '../utils/root.js'
import { safeResolve, encodeId, decodeId } from '../utils/paths.js'
import { parseFrontmatter } from '../utils/frontmatter.js'

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

// Convert absolute path to repo-relative path with forward slashes
// (e.g. content/notes/example.md)
function toRelative(absPath) {
  const projectRoot = path.resolve(CONTENT_ROOT, '..')
  return path.relative(projectRoot, absPath).split(path.sep).join('/')
}

// Given a relative path like "content/notes/x.md", return the part under content/
function stripContent(relativePath) {
  return relativePath.replace(/^content\//, '').replace(/^\/+/, '')
}

function buildMeta(relative, raw) {
  const { meta, body } = parseFrontmatter(raw)
  const parts = relative.split('/')
  const fileName = parts[parts.length - 1]
  const folder = parts[parts.length - 2]
  return {
    id: encodeId(relative),
    path: relative,
    title: meta.title || fileName.replace('.md', ''),
    date: meta.date || 'Bilinmiyor',
    category: meta.category || folder,
    fileName,
    wordCount: body.split(/\s+/).filter(Boolean).length,
  }
}

export async function listFiles() {
  await fs.mkdir(CONTENT_ROOT, { recursive: true })
  const absPaths = await walk(CONTENT_ROOT)
  const files = await Promise.all(
    absPaths.map(async abs => {
      const relative = toRelative(abs)
      const raw = await fs.readFile(abs, 'utf8')
      return buildMeta(relative, raw)
    })
  )
  files.sort((a, b) => new Date(b.date) - new Date(a.date))
  return files
}

export async function readFile(id) {
  const relative = decodeId(id)
  const abs = safeResolve('content', stripContent(relative))
  const raw = await fs.readFile(abs, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const meta2 = buildMeta(relative, raw)
  return {
    ...meta2,
    content: raw, // full raw including frontmatter
    body,
    frontmatter: meta,
  }
}

export async function writeFileContent(id, fullContent) {
  const relative = decodeId(id)
  const abs = safeResolve('content', stripContent(relative))
  await fs.writeFile(abs, fullContent, 'utf8')
}

export async function createFile({ category, fileName, title, content }) {
  if (!/^[\w\- .]+\.md$/.test(fileName)) {
    throw new Error('Invalid file name (letters, numbers, -, _, space, .md only)')
  }
  if (!/^[\w\-]+$/.test(category)) {
    throw new Error('Invalid category')
  }
  const relative = `content/${category}/${fileName}`
  const abs = safeResolve('content', `${category}/${fileName}`)
  try {
    await fs.access(abs)
    throw new Error('File already exists')
  } catch (e) {
    if (e.code !== 'ENOENT') {
      if (e.message === 'File already exists') throw e
    }
  }
  await fs.mkdir(path.dirname(abs), { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const frontmatter =
    `<!-- title: ${title || fileName.replace('.md', '')} -->\n` +
    `<!-- date: ${today} -->\n` +
    `<!-- category: ${category} -->\n\n`
  await fs.writeFile(abs, frontmatter + (content || ''), 'utf8')
  return { id: encodeId(relative), path: relative }
}

export async function deleteFile(id) {
  const relative = decodeId(id)
  const abs = safeResolve('content', stripContent(relative))
  await fs.unlink(abs)
}
