/**
 * Returns a human-readable relative time string in Turkish.
 * - <1 min  → "az önce"
 * - <1 hour → "X dk önce"
 * - <24 hrs → "X saat önce"
 * - <30 days → "X gün önce"
 * - else    → DD/MM/YYYY
 */
export function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date

  if (diffMs < 0) return 'az önce'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  if (hours < 24) return `${hours} saat önce`
  if (days < 30) return `${days} gün önce`

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
