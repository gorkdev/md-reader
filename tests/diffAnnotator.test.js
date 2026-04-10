import { describe, it, expect } from 'vitest'
import { annotate, stripAnnotations } from '../server/services/diffAnnotator.js'

const user = { displayName: 'Gorkem' }
const date = new Date('2026-04-09T14:30:00')

describe('annotate', () => {
  it('returns original body unchanged when nothing changed', () => {
    const old = `line 1\nline 2\nline 3`
    const result = annotate(old, old, user, date)
    expect(result).toBe(old)
  })

  it('preserves existing annotations when content unchanged', () => {
    const old = `a\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nb\nc`
    const newClean = `a\nb\nc`
    const result = annotate(old, newClean, user, date)
    expect(result).toBe(old)
  })

  it('adds a comment above a modified line', () => {
    const old = `line 1\nline 2\nline 3`
    const next = `line 1\nline TWO\nline 3`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `line 1\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nline TWO\nline 3`
    )
  })

  it('adds a single comment above a contiguous block of changed lines', () => {
    const old = `a\nb\nc\nd\ne`
    const next = `a\nB\nC\nD\ne`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nC\nD\ne`
    )
  })

  it('adds comments above multiple separate change blocks', () => {
    const old = `a\nb\nc\nd\ne`
    const next = `a\nB\nc\nD\ne`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nc\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nD\ne`
    )
  })

  it('adds a comment above purely inserted lines', () => {
    const old = `a\nb\nc`
    const next = `a\nb\nnew1\nnew2\nc`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\nb\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nnew1\nnew2\nc`
    )
  })

  it('does not add comment for purely deleted lines', () => {
    const old = `a\nb\nc\nd`
    const next = `a\nd`
    const result = annotate(old, next, user, date)
    expect(result).toBe(`a\nd`)
  })

  it('updates timestamp when same user re-edits a line they previously annotated', () => {
    const old = `a\n<!-- düzenleyen: Gorkem — 01/01/2026 10:00 -->\nb\nc`
    const newClean = `a\nB\nc`
    const result = annotate(old, newClean, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nc`
    )
  })

  it('stacks new annotation above existing one when a different user edits', () => {
    const old = `a\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nb\nc`
    const newClean = `a\nB\nc`
    const result = annotate(old, newClean, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nB\nc`
    )
  })

  it('formats date as DD/MM/YYYY HH:mm with zero padding', () => {
    const old = `x`
    const next = `Y`
    const result = annotate(old, next, user, new Date('2026-01-05T03:07:00'))
    expect(result).toContain('05/01/2026 03:07')
  })
})

describe('stripAnnotations', () => {
  it('removes annotation lines', () => {
    const text = `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nb\nc`
    expect(stripAnnotations(text)).toBe(`a\nb\nc`)
  })

  it('leaves non-annotation HTML comments alone', () => {
    const text = `<!-- title: Foo -->\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\n# heading`
    expect(stripAnnotations(text)).toBe(`<!-- title: Foo -->\n# heading`)
  })
})
