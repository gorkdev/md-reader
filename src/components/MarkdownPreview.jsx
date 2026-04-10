import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  li({ children, className, node, ...props }) {
    if (className === 'task-list-item') {
      return <li style={taskListStyle} {...props}>{children}</li>
    }
    return <li className={className} {...props}>{children}</li>
  },
  input({ type, node, ...props }) {
    if (type === 'checkbox') {
      return <input type="checkbox" style={checkboxStyle} {...props} />
    }
    return <input type={type} {...props} />
  },
}

export default function MarkdownPreview({ content, className = '' }) {
  return (
    <div className={`prose prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-muted prose-code:text-foreground prose-a:text-blue-400 prose-blockquote:border-border prose-hr:border-border ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
