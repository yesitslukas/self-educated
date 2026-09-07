/**
 * Invariant tests for the scoring engine.
 *
 * These assert properties rather than exact numbers, so they survive a
 * re-weighting of the model — which is the point. A test pinning the
 * index to 64 has to be rewritten every time a constant moves and
 * therefore protects nothing. A test saying "the index is always 0-100
 * and monotonic in every domain" fails only when the model is genuinely
 * broken.
 *
 * The block marked REGRESSIONS pins the specific defects found in the
 * v1 audit. Each one was a real, reproducible failure; each test below
 * fails against the code as it was written before that audit.
 *
 * Run: node tests/run.mjs
 */
import {
  DOMAINS, FIELDS, TIERS, RIASEC_ITEMS, RIASEC_TYPES, ACTIVITIES, CAUSES, MONEY_MODES,
} from '../assets/data.js'
import {
  scoreRiasec, scoreDomains, scoreFields, gapsFor, flameIndex, flameError,
  tierFor, ikigaiRead, interestQuality, riasecFit, domainFit, feasibility,
  effectiveLevel, consistencyFlags, stability, tiedWithTop,
} from '../assets/scoring.js'

let passed = 0
const failures = []

const test = (name, fn) => {
  try { fn(); passed++ }
  catch (err) { failures.push({ name, message: err.message }) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
const eq = (a, b, msg) => assert(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`)
const finite = (n, msg) => assert(typeof n === 'number' && Number.isFinite(n), `${msg} — got ${n}`)

const KEYS = DOMAINS.map(d => d.key)
const TYPES = Object.keys(RIASEC_TYPES)
const field = k => FIELDS.find(f => f.key === k)
const levelsOf = spec => Object.fromEntries(KEYS.map(k => [k, spec[k] ?? 0]))
const everyDomain = new Set(KEYS)

/* Deterministic pseudo-random so a failure is always reproducible. */
let seed = 1
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
const pick = arr => arr[Math.floor(rnd() * arr.length)]

const randomProfile = () => ({
  riasec: RIASEC_ITEMS.map(() => Math.floor(rnd() * 4)),
  levels: Object.fromEntries(KEYS.map(k => [k, Math.floor(rnd() * 5)])),
  ikigai: {
    loves: ACTIVITIES.filter(() => rnd() < 0.3).map(a => a.key),
    goodAt: ACTIVITIES.filter(() => rnd() < 0.3).map(a => a.key),
    cause: pick(CAUSES).key,
    moneyHorizon: pick(MONEY_MODES).horizon,
  },
})

const run = p => {
  const riasec = scoreRiasec(p.riasec)
  const domains = scoreDomains(p.levels)
  return { riasec, domains, fields: scoreFields(riasec, domains, p.ikigai), flame: flameIndex(domains) }
}

/* ---------------------------------------------------------------- */
/* Data integrity                                                    */
/* ---------------------------------------------------------------- */

test('every field declares an entry demand for every domain', () => {
  for (const f of FIELDS) {
    for (const k of KEYS) {
      assert(k in f.entryDemand, `${f.key} is missing entryDemand for "${k}"`)
      const v = f.entryDemand[k]
      assert(typeof v === 'number' && v >= 0 && v <= 3,
        `${f.key}.entryDemand.${k} = ${v} — the entry bar is capped at 3, since no field requires that you already be the person others come to`)
    }
  }
})

test('every field declares all six Holland types explicitly', () => {
  for (const f of FIELDS) {
    for (const t of TYPES) {
      assert(t in f.riasec,
        `${f.key}.riasec is missing "${t}" — centred matching needs explicit zeros, or the field's own mean is taken over the wrong denominator`)
      assert(f.riasec[t] >= 0 && f.riasec[t] <= 3, `${f.key}.riasec.${t} out of 0-3`)
    }
  }
})

test('no field name contains a comma, so tied fields can be listed in prose', () => {
  for (const f of FIELDS) {
    assert(!f.name.includes(','),
      `"${f.name}" contains a comma — a list of tied fields becomes unreadable ("A, B & C and D, E")`)
  }
})

test('field and domain keys are unique', () => {
  const fk = FIELDS.map(f => f.key)
  eq(new Set(fk).size, fk.length, 'duplicate field key')
  eq(new Set(KEYS).size, KEYS.length, 'duplicate domain key')
})

