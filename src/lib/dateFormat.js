function pad(n) {
  return String(n).padStart(2, '0')
}

// DD/MM/YYYY HH:mm
export function formatDateTime(input) {
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
