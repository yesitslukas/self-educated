/* ------------------------------------------------------------------
   Scoring. Pure functions — no DOM in here, so this is the part that
   moves server-side later when results need to be saved and verified.
------------------------------------------------------------------ */
import { DOMAINS, ACTIVITIES, FIELDS, RIASEC_ITEMS, TIERS } from './data.js'

const DOMAIN_KEYS = DOMAINS.map(d => d.key)
const clamp01 = n => Math.max(0, Math.min(1, n))

/* RIASEC: 3 items per type, 0–3 each → 0–1 per type. */
export function scoreRiasec (answers) {
  const sum = {}, count = {}
  RIASEC_ITEMS.forEach((item, i) => {
    const v = answers[i] ?? 0
    sum[item.t] = (sum[item.t] || 0) + v
    count[item.t] = (count[item.t] || 0) + 1
  })
  const out = {}
  for (const t of Object.keys(sum)) out[t] = sum[t] / (count[t] * 3)
  return out
}

/* The radar polygon: self-rated level 0–4 per domain, nudged upward by
   what the ikigai tags revealed. Someone who says they lose hours in
   numbers but rated finance a 1 probably is not a 1. Capped so the
   nudge can never invent competence out of nothing. */
export function scoreDomains (levels, ikigai) {
  const nudge = {}
  const add = (tags, weight) => {
    for (const key of tags) {
      const tag = ACTIVITIES.find(a => a.key === key)
      if (!tag) continue
      for (const [d, w] of Object.entries(tag.domains)) {
        nudge[d] = (nudge[d] || 0) + w * weight
      }
    }
  }
  add(ikigai.loves || [], 0.10)   // enjoyment is weak evidence of skill
  add(ikigai.goodAt || [], 0.22)  // "people come to me for it" is stronger

  const out = {}
  for (const key of DOMAIN_KEYS) {
    const base = levels[key] ?? 0
    // A nudge can lift you at most one third of a tier, and never off zero.
    const lift = base === 0 ? 0 : Math.min(0.34, nudge[key] || 0)
    out[key] = Math.min(4, base + lift)
  }
  return out
}

/* Tier per domain. Evidence (something public and real) is what
   separates "I have practised" from "I have shipped". */
export function tierFor (level, hasEvidence, teaches) {
  const base = Math.round(level)
  if (base <= 0) return TIERS[0]
  if (base === 1) return TIERS[1]                            // Spark
  if (base === 2) return hasEvidence ? TIERS[3] : TIERS[2]   // Flame : Kindling
  if (base === 3) return hasEvidence ? TIERS[4] : TIERS[3]   // Torch : Flame
  if (!hasEvidence) return TIERS[3]                          // claimed 4, no proof → Flame
  return teaches ? TIERS[5] : TIERS[4]                       // Beacon : Torch
}

/* Cosine-style fit between the user's RIASEC vector and a field's. */
function riasecFit (user, field) {
  let dot = 0, mag = 0
  for (const [t, w] of Object.entries(field.riasec)) {
    dot += (user[t] ?? 0) * w
    mag += w
  }
  return mag ? dot / mag : 0
}

/* How much of what the field demands does the user already have?
   Weighted by demand, so being strong in a domain the field does not
   care about earns nothing. */
function domainFit (userDomains, field) {
  let have = 0, want = 0
  for (const key of DOMAIN_KEYS) {
    const d = field.demand[key] ?? 0
    if (d <= 0) continue
    want += d
    have += d * Math.min(1, (userDomains[key] ?? 0) / d)
  }
  return want ? have / want : 0
}

export function scoreFields (riasec, domains, ikigai) {
  const horizon = ikigai.moneyHorizon ?? 18

  const scored = FIELDS.map(field => {
    const rFit = riasecFit(riasec, field)
    const dFit = domainFit(domains, field)

    // Does the field touch the thing that bugs them about the world?
    const cause = field.causes.includes(ikigai.cause) ? 1 : 0

    const fit = 0.50 * rFit + 0.38 * dFit + 0.12 * cause

    // Time-to-income against the runway they say they have. This is a
    // multiplier, not another additive term: a field that cannot pay
    // inside someone's runway is the wrong answer however well it fits,
    // and an additive nudge is too weak to say so.
    const entry = field.months[0]
    const overshoot = clamp01((entry - horizon) / 18)
    const timing = 1 - 0.45 * overshoot

    return {
      ...field,
      score: clamp01(fit * timing),
      // Ranking alone will not stop someone with four months of runway from
      // chasing a three-year field, so the mismatch gets said out loud.
      runwayRisk: entry > horizon,
      horizon,
      parts: { interest: rFit, knowledge: dFit, timing, meaning: cause },
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}

/* The gap between what you have and what the top field wants —
   literally the learning path.

   Ranked by gap x demand, not by raw gap. A two-tier hole in a domain
   the field barely touches is not the thing to spend a year on; a
   one-tier hole in its core domain is. Domains the field only lightly
   needs are dropped entirely rather than ranked low, so the list never
   suggests a distraction. */
const CORE_DEMAND = 1.5

export function gapsFor (field, domains) {
  return DOMAIN_KEYS
    .map(key => {
      const want = field.demand[key] ?? 0
      const have = domains[key] ?? 0
      return {
        key,
        label: DOMAINS.find(d => d.key === key).label,
        have,
        want,
        gap: want - have,
        priority: (want - have) * want,
      }
    })
    .filter(g => g.gap > 0.4 && g.want >= CORE_DEMAND)
    .sort((a, b) => b.priority - a.priority)
}

/* Headline number: how lit up the profile is overall, 0–100.
   Deliberately rewards depth over breadth — a 4 and eleven 0s beats
   twelve 1s, because employers hire for depth. */
export function flameIndex (domains) {
  const vals = DOMAIN_KEYS.map(k => domains[k] ?? 0).sort((a, b) => b - a)
  const weights = [1, 0.8, 0.6, 0.45, 0.3, 0.22, 0.16, 0.12, 0.09, 0.06, 0.04, 0.02]
  let score = 0, max = 0
  vals.forEach((v, i) => { score += v * weights[i]; max += 4 * weights[i] })
  return Math.round((score / max) * 100)
}

/* The honest part of the ikigai read: where the rings actually overlap. */
export function ikigaiRead (ikigai) {
  const loves = new Set(ikigai.loves || [])
  const goodAt = new Set(ikigai.goodAt || [])
  const overlap = [...loves].filter(k => goodAt.has(k))
  const labelOf = k => ACTIVITIES.find(a => a.key === k)?.label ?? k

  let verdict
  if (overlap.length >= 3) {
    verdict = 'Strong. What you enjoy and what you are known for are the same thing — that is rarer than you think, and it means you should go deeper rather than wider.'
  } else if (overlap.length >= 1) {
    verdict = 'Partial. There is a real overlap to build on, but some of what you enjoy has never been tested in front of other people. That is the gap to close first.'
  } else {
    verdict = 'Split. What you love and what others rely on you for are currently two different lives. Neither answer is wrong — but the path is either monetising the love or making peace with the skill.'
  }

  return { overlap: overlap.map(labelOf), verdict, count: overlap.length }
}