test('every field has a sane ramp, roles, causes and AI band', () => {
  const validCause = new Set(CAUSES.map(c => c.key))
  for (const f of FIELDS) {
    assert(Array.isArray(f.months) && f.months.length === 2, `${f.key}.months must be a pair`)
    assert(f.months[0] > 0 && f.months[0] <= f.months[1], `${f.key}.months is not an ascending positive range`)
    assert(f.roles?.length >= 1, `${f.key} has no example roles`)
    for (const c of f.causes) assert(validCause.has(c), `${f.key} references unknown cause "${c}"`)
    assert(['high', 'mid', 'low'].includes(f.aiBand), `${f.key}.aiBand must be a band, not a number`)
  }
})

test('no field is entirely undemanding — every one leans on something', () => {
  for (const f of FIELDS) {
    const max = Math.max(...KEYS.map(k => f.entryDemand[k] ?? 0))
    assert(max >= 2, `${f.key} has no domain demanded at 2 or above, so nothing can ever appear in its gap list`)
  }
})

test('every domain has a monotonic cumulative practice-hours curve', () => {
  for (const d of DOMAINS) {
    eq(d.hours.length, 5, `${d.key}.hours must cover levels 0-4`)
    eq(d.hours[0], 0, `${d.key}.hours must start at zero`)
    for (let i = 1; i < d.hours.length; i++) {
      assert(d.hours[i] > d.hours[i - 1], `${d.key}.hours is not increasing at level ${i}`)
    }
  }
})

test('every domain has a short radar label that needs no wrapping', () => {
  for (const d of DOMAINS) {
    assert(d.short && !/\s/.test(d.short), `${d.key}.short ("${d.short}") must be a single word — twelve wrapped axis labels collide`)
    assert(d.short.length <= 10, `${d.key}.short ("${d.short}") is too long for a radar axis`)
  }
})

test('RIASEC inventory is balanced across the six types', () => {
  const counts = {}
  for (const i of RIASEC_ITEMS) counts[i.t] = (counts[i.t] || 0) + 1
  eq(Object.keys(counts).length, 6, 'not all six Holland types are represented')
  assert(new Set(Object.values(counts)).size === 1, `unbalanced item counts: ${JSON.stringify(counts)}`)
})

test('every activity tag maps only to real domains', () => {
  for (const a of ACTIVITIES) {
    for (const k of Object.keys(a.domains)) assert(KEYS.includes(k), `activity "${a.key}" maps to unknown domain "${k}"`)
  }
})

test('tier ladder is ordered, complete, and every duration claim is hedged', () => {
  eq(TIERS[0].key, 'none', 'TIERS[0] must be the empty tier')
  eq(TIERS.length, 6, 'expected the empty tier plus five real tiers')
  for (const t of TIERS.slice(1)) {
    assert(t.name && t.blurb && t.kind && t.equiv, `tier ${t.key} is missing name, kind, equiv or blurb`)
    // The legal hedge: any tier claiming a span of study must say the study
    // is MEANT to produce it, never that the holder has been awarded anything.
    if (/\b(year|years)\b/.test(t.equiv)) {
      assert(/is meant to produce/.test(t.equiv),
        `tier ${t.key} names a duration without the "is meant to produce" hedge: "${t.equiv}"`)
    }
    assert(!/\b(bachelor|master|magister|diplom|degree|meister)\b/i.test(`${t.name} ${t.kind} ${t.equiv}`),
      `tier ${t.key} uses a legally protected title`)
  }
})

/* ---------------------------------------------------------------- */
/* REGRESSIONS — each of these failed in the v1 audit                */
/* ---------------------------------------------------------------- */

test('REGRESSION: a specialist outranks a dabbler in the specialist\'s own field', () => {
  // The old domainFit reduced algebraically to Σmin(u,d)/Σd, so the demand
  // vector acted only as a ceiling and never as an importance weight. A
  // person who had merely READ ABOUT all twelve domains scored 0.600 on
  // Software Engineering against 0.267 for someone at the top of software
  // itself — the exact inverse of the product's thesis.
  for (const f of FIELDS) {
    const core = KEYS.filter(k => (f.entryDemand[k] ?? 0) >= 2.5)
    if (!core.length) continue
    const specialist = domainFit(levelsOf(Object.fromEntries(core.map(k => [k, 4]))), f)
    const dabbler = domainFit(levelsOf(Object.fromEntries(KEYS.map(k => [k, 1]))), f)
    assert(specialist > dabbler,
      `${f.key}: a dabbler (all 1s) scored ${dabbler.toFixed(3)} against a specialist's ${specialist.toFixed(3)}`)
  }
})

