/* ------------------------------------------------------------------
   Scoring.

   Pure functions — no DOM in here, so this is the part that moves
   server-side once results need to be saved and verified.

   Three principles, each of which the previous version broke:

   1. NOTHING ADJUSTS UPWARD SILENTLY. Self-assessed competence is the
      weakest input in the instrument and its known bias is upward. There
      is no enthusiasm bonus. Where the answers contradict each other,
      the contradiction is reported, not averaged away.

   2. SHAPE, NOT ELEVATION. Interest matching centres both the person's
      and the field's profile on their own means, so answering "strongly
      like" to all eighteen items buys nothing. It is the pattern of
      preference that carries information, not its height.

   3. EVERY NUMBER CARRIES ITS ERROR. An 18-item screener over twelve
      self-ratings cannot support integer precision. Fit scores are
      returned with a standard error, and the UI is expected to print it.
------------------------------------------------------------------ */
import { DOMAINS, ACTIVITIES, FIELDS, RIASEC_ITEMS, RIASEC_TYPES, TIERS } from './data.js'

const DOMAIN_KEYS = DOMAINS.map(d => d.key)
const TYPES = Object.keys(RIASEC_TYPES)
const clamp01 = n => Math.max(0, Math.min(1, n))

/* How the two components of fit are weighted. Knowledge leads: this is a
   knowledge profile, and a product that ranked a person's interests above
   what they can actually do would be a personality quiz wearing a lab coat. */
export const W_KNOWLEDGE = 0.55
export const W_INTEREST = 0.45

/* Measurement error constants, both deliberately conservative.

   SEM_FLOOR: Spearman-Brown run backwards from a 10-item alpha of .90
   gives a mean inter-item correlation of ~.474, which at k = 3 yields
   alpha = .73 and a standard error of measurement near .14 on the 0-1
   scale. It is a FLOOR, not an estimate, because the least trustworthy
   response pattern of all — answering identically to every item — has
   zero observed spread and would otherwise report zero error.

   SE_LEVEL: a single behavioural self-rating is worth about half a level.
   Single-item retest reliability sits near .80 with a spread near 1.2
   points on a five-point scale. */
const SEM_FLOOR = 0.14
const SE_LEVEL = 0.5

/* ------------------------------------------------------------------
   Interests
------------------------------------------------------------------ */

/* Mean and standard error per Holland type, iterating the DECLARED
   taxonomy rather than whatever keys happened to accumulate — a typo in
   one item's type would otherwise delete a whole scale silently and be
   read downstream as maximum disinterest.

   Unanswered items are skipped rather than scored as "dislike": a missing
   answer is a gap, not a response, and treating it as the lowest point on
   the scale drags a three-item scale by a third of its range. */
export function scoreRiasec (answers) {
  const by = Object.fromEntries(TYPES.map(t => [t, []]))
  RIASEC_ITEMS.forEach((item, i) => {
    if (!by[item.t]) return
    const v = answers?.[i]
    if (v === null || v === undefined) return
    by[item.t].push(v)
  })

  const score = {}, se = {}
  for (const t of TYPES) {
    const xs = by[t]
    if (!xs.length) { score[t] = null; se[t] = null; continue }
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    const variance = xs.length > 1
      ? xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1)
      : 0
    score[t] = mean / 3
    se[t] = Math.max(Math.sqrt(variance / xs.length) / 3, SEM_FLOOR)
  }
  return { score, se }
}

/* Is this interest profile signal or noise?

   A one-way ANOVA across the six scales separates the three failure modes
   from each other and from a real profile: straight-lining shows as zero
   total spread, an indiscriminate responder shows as F below 1 (the six
   types are literally indistinguishable), and a genuine profile shows as
   between-type variance dominating within-type variance.

   The two constants are the F(5,12) critical values. No library needed. */
