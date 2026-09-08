/* ------------------------------------------------------------------
   Radar chart, hand-rolled SVG.

   No chart library on purpose: this is the shareable artifact, so it has
   to render identically everywhere, export cleanly to PNG, and never
   depend on a CDN.

   Three things distinguish it from a default plot:

   1. A SQUARE-ROOT radial scale. The eye reads AREA, and a linear radius
      makes area grow with the square of the value — so a person at level
      2 across the board fills a quarter of the level-4 area rather than
      half, and every profile looks emptier than it is. Under sqrt, area
      is proportional to level. The gridlines move with it, so a ring
      labelled 2 is still exactly level 2.

   2. Provenance is part of the picture. This image ends up on other
      people's screens with no surrounding page, so the title, the rubric
      version, the date and the words "self-reported" travel inside the
      SVG rather than beside it.

   3. One source of truth for the palette. The page stylesheet and the PNG
      exporter both consume RADAR_CSS below, so the downloaded image
      cannot drift from the one on screen.
------------------------------------------------------------------ */
import { DOMAINS, RUBRIC_VERSION } from './data.js'

const W = 640
const H = 712
const CX = W / 2
const CY = 348
const R = 196
const MAX = 4
const RINGS = [1, 2, 3, 4]

/* A viewBox of the full 640x712 canvas wastes horizontal margin, and on a
   phone the SVG is scaled to the column width, so every wasted unit shrinks
   the type. Cropping to the drawing's real extent buys that back.

   The bound is set by the axis labels at their LARGEST rendered size — the
   page raises them to 20px under 720px wide — not at the 15px default.
   Measured there: content runs x 26.6 to 597.5. Anything tighter clips
   "Business" on the left. */
const VB = { x: 18, y: 2, w: 590, h: 704 }

/* Area-proportional: r ∝ √value. */
const radius = value => Math.sqrt(Math.max(0, value) / MAX) * R

