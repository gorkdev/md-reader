import { getUserColor } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

export default function LockBadge({ holder, className = '' }) {
  const { theme } = useTheme()
  if (!holder) return null
  const color = getUserColor(holder.username || holder.displayName, theme)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
      style={{
        borderColor: `hsl(${color.hue} 70% 50% / 0.3)`,
        backgroundColor: color.bg,
        color: color.text,
      }}
      title={`Düzenleniyor: ${holder.displayName}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: color.dotPing }}
        />
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color.dot }}
        />
      </span>
      {holder.displayName} düzenliyor
    </span>
  )
}
