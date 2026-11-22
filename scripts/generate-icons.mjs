/**
 * Builds every app icon from one vector design.
 *   pnpm icons
 * Outputs: public/icon.svg (favicon + header logo), PNG app icons, maskable
 * icon, Apple touch icon and a monochrome notification badge.
 */
import { writeFile } from "node:fs/promises"
import sharp from "sharp"

const OUT = new URL("../public/", import.meta.url)
const C = 256 // centre of a 512 canvas

/** Gear outline: `teeth` trapezoid teeth between radii rb (root) and ro (tip). */
function gearPath({ teeth = 8, rb = 150, ro = 194, rootHalf = 15, tipHalf = 9 } = {}) {
  const pt = (r, deg) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`
  }
  const step = 360 / teeth
  let d = ""
  for (let i = 0; i < teeth; i++) {
    const t = i * step
    d += `${i ? "L" : "M"}${pt(rb, t - rootHalf)} L${pt(ro, t - tipHalf)} L${pt(ro, t + tipHalf)} L${pt(rb, t + rootHalf)} `
    d += `A${rb} ${rb} 0 0 1 ${pt(rb, t + step - rootHalf)} `
  }
  return d + "Z"
}

const HOLE = 108
const gear = gearPath()
// Hole as two arcs so it can be cut with evenodd.
const hole = `M${C - HOLE} ${C} a${HOLE} ${HOLE} 0 1 0 ${HOLE * 2} 0 a${HOLE} ${HOLE} 0 1 0 ${-HOLE * 2} 0Z`
const W = "M184 214 L218 300 L256 236 L294 300 L328 214"

function icon({ rounded, glow = true, bleed = false }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="116" fill="url(#bg)"/>`
    : `<rect width="512" height="512" fill="url(#bg)"/>`
  // Maskable icons keep content inside the central 80% safe zone.
  const scale = bleed ? 0.84 : 1
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#13233d"/>
      <stop offset="1" stop-color="#0a111d"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#38b6ff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#38b6ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gear" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
      <stop offset="0" stop-color="#7fd8ff"/>
      <stop offset="0.55" stop-color="#2fa4f5"/>
      <stop offset="1" stop-color="#1769d6"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
    ${glow ? `<circle cx="${C}" cy="${C}" r="250" fill="url(#glow)"/>` : ""}
    <path d="${gear} ${hole}" fill="url(#gear)" fill-rule="evenodd" stroke="url(#gear)" stroke-width="14" stroke-linejoin="round"/>
    <path d="${W}" fill="none" stroke="#eaf6ff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`
}

/** White silhouette on transparent, for the Android status-bar badge. */
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><mask id="m"><rect width="512" height="512" fill="#fff"/><path d="${W}" fill="none" stroke="#000" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>
  <g mask="url(#m)">
    <path d="${gear}" fill="#fff" stroke="#fff" stroke-width="14" stroke-linejoin="round"/>
  </g>
</svg>
`

const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(file, OUT).pathname)

const rounded = icon({ rounded: true })
const square = icon({ rounded: false })
const maskable = icon({ rounded: false, bleed: true })

await writeFile(new URL("icon.svg", OUT), rounded)
await Promise.all([
  png(rounded, 512, "icon-512.png"),
  png(rounded, 192, "icon-192.png"),
  png(maskable, 512, "icon-maskable-512.png"),
  png(square, 180, "apple-icon.png"),
  png(icon({ rounded: true, glow: false }), 32, "favicon-32.png"),
  png(badge, 96, "badge-96.png"),
])
console.log("Icons written to public/")