test('REGRESSION: answering the same to every interest item buys nothing', () => {
  // The old riasecFit was a demand-weighted mean with no magnitude term, so
  // a respondent answering "yes, that is me" to all eighteen items scored
  // exactly 1.000 on every single field — the model's maximum reachable
  // only by its least informative response pattern.
  for (const v of [0, 1, 2, 3]) {
    const flat = scoreRiasec(RIASEC_ITEMS.map(() => v))
    for (const f of FIELDS) {
      eq(riasecFit(flat.score, f), null,
        `a flat "${v}" profile still matched ${f.key} — centring is not removing elevation`)
    }
    const ranked = scoreFields(flat, scoreDomains(levelsOf({ software: 3 })), { moneyHorizon: 18 })
    for (const f of ranked) {
      assert(f.score < 1, `a flat responder scored ${f.score} on ${f.key}`)
      eq(f.interestUsable, false, 'a flat responder should have interest scoring disabled')
    }
  }
})

test('REGRESSION: the headline index sees the evidence check', () => {
  // The old flameIndex never saw state.evidence, so someone claiming the top
  // level in all twelve domains with no evidence whatsoever scored 100 — on
  // the same screen that admitted nothing had been verified.
  const all4 = levelsOf(Object.fromEntries(KEYS.map(k => [k, 4])))
  const unevidenced = flameIndex(all4, new Set())
  const evidenced = flameIndex(all4, everyDomain)
  eq(evidenced, 100, 'a fully evidenced top profile should reach 100')
  assert(unevidenced < evidenced, 'evidence made no difference to the headline number')
  assert(unevidenced <= 80, `an entirely unevidenced profile still scored ${unevidenced}`)
})

test('REGRESSION: depth beats breadth by a visible margin, not by one point', () => {
  // The old weight vector delivered its stated depth preference by exactly
  // one point (26 vs 25), and reversed outright one step later: two expert
  // domains scored 47 against 50 for twelve dabbled ones.
  const oneExpert = flameIndex(levelsOf({ software: 4 }), everyDomain)
  const twelveDabbles = flameIndex(levelsOf(Object.fromEntries(KEYS.map(k => [k, 1]))), everyDomain)
  assert(oneExpert - twelveDabbles >= 10,
    `one expert domain (${oneExpert}) barely beats twelve dabbled ones (${twelveDabbles})`)

  const twoExperts = flameIndex(levelsOf({ software: 4, data: 4 }), everyDomain)
  const twelvePractised = flameIndex(levelsOf(Object.fromEntries(KEYS.map(k => [k, 2]))), everyDomain)
  assert(twoExperts > twelvePractised,
    `two expert domains (${twoExperts}) lost to twelve practised ones (${twelvePractised})`)
})

test('REGRESSION: evidence caps a claim, it never promotes one', () => {
  // The old table promoted on evidence, so "practised it — small things of my
  // own" plus one self-ticked box returned Flame, whose text claims the
  // working knowledge of three to four years of full-time study.
  eq(tierFor(2, true, false).key, 'kindling',
    'level 2 ("practised, small things of my own") plus a checkbox must not reach Flame')
  eq(tierFor(2, false, false).key, 'spark', 'an unevidenced level 2 should be capped to Spark')
  eq(tierFor(3, true, false).key, 'flame', 'an evidenced level 3 is what Flame describes')
  eq(tierFor(3, false, false).key, 'kindling', 'an unevidenced level 3 should be capped to Kindling')
  eq(tierFor(4, false, false).key, 'flame', 'an unevidenced level 4 should be capped to Flame')
})

test('REGRESSION: the money answer actually moves the ranking', () => {
  // The old timing multiplier was identically 1.000 for three of the four
  // money answers, on a screen promising it changed more than anything else.
  const spread = h => {
    const vals = FIELDS.map(f => feasibility(f, h))
    return Math.max(...vals) - Math.min(...vals)
  }
  assert(spread(6) > 0.5, `a six-month runway barely discriminates between fields (spread ${spread(6).toFixed(2)})`)
  const slow = field('trades')
  assert(feasibility(slow, 6) < feasibility(slow, 36),
    'a long apprenticeship is no less feasible on a six-month runway than a three-year one')
})

