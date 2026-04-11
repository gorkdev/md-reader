import { useRef, useEffect, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getUserColor } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { timeAgo } from '@/lib/timeAgo'

const ANNOTATION_RE = /^<!--\s*düzenleyen:\s*(.+?)\s+—\s+(.+?)\s*-->$/

function stripAnnotations(text) {
  if (!text) return text
  return text.split('\n').filter(line => !ANNOTATION_RE.test(line)).join('\n')
}

const taskListStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  listStyle: 'none',
}

const checkboxStyle = {
  margin: 0,
  flexShrink: 0,
  position: 'relative',
  top: '0.1em',
}

const components = {
  li({ children, className, ...props }) {
    if (className === 'task-list-item') {
      return <li style={taskListStyle} {...props}>{children}</li>
    }
    return <li className={className} {...props}>{children}</li>
  },
  input({ type, ...props }) {
    if (type === 'checkbox') {
      return <input type="checkbox" style={checkboxStyle} {...props} />
    }
    return <input type={type} {...props} />
  },
}

/**
 * Map each top-level markdown block to its blame entry.
 *
 * Blame array is per-line (content lines, annotations stripped).
 * React-markdown renders top-level blocks (p, h1-h6, ul, ol, blockquote, pre, hr).
 * We need to figure out which blame entry corresponds to which rendered block.
 *
 * Strategy: split clean content into lines, walk through and group consecutive
 * lines into blocks (separated by blank lines or heading markers), then pick
 * the most recent blame entry from that block's lines.
 */
function buildBlockBlame(cleanContent, blameLines) {
  if (!cleanContent || !blameLines || blameLines.length === 0) return []

  const lines = cleanContent.split('\n')
  const blocks = []
  let currentBlock = []
  let currentBlameEntries = []
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const blame = blameLines[i] || null

    // Track fenced code blocks as single blocks
    if (line.match(/^```/)) {
      if (!inCodeBlock) {
        // Start of code block — flush any pending block first
        if (currentBlock.length > 0) {
          blocks.push(pickBlame(currentBlameEntries))
          currentBlock = []
          currentBlameEntries = []
        }
        inCodeBlock = true
        currentBlock.push(line)
        if (blame) currentBlameEntries.push(blame)
      } else {
        // End of code block
        currentBlock.push(line)
        if (blame) currentBlameEntries.push(blame)
        blocks.push(pickBlame(currentBlameEntries))
        currentBlock = []
        currentBlameEntries = []
        inCodeBlock = false
      }
      continue
    }

    if (inCodeBlock) {
      currentBlock.push(line)
      if (blame) currentBlameEntries.push(blame)
      continue
    }

    // Blank line = block separator
    if (line.trim() === '') {
      if (currentBlock.length > 0) {
        blocks.push(pickBlame(currentBlameEntries))
        currentBlock = []
        currentBlameEntries = []
      }
      continue
    }

    // Heading = starts a new block
    if (line.match(/^#{1,6}\s/)) {
      if (currentBlock.length > 0) {
        blocks.push(pickBlame(currentBlameEntries))
        currentBlock = []
        currentBlameEntries = []
      }
      currentBlock.push(line)
      if (blame) currentBlameEntries.push(blame)
      blocks.push(pickBlame(currentBlameEntries))
      currentBlock = []
      currentBlameEntries = []
      continue
    }

    // Thematic break (---, ***, ___)
    if (line.match(/^(\*{3,}|-{3,}|_{3,})\s*$/)) {
      if (currentBlock.length > 0) {
        blocks.push(pickBlame(currentBlameEntries))
        currentBlock = []
        currentBlameEntries = []
      }
      blocks.push(blame)
      continue
    }

    currentBlock.push(line)
    if (blame) currentBlameEntries.push(blame)
  }

  // Flush remaining
  if (currentBlock.length > 0) {
    blocks.push(pickBlame(currentBlameEntries))
  }

  return blocks
}

// Pick the most recent blame entry from a set of entries for a block
function pickBlame(entries) {
  if (entries.length === 0) return null
  let latest = entries[0]
  for (let i = 1; i < entries.length; i++) {
    if (entries[i] && (!latest || new Date(entries[i].date) > new Date(latest.date))) {
      latest = entries[i]
    }
  }
  return latest
}

function BlameGutter({ entry }) {
  const { theme } = useTheme()
  if (!entry) return <div className="blame-gutter-empty" />

  const color = getUserColor(entry.username || entry.user, theme)

  return (
    <div
      className="blame-gutter-entry"
      style={{ color: color.text }}
    >
      <span className="blame-gutter-user">{entry.user}</span>
      <span className="blame-gutter-time">{timeAgo(entry.date)}</span>
    </div>
  )
}

export default function MarkdownPreview({ content, blame, className = '' }) {
  const contentRef = useRef(null)
  const gutterRef = useRef(null)
  const [gutterItems, setGutterItems] = useState([])

  const cleanContent = useMemo(() => stripAnnotations(content), [content])
  const blockBlame = useMemo(() => buildBlockBlame(cleanContent, blame), [cleanContent, blame])

  const hasBlame = blame && blame.length > 0 && blame.some(b => b != null)

  // After markdown renders, measure each top-level block element and position gutter entries
  useEffect(() => {
    if (!hasBlame || !contentRef.current) return

    const measure = () => {
      const container = contentRef.current
      if (!container) return

      // Top-level children of the prose div = rendered blocks
      const children = Array.from(container.children)
      const containerTop = container.getBoundingClientRect().top

      const items = children.map((child, i) => {
        const rect = child.getBoundingClientRect()
        return {
          top: rect.top - containerTop,
          height: rect.height,
          blame: blockBlame[i] || null,
        }
      })

      setGutterItems(items)
    }

    // Measure after DOM settles
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [cleanContent, blockBlame, hasBlame])

  if (!hasBlame) {
    return (
      <div className={`prose dark:prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-muted prose-code:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-blockquote:border-border prose-hr:border-border ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleanContent || ''}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className={`blame-preview-wrapper ${className}`}>
      <div className="blame-gutter" ref={gutterRef}>
        {gutterItems.map((item, i) => (
          <div
            key={i}
            className="blame-gutter-row"
            style={{ top: item.top, height: item.height }}
          >
            <BlameGutter entry={item.blame} />
          </div>
        ))}
      </div>
      <div
        ref={contentRef}
        className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-muted prose-code:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-blockquote:border-border prose-hr:border-border flex-1 min-w-0"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleanContent || ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}