export function interestQuality (answers) {
  const groups = TYPES.map(t => []).map((_, i) => {
    const t = TYPES[i]
    return RIASEC_ITEMS.map((item, n) => (item.t === t ? answers?.[n] : null))
      .filter(v => v !== null && v !== undefined)
  })
  const all = groups.flat()
  if (!all.length) return { verdict: 'unanswered', F: 0, eta2: 0, distinct: 0, maxRun: 0 }

  const grand = all.reduce((a, b) => a + b, 0) / all.length
  let ssB = 0, ssW = 0
  for (const g of groups) {
    if (!g.length) continue
    const m = g.reduce((a, b) => a + b, 0) / g.length
    ssB += g.length * (m - grand) ** 2
    ssW += g.reduce((a, x) => a + (x - m) ** 2, 0)
  }
  const dfB = groups.filter(g => g.length).length - 1
  const dfW = all.length - groups.filter(g => g.length).length
  const F = ssW > 0 && dfB > 0 && dfW > 0 ? (ssB / dfB) / (ssW / dfW) : (ssB > 0 ? Infinity : 0)

  let run = 1, maxRun = 1
  all.forEach((x, i) => { run = i && x === all[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run) })

  const distinct = new Set(all).size
  const verdict =
    distinct === 1 ? 'flat' :       // every answer identical — no information at all
    F >= 3.11 ? 'clear' :           // p < .05
    F >= 2.39 ? 'weak' :            // p < .10
    'noisy'

  return { F, eta2: (ssB + ssW) ? ssB / (ssB + ssW) : 0, distinct, maxRun, verdict }
}

/* Centre a six-type vector on its own mean and report its spread.
   Centring is what removes acquiescence: adding a constant to every answer
   leaves the centred vector unchanged, so "strongly like everything" and
   "slightly like everything" produce the same — empty — profile. */
function centred (vec) {
  const vals = TYPES.map(t => vec[t] ?? 0)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const dev = vals.map(v => v - mean)
  const sd = Math.sqrt(dev.reduce((a, x) => a + x * x, 0) / vals.length)
  return { dev, sd }
}

/* Correlation between the person's interest shape and the field's, mapped
   from [-1, 1] onto [0, 1].

   Returns null when the person's profile has no shape to match — which is
   the honest answer for someone who answered everything the same way.
   Downstream, a null interest fit drops the interest term entirely and the
   results page says why, rather than handing that respondent a perfect
   score on all seventeen fields as the previous weighted-mean did. */
export function riasecFit (userScore, field) {
  const u = centred(userScore)
  const f = centred(field.riasec)
  if (u.sd < 0.08 || f.sd === 0) return null
  const cov = u.dev.reduce((a, x, i) => a + x * f.dev[i], 0) / TYPES.length
  return clamp01((cov / (u.sd * f.sd) + 1) / 2)
}

/* ------------------------------------------------------------------
   Knowledge
------------------------------------------------------------------ */

/* The domain vector, unadorned. What someone says they have done is the
   only knowledge input; inferring competence from enthusiasm is exactly
   the move this tool exists to refuse. */
export function scoreDomains (levels) {
  return Object.fromEntries(
    DOMAIN_KEYS.map(k => [k, Math.max(0, Math.min(4, levels?.[k] ?? 0))])
  )
}

/* Fit as one minus a criticality-weighted shortfall.

   The previous version computed Σ d·min(1, u/d) / Σd, in which the d and
   the 1/d cancel — leaving Σ min(u, d) / Σd, where the demand vector acted
   only as a per-domain ceiling and never as an importance weight. A
   one-level hole cost the same whether it sat in a domain the field
   demands at 3 or at 0.5, so breadth beat depth and a person who had
   merely READ ABOUT all twelve domains outranked a genuine specialist in
   the field's own core.

   Weighting the shortfall by d, and normalising by Σd², prices a hole by
   how much the field actually leans on that domain. Range is exactly
   [0, 1]: shortfall never exceeds d, so Σd·shortfall never exceeds Σd². */
export function domainFit (userDomains, field) {
  let shortfall = 0, norm = 0
  for (const k of DOMAIN_KEYS) {
    const d = field.entryDemand[k] ?? 0
    if (d <= 0) continue
    shortfall += d * Math.max(0, d - (userDomains[k] ?? 0))
    norm += d * d
  }
  return norm ? clamp01(1 - shortfall / norm) : 0
}

/* ------------------------------------------------------------------
   Feasibility — its own axis, never a haircut on fit
------------------------------------------------------------------ */

/* "Does this suit me" and "can I survive the wait" are different
   questions, and the old code multiplied them together into one number
   that answered neither. Worse, it was inert: measured against the real
   catalogue the multiplier was exactly 1.000 for three of the four money
   answers, so a screen promising "this changes the recommendation more
   than anything else" changed nothing at all for most respondents.

   Measured from the MIDPOINT of the ramp rather than its optimistic end,
   and allowed to reach zero. */
const midMonths = f => (f.months[0] + f.months[1]) / 2