test('REGRESSION: no enthusiasm bonus survives anywhere in the pipeline', () => {
  // The old scoreDomains added up to a third of a level based on what the
  // person enjoyed, in an instrument whose own screens promise levels are
  // behavioural. Every displayed level must now be the integer the user chose.
  const levels = levelsOf(Object.fromEntries(KEYS.map(k => [k, 2])))
  const enthusiastic = scoreDomains(levels, { loves: ACTIVITIES.map(a => a.key), goodAt: ACTIVITIES.map(a => a.key) })
  for (const k of KEYS) eq(enthusiastic[k], 2, `domain ${k} was adjusted away from the answer the user gave`)
})

test('REGRESSION: a contradiction between sections is reported, not absorbed', () => {
  const flags = consistencyFlags(levelsOf({ people: 0 }), { goodAt: ['teach'] })
  assert(flags.length >= 1, 'claiming people come to you for teaching while rating Teaching & People at zero raised no flag')
  assert(flags[0].claimed && flags[0].label, 'a flag must name both what was claimed and which domain it contradicts')
  eq(consistencyFlags(levelsOf({ people: 3 }), { goodAt: ['teach'] }).length, 0, 'a consistent answer raised a flag')
})

/* ---------------------------------------------------------------- */
/* Scoring invariants                                                */
/* ---------------------------------------------------------------- */

test('an all-zero profile scores without crashing or producing NaN', () => {
  const p = {
    riasec: RIASEC_ITEMS.map(() => 0),
    levels: levelsOf({}),
    ikigai: { loves: [], goodAt: [], cause: '', moneyHorizon: 18 },
  }
  const r = run(p)
  eq(r.flame, 0, 'an empty profile should score 0')
  for (const f of r.fields) {
    finite(f.score, `${f.key} score on an empty profile`)
    finite(f.se, `${f.key} standard error on an empty profile`)
  }
})

test('unanswered inputs are treated as missing, not as the lowest response', () => {
  const levels = Object.fromEntries(KEYS.map(k => [k, null]))
  levels.software = 3
  const domains = scoreDomains(levels)
  for (const k of KEYS) finite(domains[k], `domain ${k} with a null input`)
  finite(flameIndex(domains), 'flameIndex with null inputs')

  // A skipped interest item must not be scored as "dislike".
  const withHole = RIASEC_ITEMS.map((it, i) => (i === 0 ? null : 3))
  const r = scoreRiasec(withHole)
  for (const t of TYPES) {
    finite(r.score[t], `type ${t} with one item missing`)
    assert(r.score[t] > 0, `type ${t} collapsed to zero because one item was skipped`)
  }
})

test('a RIASEC type with no items reports null rather than maximum disinterest', () => {
  const r = scoreRiasec([])
  for (const t of TYPES) eq(r.score[t], null, `type ${t} should be null when nothing was answered`)
})

test('field scores stay within 0-1, carry a finite error, and come back sorted', () => {
  for (let i = 0; i < 200; i++) {
    const r = run(randomProfile())
    eq(r.fields.length, FIELDS.length, 'a field was dropped from the ranking')
    for (const f of r.fields) {
      assert(f.score >= 0 && f.score <= 1, `${f.key} scored ${f.score}, outside 0-1`)
      finite(f.se, `${f.key} standard error`)
      assert(f.se >= 0, `${f.key} reported a negative error`)
    }
    for (let n = 1; n < r.fields.length; n++) {
      assert(r.fields[n - 1].score >= r.fields[n].score, 'fields are not sorted descending')
    }
  }
})

test('the ranking is deterministic — identical input gives identical order', () => {
  for (let i = 0; i < 20; i++) {
    const p = randomProfile()
    const a = run(p).fields.map(f => f.key).join()
    const b = run(p).fields.map(f => f.key).join()
    eq(a, b, 'two runs of the same profile produced different orderings')
  }
})

test('flameIndex stays 0-100 and monotonic in every domain', () => {
  for (let i = 0; i < 60; i++) {
    const p = randomProfile()
    const base = flameIndex(scoreDomains(p.levels), everyDomain)
    assert(Number.isInteger(base) && base >= 0 && base <= 100, `flameIndex produced ${base}`)
    for (const k of KEYS) {
      if (p.levels[k] >= 4) continue
      const after = flameIndex(scoreDomains({ ...p.levels, [k]: p.levels[k] + 1 }), everyDomain)
      assert(after >= base, `raising ${k} from ${p.levels[k]} lowered the index (${base} → ${after})`)
    }
  }
})

test('every reported number comes with a finite margin', () => {
  for (let i = 0; i < 40; i++) {
    const p = randomProfile()
    const domains = scoreDomains(p.levels)
    const err = flameError(domains, everyDomain)
    finite(err, 'flameError')
    assert(err >= 0, `flameError returned ${err}`)
  }
})

