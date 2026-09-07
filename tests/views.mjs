/**
 * Render tests.
 *
 * views.js is deliberately pure — (state) → HTML string, no DOM, no network —
 * which means every screen the product can show can be rendered and inspected
 * in Node. These tests exercise the shapes that a browser walkthrough is
 * least likely to reach by accident: the empty profile, the flat responder,
 * the maximal profile, the one with no gaps left.
 *
 * They catch a different class of bug from run.mjs. run.mjs asks whether the
 * numbers are right; this asks whether the page built from them contains
 * "undefined", "NaN", "[object Object]", an unresolved template, or an
 * element the CSS expects and the markup never produced.
 *
 * Run: node tests/views.mjs
 */
import { DOMAINS, RIASEC_ITEMS, MONEY_MODES, RUBRIC_VERSION } from '../assets/data.js'
import {
  scoreRiasec, scoreDomains, scoreFields, flameIndex, flameError, tierFor,
  ikigaiRead, interestQuality, consistencyFlags, tiedWithTop,
} from '../assets/scoring.js'
import * as views from '../assets/views.js'

let passed = 0
const failures = []
const test = (name, fn) => {
  try { fn(); passed++ }
  catch (err) { failures.push({ name, message: err.message }) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

const KEYS = DOMAINS.map(d => d.key)
const MONEY_HORIZON = Object.fromEntries(MONEY_MODES.map(m => [m.key, m.horizon]))

/* Mirrors compute() in app.js. Kept here rather than imported because app.js
   touches document at module scope; if the two ever drift, the render tests
   stop describing what users actually see, so any change to compute() must be
   reflected here. */
function buildResults (state) {
  const riasec = scoreRiasec(state.riasec)
  const domains = scoreDomains(state.levels)
  const ikigai = {
    loves: state.loves,
    goodAt: state.goodAt,
    cause: state.cause,
    moneyHorizon: MONEY_HORIZON[state.money] ?? 18,
  }
  const fields = scoreFields(riasec, domains, ikigai)
  const tied = tiedWithTop(fields)
  const flame = flameIndex(domains, state.evidence)
  const ranked = Object.entries(riasec.score)
    .filter(([, v]) => v !== null)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
  const meaningful = tied.filter(f => f.causes.includes(state.cause))

  return {
    rubric: RUBRIC_VERSION,
    date: '2026-09-07',
    riasec,
    quality: interestQuality(state.riasec),
    topTypes: ranked.slice(0, 2),
    domains,
    tiers: Object.fromEntries(DOMAINS.map(d =>
      [d.key, tierFor(domains[d.key], state.evidence.has(d.key), state.teaches.has(d.key)).key])),
    fields,
    tied,
    flame,
    flameSe: flameError(domains, state.evidence),
    ikigai: ikigaiRead(ikigai),
    flags: consistencyFlags(state.levels, ikigai),
    causeNote: meaningful.length && state.cause ? `Of the fields this test cannot separate, <b>${meaningful[0].name}</b> is the one that touches what you said bugs you.` : '',
    captureEnabled: false,
    thin: Object.values(state.levels).every(v => (v ?? 0) < 2),
    stability: null,
  }
}

const stateOf = (over = {}) => ({
  step: 0,
  loves: over.loves ?? ['puzzles', 'organise'],
  goodAt: over.goodAt ?? ['puzzles'],
  cause: over.cause ?? 'waste',
  money: over.money ?? 'stable',
  riasec: over.riasec ?? RIASEC_ITEMS.map((_, i) => [1, 3, 0, 1, 2, 3][i % 6]),
  levels: { ...Object.fromEntries(KEYS.map(k => [k, 0])), ...(over.levels || {}) },
  evidence: new Set(over.evidence || []),
  teaches: new Set(over.teaches || []),
  results: null,
})

/* The checks every rendered screen has to pass.

   The absolute-storage patterns are here because the page once claimed
   "Nothing here is stored anywhere" while persist() wrote every answer to
   sessionStorage on every render. A claim about storage is the one kind of
   sentence this product cannot get wrong, so the shape of the false version
   is banned rather than left to review. */
const POISON = [
  ['absolute storage claim', /nothing (here )?is stored anywhere|(this )?page keeps nothing|we store nothing/i],
  ['undefined', /\bundefined\b/],
  ['NaN', /\bNaN\b/],
  ['[object Object]', /\[object Object\]/],
  ['unresolved template', /\$\{/],
  ['null printed', />\s*null\s*</],
  ['literal Infinity', /\bInfinity\b/],
]

function clean (html, where) {
  assert(typeof html === 'string' && html.length > 0, `${where} rendered nothing`)
  for (const [name, re] of POISON) {
    const m = html.match(re)
    if (m) {
      const at = html.indexOf(m[0])
      throw new Error(`${where} contains ${name}: …${html.slice(Math.max(0, at - 70), at + 70).replace(/\s+/g, ' ')}…`)
    }
  }
  // Crude but effective: every screen opens a <section> and closes it.
  const open = (html.match(/<section/g) || []).length
  const close = (html.match(/<\/section>/g) || []).length
  assert(open === close, `${where} has ${open} <section> against ${close} closing tags`)
  const divOpen = (html.match(/<div[\s>]/g) || []).length
  const divClose = (html.match(/<\/div>/g) || []).length
  assert(divOpen === divClose, `${where} has ${divOpen} <div> against ${divClose} closing tags`)
}

/* ---------------------------------------------------------------- */
/* Question screens                                                  */
/* ---------------------------------------------------------------- */

test('every question screen renders cleanly from a blank state', () => {
  const s = stateOf({ loves: [], goodAt: [], cause: '', money: '', riasec: RIASEC_ITEMS.map(() => null), levels: {} })
  s.levels = Object.fromEntries(KEYS.map(k => [k, null]))
  const pages = [[0, 6], [6, 12], [12, 18]]
  clean(views.renderIntro(), 'intro')
  clean(views.renderPicker(s, 'loves', 'T', 'S'), 'picker (empty)')
  clean(views.renderCause(s), 'cause (empty)')
  clean(views.renderMoney(s), 'money (empty)')
  for (let p = 0; p < pages.length; p++) clean(views.renderRiasec(s, pages, p), `riasec page ${p}`)
  clean(views.renderLevels(s), 'levels (empty)')
  clean(views.renderEvidence(s), 'evidence (nothing claimed)')
})

test('the picker disables the unpicked once five are chosen', () => {
  const s = stateOf({ loves: ['puzzles', 'build', 'visual', 'write', 'organise'] })
  const html = views.renderPicker(s, 'loves', 'T', 'S')
  clean(html, 'picker (full)')
  assert(html.includes('disabled'), 'a full picker must disable the remaining tiles, not silently ignore clicks')
  assert(html.includes('deselect one to swap'), 'a full picker must say how to change a choice')
  const s2 = stateOf({ loves: ['puzzles'] })
  assert(!views.renderPicker(s2, 'loves', 'T', 'S').includes('disabled'), 'a partly-filled picker must not disable anything')
})

test('the evidence screen offers exactly the domains that claimed a level', () => {
  const s = stateOf({ levels: { software: 3, data: 2, systems: 1, people: 4 } })
  const html = views.renderEvidence(s)
  clean(html, 'evidence')
  assert(html.includes('data-evidence="software"'), 'a level-3 claim must be offered for evidence')
  assert(html.includes('data-evidence="data"'), 'a level-2 claim must be offered for evidence')
  assert(!html.includes('data-evidence="systems"'), 'a level-1 claim needs no evidence and must not be offered')
  assert(!html.includes('data-evidence="craft"'), 'an untouched domain must not be offered')
})

test('the teaching chip appears only for an evidenced top-level claim', () => {
  const claimed = stateOf({ levels: { people: 4 }, evidence: ['people'] })
  assert(views.renderEvidence(claimed).includes('data-teaches="people"'), 'an evidenced level 4 should offer the teaching chip')
  const unevidenced = stateOf({ levels: { people: 4 } })
  assert(!views.renderEvidence(unevidenced).includes('data-teaches'), 'teaching must not be offered without evidence')
  const lower = stateOf({ levels: { people: 3 }, evidence: ['people'] })
  assert(!views.renderEvidence(lower).includes('data-teaches'), 'teaching must not be offered below the top level')
})

/* ---------------------------------------------------------------- */
/* Results                                                           */
/* ---------------------------------------------------------------- */

const SCENARIOS = {
  'empty profile': stateOf({ levels: {} }),
  'thin profile (read about things only)': stateOf({ levels: { software: 1, data: 1 } }),
  'typical self-taught developer': stateOf({ levels: { software: 3, data: 2, systems: 2, business: 1 }, evidence: ['software'] }),
  'maximal, fully evidenced': stateOf({
    levels: Object.fromEntries(KEYS.map(k => [k, 4])),
    evidence: KEYS, teaches: KEYS,
  }),
  'maximal, no evidence at all': stateOf({ levels: Object.fromEntries(KEYS.map(k => [k, 4])) }),
  'flat interest responder': stateOf({ riasec: RIASEC_ITEMS.map(() => 3), levels: { craft: 3, making: 2 }, evidence: ['craft'] }),
  'unanswered interests': stateOf({ riasec: RIASEC_ITEMS.map(() => null), levels: { health: 3 }, evidence: ['health'] }),
  'contradictory answers': stateOf({ goodAt: ['teach'], levels: { people: 0, software: 3 }, evidence: ['software'] }),
  'urgent runway': stateOf({ money: 'urgent', levels: { craft: 3, making: 3 }, evidence: ['craft', 'making'] }),
  'no cause chosen': stateOf({ cause: '', levels: { design: 3 }, evidence: ['design'] }),
}

for (const [name, state] of Object.entries(SCENARIOS)) {
  test(`results render cleanly: ${name}`, () => {
    const r = buildResults(state)
    clean(views.renderResults(r), `results (${name})`)
  })
}

test('a profile with nothing practised gets the thin result, not a confident recommendation', () => {
  const r = buildResults(SCENARIOS['empty profile'])
  assert(r.thin, 'an all-zero profile must be classified thin')
  const html = views.renderResults(r)
  assert(html.includes('not enough here'), 'the thin result must say so plainly')
  assert(!html.includes('class="rank"'), 'the thin result must not rank fields it cannot rank')
  assert(!/\bfit\b/.test(html), 'the thin result must not print a fit claim')
  assert(html.includes('one small thing'), 'the thin result must give the one actionable next step')
})

test('a real profile gets ranks and meters rather than a percentage', () => {
  const html = views.renderResults(buildResults(SCENARIOS['typical self-taught developer']))
  assert(html.includes('class="rank"'), 'fields must be ranked')
  assert(html.includes('class="meter"'), 'the components of fit must be shown as meters')
  assert(!/\d+% fit/.test(html), 'a bare percentage implies a precision the instrument does not have')
})

test('the flat responder is told their interest answers carry no information', () => {
  const r = buildResults(SCENARIOS['flat interest responder'])
  assert(r.quality.verdict === 'flat', 'an all-identical interest profile must be flagged flat')
  const html = views.renderResults(r)
  assert(html.includes('did not separate'), 'the page must say the interest answers were unusable')
  assert(html.includes('not usable'), 'each card must mark the interest meter as unusable')
})

test('the contradiction between sections is surfaced on the page', () => {
  const r = buildResults(SCENARIOS['contradictory answers'])
  assert(r.flags.length >= 1, 'the contradiction must be detected')
  const html = views.renderResults(r)
  assert(html.includes('does not line up') || html.includes('do not line up'),
    'the contradiction must be shown, not absorbed')
  assert(html.includes('Teaching &amp; People') || html.includes('Teaching & People'), 'the flag must name the domain')
})

test('an unevidenced maximal profile never shows a verified-looking result', () => {
  const r = buildResults(SCENARIOS['maximal, no evidence at all'])
  const html = views.renderResults(r)
  assert(r.flame < 100, `an entirely unevidenced profile reported ${r.flame}`)
  assert(!html.includes('>Torch<') && !html.includes('>Beacon<'),
    'no unevidenced claim may display a Torch or Beacon badge')
})

test('every results variant carries the disclaimer and the honesty line', () => {
  for (const [name, state] of Object.entries(SCENARIOS)) {
    const r = buildResults(state)
    if (r.thin) continue
    const html = views.renderResults(r)
    assert(html.includes('not academic qualifications'), `${name} is missing the qualifications disclaimer`)
    assert(html.includes('self-reported'), `${name} is missing the unverified statement`)
  }
})

test('with no capture endpoint the page does not ask for an email', () => {
  const html = views.renderResults(buildResults(SCENARIOS['typical self-taught developer']))
  assert(!html.includes('id="capture"'), 'no form may be shown while there is nowhere to send it')
  assert(!html.includes('type="email"'), 'no address may be collected while there is nowhere to store it')
  // Match on a phrase that cannot straddle a line break in the template.
  assert(html.includes('go nowhere else'), 'the page must say where the answers actually go')
})

test('the chart is present in every results variant and carries its provenance', () => {
  for (const [name, state] of Object.entries(SCENARIOS)) {
    const html = views.renderResults(buildResults(state))
    assert(html.includes('<svg class="radar"'), `${name} rendered no chart`)
    assert(html.includes('Self-reported and unverified'), `${name}'s chart carries no provenance stamp`)
    assert(html.includes(`rubric ${RUBRIC_VERSION}`), `${name}'s chart carries no rubric version`)
  }
})

test('no results variant leaks a protected title', () => {
  for (const [name, state] of Object.entries(SCENARIOS)) {
    const html = views.renderResults(buildResults(state))
    const hit = html.match(/\b(bachelor|master's|magister|diplom|meister)\b/i)
    assert(!hit, `${name} printed a protected title: "${hit?.[0]}"`)
  }
})

/* ---------------------------------------------------------------- */

const total = passed + failures.length
if (failures.length) {
  console.error(`\n  ${failures.length} of ${total} failed\n`)
  for (const f of failures) console.error(`  ✗ ${f.name}\n    ${f.message}\n`)
  process.exit(1)
}
console.log(`\n  ${passed}/${total} passed\n`)