export function feasibility (field, horizon) {
  const over = midMonths(field) - horizon
  return clamp01(1 - Math.max(0, over) / Math.max(12, horizon))
}

/* ------------------------------------------------------------------
   Field ranking
------------------------------------------------------------------ */

/* First-order error propagation by numerical sensitivity: perturb each
   input by one standard error, measure how far the fit moves, and combine
   the movements in quadrature. Deterministic, no simulation, and simple
   enough to state on the method page in one sentence — which matters more
   than elegance for a number whose whole job is to be trusted. */
function fitError (userScore, userSe, domains, field, interestUsable) {
  const base = fitOf(userScore, domains, field, interestUsable)
  let sumSq = 0

  // Symmetric. A one-sided bump understates the error badly wherever the
  // response is flat in one direction — someone who already clears a demand
  // sees no change from perturbing upward, which would report near-perfect
  // precision for what is still a self-rating.
  const swing = (lo, hi) => (Math.abs(hi - base) + Math.abs(lo - base)) / 2

  if (interestUsable) {
    for (const t of TYPES) {
      const sd = userSe[t] ?? SEM_FLOOR
      const up = fitOf({ ...userScore, [t]: Math.min(1, (userScore[t] ?? 0) + sd) }, domains, field, true)
      const down = fitOf({ ...userScore, [t]: Math.max(0, (userScore[t] ?? 0) - sd) }, domains, field, true)
      sumSq += swing(down, up) ** 2
    }
  }
  for (const k of DOMAIN_KEYS) {
    if ((field.entryDemand[k] ?? 0) <= 0) continue
    const up = fitOf(userScore, { ...domains, [k]: Math.min(4, (domains[k] ?? 0) + SE_LEVEL) }, field, interestUsable)
    const down = fitOf(userScore, { ...domains, [k]: Math.max(0, (domains[k] ?? 0) - SE_LEVEL) }, field, interestUsable)
    sumSq += swing(down, up) ** 2
  }
  return Math.sqrt(sumSq)
}

function fitOf (userScore, domains, field, interestUsable) {
  const dFit = domainFit(domains, field)
  if (!interestUsable) return dFit
  const rFit = riasecFit(userScore, field)
  if (rFit === null) return dFit
  return W_KNOWLEDGE * dFit + W_INTEREST * rFit
}

/**
 * @param {object} riasec  the {score, se} object from scoreRiasec
 * @param {object} domains domain key → 0-4
 * @param {object} ikigai  { cause, moneyHorizon }
 */
export function scoreFields (riasec, domains, ikigai) {
  const horizon = ikigai?.moneyHorizon ?? 18
  const userScore = riasec.score ?? riasec
  const userSe = riasec.se ?? {}

  // One decision for the whole ranking, not per field: does this person's
  // interest profile have any shape at all?
  const interestUsable = FIELDS.some(f => riasecFit(userScore, f) !== null)

  const scored = FIELDS.map(field => {
    const dFit = domainFit(domains, field)
    const rFit = interestUsable ? riasecFit(userScore, field) : null
    const score = fitOf(userScore, domains, field, interestUsable)

    return {
      ...field,
      score,
      se: fitError(userScore, userSe, domains, field, interestUsable),
      feasibility: feasibility(field, horizon),
      // Same basis as the feasibility meter — the expected time, not the best
      // case and not the worst. Flagging on the upper bound while metering on
      // the midpoint let a card show a full runway meter directly above a
      // warning that the runway was too short.
      runwayRisk: midMonths(field) > horizon,
      horizon,
      interestUsable,
      parts: { knowledge: dFit, interest: rFit, feasibility: feasibility(field, horizon) },
    }
  })

  // Deterministic tie-break, so two fields that score identically do not
  // swap places on the strength of their order in data.js.
  return scored.sort((a, b) => b.score - a.score || a.months[0] - b.months[0] || a.key.localeCompare(b.key))
}

/* Which fields are statistically indistinguishable from the top one.
   Two fields separated by less than the combined error of the two
   measurements are not ranked — they are tied, and the page must say so
   rather than presenting an arbitrary winner as an answer. */
export function tiedWithTop (fields) {
  if (!fields.length) return []
  const top = fields[0]
  return fields.filter(f => f !== top && top.score - f.score < Math.hypot(top.se, f.se))
}

/* ------------------------------------------------------------------
   Tiers
------------------------------------------------------------------ */

/* The level the evidence actually supports. Shared with flameIndex so the
   headline number and the badges below it can never tell different stories. */
