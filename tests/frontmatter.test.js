import { describe, it, expect } from 'vitest'
import { parseFrontmatter, serialize } from '../server/utils/frontmatter.js'

describe('parseFrontmatter', () => {
  it('extracts simple meta fields', () => {
    const raw = `<!-- title: Hello -->\n<!-- date: 2025-01-01 -->\n\n# Body`
    const { meta, body } = parseFrontmatter(raw)
    expect(meta).toEqual({ title: 'Hello', date: '2025-01-01' })
    expect(body).toBe('# Body')
  })

  it('handles files with no frontmatter', () => {
    const raw = `# Just a heading\nNo meta here`
    const { meta, body } = parseFrontmatter(raw)
    expect(meta).toEqual({})
    expect(body).toBe('# Just a heading\nNo meta here')
  })

  it('preserves body after blank line separator', () => {
    const raw = `<!-- title: T -->\n\nLine 1\nLine 2`
    const { body } = parseFrontmatter(raw)
    expect(body).toBe('Line 1\nLine 2')
  })
})

describe('serialize', () => {
  it('reassembles frontmatter + body', () => {
    const raw = `<!-- title: T -->\n\n# Body\nMore`
    const { frontmatterLines, body } = parseFrontmatter(raw)
    const rebuilt = serialize(frontmatterLines, body)
    expect(rebuilt).toBe(raw)
  })
})
