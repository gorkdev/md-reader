import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCellValue } from '@mdxeditor/gurx'
import { activeEditor$ } from '@mdxeditor/editor'
import { $getSelection, $isRangeSelection } from 'lexical'
import { getUserColor } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { timeAgo } from '@/lib/timeAgo'

export default function BlameOverlay({ blame }) {
  const { theme } = useTheme()
  const editor = useCellValue(activeEditor$)
  const [info, setInfo] = useState(null)
  const [pos, setPos] = useState(null)
  const [container, setContainer] = useState(null)
  const containerResolved = useRef(false)

  const updateBlame = useCallback(() => {
    if (!editor || !blame || blame.length === 0) {
      setInfo(null)
      return
    }

    if (!containerResolved.current) {
      const el = editor.getRootElement()
      if (el) {
        setContainer(el.closest('.mdx-shell'))
        containerResolved.current = true
      }
    }

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) {
        setInfo(null)
        return
      }

      const node = selection.anchor.getNode()
      const topLevel = node.getTopLevelElement?.() || node

      if (!topLevel || !topLevel.getParent) {
        setInfo(null)
        return
      }

      const root = topLevel.getParent()
      if (!root) {
        setInfo(null)
        return
      }

      const lineIndex = root.getChildren().indexOf(topLevel)

      if (lineIndex < 0 || lineIndex >= blame.length || !blame[lineIndex]) {
        setInfo(null)
        return
      }

      setInfo(blame[lineIndex])

      const domEl = editor.getElementByKey(topLevel.getKey())
      if (domEl && containerResolved.current) {
        const elRect = domEl.getBoundingClientRect()
        const shell = editor.getRootElement()?.closest('.mdx-shell')
        if (!shell) return
        const contRect = shell.getBoundingClientRect()

        const range = document.createRange()
        const textNodes = []
        const walker = document.createTreeWalker(domEl, NodeFilter.SHOW_TEXT)
        let n
        while ((n = walker.nextNode())) textNodes.push(n)

        let textEndX = elRect.left
        if (textNodes.length > 0) {
          const lastText = textNodes[textNodes.length - 1]
          range.selectNodeContents(lastText)
          const textRect = range.getBoundingClientRect()
          textEndX = textRect.right
        }

        setPos({
          top: elRect.top - contRect.top + elRect.height / 2,
          left: textEndX - contRect.left + 16,
        })
      }
    })
  }, [editor, blame])

  useEffect(() => {
    if (!editor) return
    return editor.registerUpdateListener(() => updateBlame())
  }, [editor, updateBlame])

  useEffect(() => {
    if (!editor) return
    const root = editor.getRootElement()
    if (!root) return
    const handler = () => setTimeout(updateBlame, 10)
    root.addEventListener('click', handler)
    root.addEventListener('keyup', handler)
    return () => {
      root.removeEventListener('click', handler)
      root.removeEventListener('keyup', handler)
    }
  }, [editor, updateBlame])

  if (!info || !pos || !container) return null

  const color = getUserColor(info.username || info.user, theme)

  return createPortal(
    <div
      className="absolute pointer-events-none text-sm whitespace-nowrap z-10 transition-all duration-150 ease-out -translate-y-1/2"
      style={{ top: pos.top, left: pos.left, color: color.text, opacity: 0.7 }}
    >
      {info.user} · {timeAgo(info.date)}
    </div>,
    container
  )
}