export function effectiveLevel (level, hasEvidence) {
  const claimed = Math.min(4, Math.max(0, Math.round(level ?? 0)))
  if (claimed <= 1) return claimed
  return hasEvidence ? claimed : claimed - 1
}

/* Evidence CAPS a claim. It does not promote one.

   The previous table promoted on evidence, so "practised it — small things
   of my own" plus one self-ticked box returned Flame, whose text reads
   "the working knowledge three to four years of full-time study is meant
   to produce". Both the intro and the evidence screen promised the
   opposite behaviour in as many words.

   Reading the claimed tier straight off LEVEL_SCALE also makes each tier's
   blurb describe the level that earns it. This deflates most people by
   about a rung. That is the point, and it is what the copy already said. */
export function tierFor (level, hasEvidence, teaches) {
  const claimed = Math.min(4, Math.max(0, Math.round(level ?? 0)))
  if (claimed === 0) return TIERS[0]
  if (claimed === 1) return TIERS[1]                       // Spark needs no proof
  const capped = effectiveLevel(claimed, hasEvidence)
  if (capped >= 4) return teaches ? TIERS[5] : TIERS[4]    // Beacon : Torch
  return TIERS[capped]                                     // Kindling : Flame
}

/* ------------------------------------------------------------------
   The headline number
------------------------------------------------------------------ */

/* A cubic power mean over evidence-adjusted levels.

   Two fixes over the old fixed weight vector. First it sees the evidence,
   so the page can no longer print 100 next to twelve badges that admit
   nothing was verified. Second, p = 3 actually delivers the depth
   preference the old comment claimed: one evidenced expert domain scores
   44 against 25 for twelve dabbled ones, where the old vector made that
   comparison 26 to 25 — a one-point "premium" that read as identical on
   screen and reversed outright two steps later.

   p is the only parameter, and it means something: p = 1 is a flat
   average, higher p weights the peaks. */
const DEPTH_EXPONENT = 3

/* The evidence cap applied continuously. tierFor rounds, because tiers are
   discrete; the index must not, or a half-level perturbation crosses a
   rounding boundary and moves a whole tier, and the error estimate below
   ends up measuring that discretisation rather than measurement error.
   On integer input this agrees exactly with effectiveLevel. */
const cappedLevel = (level, hasEvidence) => {
  const v = Math.max(0, Math.min(4, level ?? 0))
  if (v <= 1) return v
  return hasEvidence ? v : Math.max(1, v - 1)
}

export function flameIndex (domains, evidence = new Set()) {
  const eff = DOMAIN_KEYS.map(k => cappedLevel(domains?.[k] ?? 0, evidence.has(k)))
  const mean = eff.reduce((a, e) => a + (e / 4) ** DEPTH_EXPONENT, 0) / eff.length
  return Math.round(100 * mean ** (1 / DEPTH_EXPONENT))
}

/* Same sensitivity method as the fit error, perturbed symmetrically so the
   estimate is not biased by the ceiling at level 4. A three-point swing on
   retest does not support printing a bare integer, so the UI prints a band. */
export function flameError (domains, evidence = new Set()) {
  const base = flameIndex(domains, evidence)
  let sumSq = 0
  for (const k of DOMAIN_KEYS) {
    const up = flameIndex({ ...domains, [k]: Math.min(4, (domains[k] ?? 0) + SE_LEVEL) }, evidence)
    const down = flameIndex({ ...domains, [k]: Math.max(0, (domains[k] ?? 0) - SE_LEVEL) }, evidence)
    sumSq += ((Math.abs(up - base) + Math.abs(down - base)) / 2) ** 2
  }
  return Math.round(Math.sqrt(sumSq))
}

/* ------------------------------------------------------------------
   The learning path
------------------------------------------------------------------ */

/* Only domains the field genuinely leans on can appear, and a gap is
   priced in hours rather than in levels — because "0 → 3 in Craft" and
   "2 → 3 in Data" are printed in the same visual language while being a
   multi-year apprenticeship and a few months of evenings respectively. */
const CORE_DEMAND = 2
const HOURS_PER_WEEK = 15

const interpolate = (hours, x) => {
  const i = Math.min(hours.length - 2, Math.max(0, Math.floor(x)))
  return hours[i] + (hours[i + 1] - hours[i]) * (x - i)
}