test('domain scores never leave the scale', () => {
  const over = Object.fromEntries(KEYS.map(k => [k, 99]))
  const under = Object.fromEntries(KEYS.map(k => [k, -5]))
  for (const k of KEYS) {
    eq(scoreDomains(over)[k], 4, `domain ${k} exceeded the top of the scale`)
    eq(scoreDomains(under)[k], 0, `domain ${k} fell below the bottom of the scale`)
  }
})

test('a shorter runway never makes a slow field more feasible', () => {
  for (const f of FIELDS) {
    for (const h of [6, 18, 36]) {
      const v = feasibility(f, h)
      assert(v >= 0 && v <= 1, `${f.key} feasibility ${v} outside 0-1`)
    }
    assert(feasibility(f, 6) <= feasibility(f, 36) + 1e-9,
      `${f.key} is more feasible on a short runway than a long one`)
  }
})

test('gapsFor returns only central domains, priced in hours, ranked by priority', () => {
  for (let i = 0; i < 60; i++) {
    const p = randomProfile()
    const r = run(p)
    for (const top of r.fields.slice(0, 3)) {
      for (const g of gapsFor(top, r.domains)) {
        assert(g.gap > 0, `${top.key} gap "${g.key}" has no actual gap`)
        assert(g.want >= 2, `${top.key} gap "${g.key}" has demand ${g.want}, below the relevance floor`)
        assert(!(g.have === 0 && g.want < 3), `${top.key} suggests starting "${g.key}" from zero for a non-core domain`)
        assert(Number.isInteger(g.hours) && g.hours > 0, `${top.key} gap "${g.key}" has no hours estimate`)
        assert(g.months >= 1, `${top.key} gap "${g.key}" has no months estimate`)
      }
      const gaps = gapsFor(top, r.domains)
      for (let n = 1; n < gaps.length; n++) {
        assert(gaps[n - 1].priority >= gaps[n].priority, 'gaps are not ranked by priority')
      }
    }
  }
})

test('someone who already meets a field\'s entry bar has no gaps left', () => {
  for (const f of FIELDS) {
    const met = levelsOf(Object.fromEntries(KEYS.map(k => [k, f.entryDemand[k] ?? 0])))
    eq(gapsFor(f, met).length, 0, `${f.key} still reports gaps for someone who meets every demand`)
  }
})

/* ---------------------------------------------------------------- */
/* Response quality                                                  */
/* ---------------------------------------------------------------- */

test('interestQuality separates a flat responder from a shaped one', () => {
  eq(interestQuality(RIASEC_ITEMS.map(() => 3)).verdict, 'flat', 'all-identical answers were not flagged')
  eq(interestQuality(RIASEC_ITEMS.map(() => 0)).verdict, 'flat', 'all-zero answers were not flagged')

  // A sharply typed respondent: one type at ceiling, the rest at floor.
  const shaped = RIASEC_ITEMS.map(it => (it.t === 'I' ? 3 : 0))
  const q = interestQuality(shaped)
  eq(q.verdict, 'clear', `a sharply typed profile was rated "${q.verdict}" (F = ${q.F.toFixed(2)})`)
  assert(q.eta2 > 0.5, `a sharply typed profile explained only ${(q.eta2 * 100).toFixed(0)}% of variance between types`)
})

test('interestQuality survives empty input', () => {
  const q = interestQuality([])
  eq(q.verdict, 'unanswered', 'empty input should report as unanswered')
  finite(q.F, 'F on empty input')
})

test('tiedWithTop reports near-ties instead of pretending to rank them', () => {
  for (let i = 0; i < 40; i++) {
    const r = run(randomProfile())
    const tied = tiedWithTop(r.fields)
    for (const t of tied) {
      assert(t !== r.fields[0], 'the top field cannot be tied with itself')
      assert(r.fields[0].score - t.score < Math.hypot(r.fields[0].se, t.se), 'a field outside the margin was reported as tied')
    }
  }
})

/* ---------------------------------------------------------------- */
/* Tier logic — the load-bearing claim of the product                */
/* ---------------------------------------------------------------- */

test('tierFor covers the full truth table without gaps', () => {
  for (const level of [0, 1, 2, 3, 4]) {
    for (const evidence of [false, true]) {
      for (const teaches of [false, true]) {
        const t = tierFor(level, evidence, teaches)
        assert(t && TIERS.includes(t), `tierFor(${level}, ${evidence}, ${teaches}) returned an unknown tier`)
      }
    }
  }
})