const pt = (i, value) => {
  const angle = (-90 + i * (360 / DOMAINS.length)) * (Math.PI / 180)
  const r = radius(value)
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

const poly = read =>
  DOMAINS.map((d, i) => pt(i, read(d)).map(n => n.toFixed(1)).join(',')).join(' ')

function grid () {
  const rings = RINGS.map(v =>
    `<polygon class="rd-ring${v === MAX ? ' rd-outer' : ''}" points="${poly(() => v)}"/>`).join('')

  const spokes = DOMAINS.map((d, i) => {
    const [x, y] = pt(i, MAX)
    return `<line class="rd-spoke" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`
  }).join('')

  const ticks = RINGS.map(v => {
    const [, y] = pt(0, v)
    return `<text class="rd-tick" x="${CX + 6}" y="${(y + 4).toFixed(1)}">${v}</text>`
  }).join('')

  return rings + spokes + ticks
}

function labels () {
  return DOMAINS.map((d, i) => {
    const [x, y] = pt(i, MAX + 0.55)
    const dx = x - CX
    const anchor = Math.abs(dx) < 14 ? 'middle' : dx > 0 ? 'start' : 'end'
    return `<text class="rd-label" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}">${d.short}</text>`
  }).join('')
}

/**
 * @param {object} you        domain key → 0-4, the person's own profile
 * @param {object} [demand]   the matched field's entry bar, or null
 * @param {string} [fieldName]
 * @param {string} [dateISO]  yyyy-mm-dd for the provenance stamp
 */
export function renderRadar (you, demand, fieldName, dateISO) {
  // The demand layer is a dashed outline rather than a second translucent
  // fill: two overlapping fills blend into a muddy third colour exactly
  // where the reader most needs to tell them apart.
  const demandLayer = demand ? `
    <polygon class="rd-demand" points="${poly(d => demand[d.key] ?? 0)}"/>
    ${DOMAINS.map((d, i) => {
      const [x, y] = pt(i, demand[d.key] ?? 0)
      return `<circle class="rd-demand-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`
    }).join('')}` : ''

  // A domain at zero sits exactly at the centre, so plotting its dot stacks
  // every zero on one pixel — with eight of them the middle becomes a knot
  // that reads as a rendering fault rather than as eight honest zeros. Mark
  // the origin once instead.
  const youLayer = `
    <polygon class="rd-you" points="${poly(d => you[d.key] ?? 0)}"/>
    <circle class="rd-zero" cx="${CX}" cy="${CY}" r="4.5"/>
    ${DOMAINS.map((d, i) => {
      const v = you[d.key] ?? 0
      if (v <= 0) return ''
      const [x, y] = pt(i, v)
      return `<circle class="rd-you-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4"/>`
    }).join('')}`

  const legend = demand ? `
    <g transform="translate(${CX - 150}, ${H - 96})">
      <line class="rd-demand" x1="0" y1="-4" x2="22" y2="-4"/>
      <circle class="rd-demand-dot" cx="11" cy="-4" r="3"/>
      <text class="rd-key" x="30" y="0">What ${fieldName || 'the field'} asks for</text>
      <line class="rd-you" x1="0" y1="18" x2="22" y2="18"/>
      <circle class="rd-you-dot" cx="11" cy="18" r="3.4"/>
      <text class="rd-key" x="30" y="22">Where you are now</text>
    </g>` : ''

  // Travels with the image. Without it the chart is an anonymous graphic
  // that says nothing about who made it or how much to believe it.
  const stamp = `
    <g>
      <text class="rd-stamp" x="${CX}" y="${H - 40}" text-anchor="middle">Self-educated · knowledge profile · rubric ${RUBRIC_VERSION}${dateISO ? ` · ${dateISO}` : ''}</text>
      <text class="rd-stamp" x="${CX}" y="${H - 22}" text-anchor="middle">Self-reported and unverified · yesitslukas.github.io/self-educated</text>
    </g>`

  return `<svg class="radar" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="Knowledge profile across twelve domains${fieldName ? `, compared with what ${fieldName} asks for` : ''}">
    <text class="rd-title" x="${CX}" y="34" text-anchor="middle">${fieldName ? `Your profile against ${fieldName}` : 'Your knowledge profile'}</text>
    <text class="rd-sub" x="${CX}" y="56" text-anchor="middle">Twelve domains, rated 0 to 4 by what you have done</text>
    ${grid()}
    ${youLayer}
    ${demandLayer}
    ${labels()}
    ${legend}
    ${stamp}
  </svg>`
}

/* The single source of truth for the chart's appearance.
   `v` resolves a CSS custom property; the page passes a function reading
   from :root, the exporter passes one reading the same computed values so
   the PNG cannot drift from the screen. */
export const radarCss = v => `
.rd-ring, .rd-spoke { fill: none; stroke: ${v('--line-2')}; }
.rd-ring { stroke-width: 1; }
.rd-ring.rd-outer { stroke: ${v('--muted')}; stroke-opacity: .55; stroke-width: 1.25; }
.rd-spoke { stroke-width: 1; stroke-opacity: .7; }
.rd-tick { fill: ${v('--muted')}; font: 12px ${v('--font')}; }
.rd-label { fill: ${v('--text')}; font: 600 15px ${v('--font')}; letter-spacing: .01em; }
.rd-title { fill: ${v('--text')}; font: 600 21px ${v('--font')}; letter-spacing: -.012em; }
.rd-sub, .rd-key { fill: ${v('--muted')}; font: 13.5px ${v('--font')}; }
.rd-stamp { fill: ${v('--muted')}; font: 12px ${v('--font')}; }
.rd-demand { fill: none; stroke: ${v('--demand')}; stroke-width: 2; stroke-dasharray: 6 4; }
.rd-demand-dot { fill: ${v('--demand')}; }
.rd-you { fill: ${v('--accent')}; fill-opacity: ${v('--you-fill')}; stroke: ${v('--accent')}; stroke-width: 2.25; stroke-linejoin: round; }
.rd-you-dot, .rd-zero { fill: ${v('--accent')}; }
`
