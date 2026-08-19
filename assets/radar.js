/* ------------------------------------------------------------------
   Radar chart, hand-rolled SVG. No chart library on purpose: this is
   the shareable artifact, so it has to render identically everywhere,
   export cleanly to PNG, and never depend on a CDN.
------------------------------------------------------------------ */
import { DOMAINS } from './data.js'

const SIZE = 620
const CX = SIZE / 2
const CY = SIZE / 2 + 6
const R = 195
const MAX = 4
const RINGS = [1, 2, 3, 4]

const pt = (i, value) => {
  const angle = (-90 + i * (360 / DOMAINS.length)) * (Math.PI / 180)
  const r = (value / MAX) * R
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

const poly = values =>
  DOMAINS.map((d, i) => pt(i, values[d.key] ?? 0).map(n => n.toFixed(1)).join(',')).join(' ')

function labels () {
  return DOMAINS.map((d, i) => {
    const [x, y] = pt(i, MAX + 0.62)
    const dx = x - CX
    const anchor = Math.abs(dx) < 12 ? 'middle' : dx > 0 ? 'start' : 'end'
    const words = d.label.split(' ')
    // Two-line wrap for the longer labels so they don't collide.
    const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [d.label]
    const shift = lines.length > 1 ? -6 : 0
    return `<text class="rd-label" x="${x.toFixed(1)}" y="${(y + shift).toFixed(1)}" text-anchor="${anchor}">` +
      lines.map((l, n) => `<tspan x="${x.toFixed(1)}" dy="${n === 0 ? 0 : 13}">${l}</tspan>`).join('') +
      `</text>`
  }).join('')
}

function grid () {
  const rings = RINGS.map(v => {
    const points = DOMAINS.map((d, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ')
    return `<polygon class="rd-ring" points="${points}"/>`
  }).join('')

  const spokes = DOMAINS.map((d, i) => {
    const [x, y] = pt(i, MAX)
    return `<line class="rd-spoke" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`
  }).join('')

  const scale = RINGS.map(v => {
    const [, y] = pt(0, v)
    return `<text class="rd-tick" x="${CX + 5}" y="${(y + 4).toFixed(1)}">${v}</text>`
  }).join('')

  return rings + spokes + scale
}

/**
 * @param {object} you      domain key → 0–4, the user's profile
 * @param {object} [field]  the matched field's demand profile, or null
 * @param {string} [fieldName]
 */
export function renderRadar (you, field, fieldName) {
  const demandLayer = field ? `
    <polygon class="rd-demand" points="${poly(field)}"/>
    ${DOMAINS.map((d, i) => {
      const [x, y] = pt(i, field[d.key] ?? 0)
      return `<circle class="rd-demand-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`
    }).join('')}` : ''

  const youLayer = `
    <polygon class="rd-you" points="${poly(you)}"/>
    ${DOMAINS.map((d, i) => {
      const [x, y] = pt(i, you[d.key] ?? 0)
      return `<rect class="rd-you-dot" x="${(x - 3.2).toFixed(1)}" y="${(y - 3.2).toFixed(1)}" width="6.4" height="6.4"/>`
    }).join('')}`

  const legend = `
    <g class="rd-legend" transform="translate(${SIZE - 208}, ${SIZE - 46})">
      <rect class="rd-legend-box" x="-10" y="-20" width="212" height="46" rx="8"/>
      <circle class="rd-demand-dot" cx="2" cy="-6" r="4"/>
      <text class="rd-legend-text" x="14" y="-2">What ${fieldName || 'the field'} needs</text>
      <rect class="rd-you-dot" x="-2" y="10" width="8" height="8"/>
      <text class="rd-legend-text" x="14" y="18">Where you are now</text>
    </g>`

  return `<svg class="radar" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="Knowledge profile across twelve domains">
    ${grid()}
    ${demandLayer}
    ${youLayer}
    ${labels()}
    ${field ? legend : ''}
  </svg>`
}
