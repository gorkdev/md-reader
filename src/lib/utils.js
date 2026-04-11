import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Deterministic user color from username/id string.
// Returns an HSL hue so callers can set their own saturation/lightness/alpha.
const USER_HUES = [
  210, // blue
  150, // green
  330, // pink
  30,  // orange
  270, // purple
  180, // teal
  0,   // red
  60,  // yellow
];

export function getUserColor(name = '', mode) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = USER_HUES[Math.abs(hash) % USER_HUES.length]
  const dark = !mode ? document.documentElement.classList.contains('dark') : mode === 'dark'
  return {
    hue,
    bg: dark ? `hsl(${hue} 70% 50% / 0.15)` : `hsl(${hue} 60% 50% / 0.12)`,
    text: dark ? `hsl(${hue} 70% 65%)` : `hsl(${hue} 65% 38%)`,
    dot: dark ? `hsl(${hue} 70% 55%)` : `hsl(${hue} 65% 45%)`,
    dotPing: dark ? `hsl(${hue} 70% 60%)` : `hsl(${hue} 65% 50%)`,
  }
}