test('effectiveLevel and tierFor tell the same story', () => {
  for (const level of [0, 1, 2, 3, 4]) {
    for (const evidence of [false, true]) {
      const eff = effectiveLevel(level, evidence)
      const tier = tierFor(level, evidence, false)
      const expected = eff >= 4 ? 'torch' : TIERS[Math.max(0, eff)].key
      eq(tier.key, expected, `tierFor(${level}, ${evidence}) disagrees with effectiveLevel (${eff})`)
    }
  }
})

test('evidence never lowers a tier, and its absence never raises one', () => {
  const rank = t => TIERS.findIndex(x => x.key === t.key)
  for (const level of [0, 1, 2, 3, 4]) {
    for (const teaches of [false, true]) {
      assert(rank(tierFor(level, true, teaches)) >= rank(tierFor(level, false, teaches)),
        `evidence lowered the tier at level ${level}`)
    }
  }
})

test('an unevidenced claim can never reach Torch or Beacon', () => {
  for (const level of [0, 1, 2, 3, 4]) {
    for (const teaches of [false, true]) {
      const t = tierFor(level, false, teaches)
      assert(!['torch', 'beacon'].includes(t.key),
        `level ${level} without evidence reached ${t.key} — the evidence gate is the product`)
    }
  }
})

test('Beacon requires both evidence and teaching at the top level', () => {
  eq(tierFor(4, true, true).key, 'beacon', 'a taught, evidenced 4 should be Beacon')
  assert(tierFor(4, true, false).key !== 'beacon', 'Beacon was awarded without teaching')
  assert(tierFor(3, true, true).key !== 'beacon', 'Beacon was awarded below the top level')
})

test('tier is monotonic in level at fixed evidence', () => {
  const rank = t => TIERS.findIndex(x => x.key === t.key)
  for (const evidence of [false, true]) {
    for (let level = 1; level <= 4; level++) {
      assert(rank(tierFor(level, evidence, false)) >= rank(tierFor(level - 1, evidence, false)),
        `tier fell going from level ${level - 1} to ${level} (evidence=${evidence})`)
    }
  }
})

/* ---------------------------------------------------------------- */
/* Narrative output                                                  */
/* ---------------------------------------------------------------- */

test('ikigaiRead handles no, partial and full overlap distinctly', () => {
  const none = ikigaiRead({ loves: ['puzzles'], goodAt: ['care'] })
  const partial = ikigaiRead({ loves: ['puzzles', 'care'], goodAt: ['care'] })
  const full = ikigaiRead({ loves: ['puzzles', 'care', 'teach'], goodAt: ['puzzles', 'care', 'teach'] })
  eq(none.count, 0, 'expected no overlap')
  eq(partial.count, 1, 'expected one overlapping tag')
  eq(full.count, 3, 'expected three overlapping tags')
  assert(new Set([none.verdict, partial.verdict, full.verdict]).size === 3, 'the three overlap cases read identically')
  for (const r of [none, partial, full]) assert(r.verdict.length > 80, 'a verdict is too thin to be useful')
})

test('ikigaiRead survives empty and missing input', () => {
  for (const input of [{}, { loves: [] }, { goodAt: [] }, undefined]) {
    const r = ikigaiRead(input)
    eq(r.count, 0, 'empty input should report no overlap')
    assert(r.verdict?.length > 0, 'verdict must always be present')
  }
})

test('stability compares a stored profile against a fresh one', () => {
  const levels = levelsOf({ software: 3, data: 2 })
  const prior = { answers: { levels }, savedAt: '2026-01-01T00:00:00.000Z', topFields: ['software'], flame: 40 }
  const now = { levels: { ...levels, data: 3 }, topFields: ['software'], flame: 46 }
  const s = stability(prior, now, Date.parse('2026-04-05T00:00:00.000Z'))
  eq(s.agree, 11, 'exactly one of twelve ratings changed')
  eq(s.topFieldHeld, true, 'the top field was unchanged')
  eq(s.flameDelta, 6, 'the index moved by six')
  eq(s.days, 94, 'roughly three months elapsed')
  eq(stability(null, now, 0), null, 'no prior profile should return null')
})

/* ---------------------------------------------------------------- */

const total = passed + failures.length
if (failures.length) {
  console.error(`\n  ${failures.length} of ${total} failed\n`)
  for (const f of failures) console.error(`  ✗ ${f.name}\n    ${f.message}\n`)
  process.exit(1)
}
console.log(`\n  ${passed}/${total} passed\n`)