export function gapsFor (field, domains) {
  return DOMAIN_KEYS
    .map(key => {
      const domain = DOMAINS.find(d => d.key === key)
      const want = field.entryDemand[key] ?? 0
      const have = domains[key] ?? 0
      const hours = Math.round(interpolate(domain.hours, want) - interpolate(domain.hours, have))
      return {
        key,
        label: domain.label,
        have,
        want,
        gap: want - have,
        hours: Math.max(0, hours),
        months: Math.max(1, Math.round(Math.max(0, hours) / (HOURS_PER_WEEK * 4.33))),
        priority: (want - have) * want,
      }
    })
    // A gap only earns a place if the field really leans on it, and starting
    // a whole domain from nothing is only worth naming when it is central.
    .filter(g => g.gap > 0.4 && g.want >= CORE_DEMAND && !(g.have === 0 && g.want < 3))
    .sort((a, b) => b.priority - a.priority)
}

/* ------------------------------------------------------------------
   Honesty checks
------------------------------------------------------------------ */

/* What the ikigai answers contradict, said out loud rather than quietly
   added to the score.

   Someone who says people come to them for explaining things, but rates
   Teaching & People at "read about it", has told you two different things.
   Naming that is more useful than splitting the difference — and it is the
   moment the assessment stops feeling like a quiz and starts feeling like
   it is actually reading what you wrote. */
export function consistencyFlags (levels, ikigai) {
  const expected = {}
  for (const key of ikigai?.goodAt || []) {
    const tag = ACTIVITIES.find(a => a.key === key)
    if (!tag) continue
    for (const [d, w] of Object.entries(tag.domains)) {
      if (w >= 2) expected[d] = Math.max(expected[d] ?? 0, w)
      if (!expected[d]) expected[d] = expected[d] ?? 0
    }
  }
  return Object.entries(expected)
    .filter(([d, w]) => w >= 2 && (levels?.[d] ?? 0) <= 1)
    .map(([d]) => ({
      domain: d,
      label: DOMAINS.find(x => x.key === d).label,
      claimed: ACTIVITIES.find(a => (a.domains[d] ?? 0) >= 2 && (ikigai.goodAt || []).includes(a.key))?.label,
      rated: levels?.[d] ?? 0,
    }))
    .filter(f => f.claimed)
}

/* The one reliability statistic a consumer instrument can honestly
   establish without a backend: does the result survive a retake?

   The answers are already written to localStorage on capture and were
   never read back, so the whole stability story was being discarded for
   free. A profile that holds across three months is worth more than one
   that does not, and saying so is simultaneously the honesty proof and
   the reason to come back. */
export function stability (prior, now, nowMs) {
  if (!prior?.answers?.levels || !now?.levels) return null
  const agree = DOMAIN_KEYS.filter(k => (prior.answers.levels[k] ?? 0) === (now.levels[k] ?? 0)).length
  const shifts = DOMAIN_KEYS.map(k => Math.abs((now.levels[k] ?? 0) - (prior.answers.levels[k] ?? 0)))
  const then = Date.parse(prior.savedAt)
  return {
    days: Number.isFinite(then) ? Math.round((nowMs - then) / 864e5) : null,
    agree,
    of: DOMAIN_KEYS.length,
    meanShift: shifts.reduce((a, b) => a + b, 0) / shifts.length,
    topFieldHeld: prior.topFields?.[0] === now.topFields?.[0],
    flameDelta: now.flame - prior.flame,
  }
}

/* The honest part of the ikigai read: where the rings actually overlap. */
export function ikigaiRead (ikigai) {
  const loves = new Set(ikigai?.loves || [])
  const goodAt = new Set(ikigai?.goodAt || [])
  const overlap = [...loves].filter(k => goodAt.has(k))
  const labelOf = k => ACTIVITIES.find(a => a.key === k)?.label ?? k

  let verdict
  if (overlap.length >= 3) {
    verdict = 'What you enjoy and what people rely on you for are largely the same activities. That is rarer than it sounds, and it argues for going deeper where you already are rather than starting somewhere new.'
  } else if (overlap.length >= 1) {
    verdict = 'Part of what you enjoy is also what people come to you for; part of it has never been tested in front of anyone. The untested part is where the next few months should go — not because it is your passion, but because you do not yet know whether you are any good at it.'
  } else {
    verdict = 'Nothing you chose as enjoyable is also something people come to you for. That split is worth taking seriously: it usually means either the enjoyable thing has never been done in public, or the thing you are good at was chosen for you. Which of those it is changes what to do next.'
  }

  return { overlap: overlap.map(labelOf), verdict, count: overlap.length }
}
