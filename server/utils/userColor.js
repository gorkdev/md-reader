// Deterministic user color from username — must match client-side getUserColor()
const USER_HUES = [210, 150, 330, 30, 270, 180, 0, 60]

export function getUserHue(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return USER_HUES[Math.abs(hash) % USER_HUES.length]
}
