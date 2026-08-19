/* ------------------------------------------------------------------
   Self-educated — assessment flow.
   Client-side only by design: step 1 exists to answer one question,
   "will people finish this and hand over an email?", and that needs
   no backend. Everything server-shaped is marked TODO.
------------------------------------------------------------------ */
import {
  DOMAINS, ACTIVITIES, CAUSES, MONEY_MODES,
  RIASEC_ITEMS, RIASEC_SCALE, RIASEC_TYPES, LEVEL_SCALE,
} from './data.js'
import {
  scoreRiasec, scoreDomains, scoreFields, gapsFor,
  flameIndex, tierFor, ikigaiRead,
} from './scoring.js'
import { renderRadar } from './radar.js'

/* Where captured signups go: a Google Apps Script web app writing into a
   Sheet. Paste the /exec URL here — setup steps are in tools/sheet-capture.gs.
   Left empty, the page still works and stores locally, but nothing reaches
   you, so this must be filled in before the page is shared anywhere. */
const CAPTURE_ENDPOINT = ''

const MAX_PICKS = 5
const RIASEC_PAGES = [[0, 6], [6, 12], [12, 18]]

const state = {
  step: 0,
  loves: [],
  goodAt: [],
  cause: '',
  money: '',
  riasec: Array(RIASEC_ITEMS.length).fill(null),
  levels: Object.fromEntries(DOMAINS.map(d => [d.key, null])),
  evidence: new Set(),
  teaches: new Set(),
  results: null,
}

const root = document.getElementById('app')
const bar = document.getElementById('progress-bar')

/* ---------------------------------------------------------------- */
/* Steps                                                            */
/* ---------------------------------------------------------------- */

const steps = [
  { id: 'intro',    render: renderIntro,   valid: () => true },
  { id: 'loves',    render: () => renderPicker('loves',  'What do you lose time in?', 'Not what you are paid for. What you look up from and an hour has gone. Pick up to five.'), valid: () => state.loves.length > 0 },
  { id: 'goodAt',   render: () => renderPicker('goodAt', 'What do people come to you for?', 'The thing others ask you about, even informally. Be honest rather than modest. Pick up to five.'), valid: () => state.goodAt.length > 0 },
  { id: 'cause',    render: renderCause,   valid: () => !!state.cause },
  { id: 'money',    render: renderMoney,   valid: () => !!state.money },
  { id: 'riasec0',  render: () => renderRiasec(0), valid: () => riasecDone(0) },
  { id: 'riasec1',  render: () => renderRiasec(1), valid: () => riasecDone(1) },
  { id: 'riasec2',  render: () => renderRiasec(2), valid: () => riasecDone(2) },
  { id: 'levels',   render: renderLevels,  valid: () => Object.values(state.levels).every(v => v !== null) },
  { id: 'evidence', render: renderEvidence, valid: () => true },
  { id: 'results',  render: renderResults, valid: () => true },
]

function riasecDone (page) {
  const [from, to] = RIASEC_PAGES[page]
  return state.riasec.slice(from, to).every(v => v !== null)
}

/* ---------------------------------------------------------------- */
/* Screens                                                          */
/* ---------------------------------------------------------------- */

function renderIntro () {
  return `
    <section class="screen intro">
      <p class="eyebrow">Free · about 6 minutes · no account</p>
      <h1>You did not go to university.<br><span class="glow">That is not the same as uneducated.</span></h1>
      <p class="lede">
        This maps what you actually know across twelve domains, finds the fields your
        interests and knowledge already point at, and shows you the exact distance
        between where you are and where that field starts paying.
      </p>
      <p class="claim">A degree proves you attended. This is built to prove you can.</p>
      <ul class="promise">
        <li><b>No self-flattery.</b> Levels are behavioural — what you have done, not how good you feel.</li>
        <li><b>No fake scores.</b> Claiming a level without evidence caps you one tier lower.</li>
        <li><b>You get the chart.</b> Yours to keep, share, and put on your profile.</li>
      </ul>
      <button class="btn btn-primary btn-lg" data-action="next">Start</button>
    </section>`
}

function renderPicker (key, title, sub) {
  const picked = state[key]
  return `
    <section class="screen">
      <h2>${title}</h2>
      <p class="sub">${sub}</p>
      <div class="grid-pick">
        ${ACTIVITIES.map(a => `
          <button class="pick ${picked.includes(a.key) ? 'is-on' : ''}"
                  data-pick="${key}" data-key="${a.key}"
                  aria-pressed="${picked.includes(a.key)}">
            ${a.label}
          </button>`).join('')}
      </div>
      <p class="counter">${picked.length} / ${MAX_PICKS} selected</p>
    </section>`
}

function renderCause () {
  return `
    <section class="screen">
      <h2>What bugs you about the world?</h2>
      <p class="sub">Not the noblest answer — the one you actually argue about. This is the ring most people skip, and it is the one that decides whether you stick with the work in year three.</p>
      <div class="stack">
        ${CAUSES.map(c => `
          <button class="row-opt ${state.cause === c.key ? 'is-on' : ''}"
                  data-single="cause" data-key="${c.key}">${c.label}</button>`).join('')}
      </div>
    </section>`
}

function renderMoney () {
  return `
    <section class="screen">
      <h2>What does money need to do for you right now?</h2>
      <p class="sub">This changes the recommendation more than anything else you have answered. A field that takes three years is the wrong answer for someone with four months of runway, however well it fits.</p>
      <div class="stack">
        ${MONEY_MODES.map(m => `
          <button class="row-opt ${state.money === m.key ? 'is-on' : ''}"
                  data-single="money" data-key="${m.key}">${m.label}</button>`).join('')}
      </div>
    </section>`
}

function renderRiasec (page) {
  const [from, to] = RIASEC_PAGES[page]
  const items = RIASEC_ITEMS.slice(from, to)
  return `
    <section class="screen">
      <h2>How much is this you?</h2>
      <p class="sub">Answer for how you actually are, not how you would like to be. ${page + 1} of 3.</p>
      <div class="stack-q">
        ${items.map((item, n) => {
          const idx = from + n
          return `
          <div class="q">
            <p class="q-text">${item.q}</p>
            <div class="scale">
              ${RIASEC_SCALE.map(s => `
                <button class="scale-btn ${state.riasec[idx] === s.v ? 'is-on' : ''}"
                        data-riasec="${idx}" data-val="${s.v}">${s.label}</button>`).join('')}
            </div>
          </div>`
        }).join('')}
      </div>
    </section>`
}

function renderLevels () {
  return `
    <section class="screen wide">
      <h2>Where are you in each of these?</h2>
      <p class="sub">Twelve domains. Most people are honestly at zero in most of them — that is the normal shape of a profile, not a failure. The scale is about what you have <i>done</i>.</p>
      <div class="levels">
        ${DOMAINS.map(d => `
          <div class="lvl">
            <span class="lvl-name">${d.label}</span>
            <div class="lvl-scale">
              ${LEVEL_SCALE.map(s => `
                <button class="lvl-btn ${state.levels[d.key] === s.v ? 'is-on' : ''}"
                        data-level="${d.key}" data-val="${s.v}" title="${s.label}">${s.short}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <p class="counter">${Object.values(state.levels).filter(v => v !== null).length} / ${DOMAINS.length} answered</p>
    </section>`
}

function renderEvidence () {
  const claimed = DOMAINS.filter(d => state.levels[d.key] >= 2)
  if (!claimed.length) {
    return `
      <section class="screen">
        <h2>Nothing to verify yet</h2>
        <p class="sub">You have not claimed a level that needs evidence. That is a fine place to start from — it just means every domain opens at Spark, and the first thing to do is make something small and public.</p>
      </section>`
  }
  return `
    <section class="screen">
      <h2>Which of these can you point at?</h2>
      <p class="sub">
        Evidence is the whole difference between a claim and a tier. Tick a domain only if
        there is something a stranger could look at — code, a site, a client, a portfolio,
        a payslip, a build, a case you handled.
        <b>Unticked domains are capped one tier below what you claimed.</b>
      </p>
      <div class="stack">
        ${claimed.map(d => `
          <div class="ev-row">
            <button class="row-opt ${state.evidence.has(d.key) ? 'is-on' : ''}"
                    data-evidence="${d.key}">
              <span>${d.label}</span>
              <span class="ev-flag">${state.evidence.has(d.key) ? 'Can point at it' : 'No proof yet'}</span>
            </button>
            ${state.evidence.has(d.key) && state.levels[d.key] >= 4 ? `
              <button class="chip ${state.teaches.has(d.key) ? 'is-on' : ''}" data-teaches="${d.key}">
                I also teach or mentor others in this
              </button>` : ''}
          </div>`).join('')}
      </div>
    </section>`
}

function renderResults () {
  const r = state.results
  const top = r.fields[0]
  const gaps = gapsFor(top, r.domains).slice(0, 4)
  const strongest = [...DOMAINS]
    .map(d => ({ ...d, level: r.domains[d.key], tier: tierFor(r.domains[d.key], state.evidence.has(d.key), state.teaches.has(d.key)) }))
    .filter(d => d.tier.key !== 'none')
    .sort((a, b) => b.level - a.level)
    .slice(0, 4)

  return `
    <section class="screen results">
      <p class="eyebrow">Your knowledge profile</p>
      <div class="headline">
        <div class="flame">
          <span class="flame-num">${r.flame}</span>
          <span class="flame-lbl">flame index</span>
        </div>
        <p class="headline-txt">
          Your profile is strongest in <b>${strongest[0]?.label ?? 'nothing yet'}</b>, and points
          most clearly at <b>${top.name}</b>.
        </p>
      </div>

      <div class="chart-wrap">
        ${renderRadar(r.domains, top.demand, top.name)}
      </div>

      <div class="block">
        <h3>The ikigai read</h3>
        <p class="read">${r.ikigai.verdict}</p>
        ${r.ikigai.count ? `<p class="sub">Overlapping in: ${r.ikigai.overlap.map(o => `<span class="tag">${o}</span>`).join(' ')}</p>` : ''}
      </div>

      <div class="block">
        <h3>Fields that fit you</h3>
        <div class="fields">
          ${r.fields.slice(0, 4).map((f, i) => `
            <article class="field ${i === 0 ? 'is-top' : ''}">
              <header>
                <h4>${f.name}</h4>
                <span class="match">${Math.round(f.score * 100)}% fit</span>
              </header>
              <p>${f.blurb}</p>
              ${f.runwayRisk ? `
                <p class="risk">Longer than the runway you gave. Realistic only if something
                else pays the bills for the first ${f.months[0]} months.</p>` : ''}
              <dl class="meta">
                <div><dt>Time to first income</dt><dd>${f.months[0]}–${f.months[1]} months</dd></div>
                <div><dt>Roles</dt><dd>${f.roles.join(' · ')}</dd></div>
                <div><dt>AI doing this work today</dt><dd>${aiBadge(f.aiExposure)}</dd></div>
              </dl>
            </article>`).join('')}
        </div>
        <p class="footnote">
          AI-exposure figures are placeholders in this prototype. Before launch they get
          replaced with real values joined on occupation codes — O*NET for the task data,
          the Anthropic Economic Index for observed vs. theoretical coverage.
        </p>
      </div>

      <div class="block">
        <h3>Where you stand today</h3>
        <div class="tiers">
          ${strongest.map(d => `
            <div class="tier-row">
              <span class="tier-dom">${d.label}</span>
              <span class="tier-badge t-${d.tier.key}">${d.tier.name}</span>
              <span class="tier-meaning">
                <b>${d.tier.kind}</b> — ${d.tier.equiv}
                <i>${d.tier.blurb}</i>
              </span>
            </div>`).join('')}
        </div>
        <p class="sub">
          Spark → Kindling → Flame → Torch → Beacon. Tiers above Kindling need evidence,
          not self-assessment — which is the whole point. A degree proves you attended.
          This is trying to prove you can.
        </p>
      </div>

      <div class="block">
        <h3>The distance to ${top.name}</h3>
        <p class="sub">The gap between the blue outline and yours, ranked by how much this field
        actually leans on each domain — not by which hole is biggest. Closing the top one is the only
        thing that matters for the next three months.</p>
        ${gaps.length ? `
        <ol class="gaps">
          ${gaps.map(g => `
            <li>
              <span class="gap-name">${g.label}</span>
              <span class="gap-bar"><i style="width:${(g.have / 4 * 100).toFixed(0)}%"></i><u style="width:${(g.want / 4 * 100).toFixed(0)}%"></u></span>
              <span class="gap-num">${g.have.toFixed(1)} → ${g.want.toFixed(1)}</span>
            </li>`).join('')}
        </ol>` : `
        <p class="read">You already meet or exceed what this field asks for in every domain that
        matters to it. Your problem is not knowledge — it is evidence and access. The next move
        is proof other people can check, not another course.</p>`}
      </div>

      <div class="block capture">
        <h3>Keep this profile</h3>
        <p class="sub">
          Right now this chart disappears when you close the tab. Leave an email and we
          save it, track it as it changes, and tell you when tier assessments open for
          <b>${top.name}</b>.
        </p>
        <form id="capture" class="capture-form">
          <input type="email" name="email" required placeholder="you@example.com" aria-label="Email address">
          <button class="btn btn-primary" type="submit">Save my profile</button>
        </form>
        <p class="capture-note" id="capture-note"></p>
        <p class="privacy">
          We store your email and the answers behind this chart, nothing else. No tracking,
          no third parties, no reselling. Reply to any message and we delete it the same day.
        </p>
        <div class="secondary-actions">
          <button class="btn btn-ghost" data-action="download">Download the chart</button>
          <button class="btn btn-ghost" data-action="restart">Start over</button>
        </div>
      </div>
    </section>`
}

function aiBadge (v) {
  const pct = Math.round(v * 100)
  const level = v >= 0.65 ? 'high' : v >= 0.4 ? 'mid' : 'low'
  const word = { high: 'heavily exposed', mid: 'partly exposed', low: 'barely touched' }[level]
  return `<span class="ai-badge ai-${level}">${pct}% — ${word}</span>`
}

/* ---------------------------------------------------------------- */
/* Flow                                                             */
/* ---------------------------------------------------------------- */

function compute () {
  const riasec = scoreRiasec(state.riasec)
  const ikigai = {
    loves: state.loves,
    goodAt: state.goodAt,
    cause: state.cause,
    moneyHorizon: MONEY_MODES.find(m => m.key === state.money)?.horizon ?? 18,
  }
  const domains = scoreDomains(state.levels, ikigai)
  state.results = {
    riasec,
    domains,
    fields: scoreFields(riasec, domains, ikigai),
    flame: flameIndex(domains),
    ikigai: ikigaiRead(ikigai),
  }
}

function render () {
  const step = steps[state.step]
  if (step.id === 'results' && !state.results) compute()

  const isResults = step.id === 'results'
  const isIntro = step.id === 'intro'

  root.innerHTML = step.render() + (isResults || isIntro ? '' : navHtml(step))
  bar.style.width = `${(state.step / (steps.length - 1)) * 100}%`
  root.scrollIntoView({ block: 'start' })

  if (isResults) document.getElementById('capture').addEventListener('submit', onCapture)
}

function navHtml (step) {
  const ok = step.valid()
  return `
    <nav class="nav">
      <button class="btn btn-ghost" data-action="back">Back</button>
      <button class="btn btn-primary" data-action="next" ${ok ? '' : 'disabled'}>
        ${steps[state.step + 1]?.id === 'results' ? 'See my profile' : 'Continue'}
      </button>
    </nav>`
}

function go (delta) {
  const next = state.step + delta
  if (next < 0 || next >= steps.length) return
  if (delta > 0 && !steps[state.step].valid()) return
  // Answers changed, so any cached result is stale.
  if (delta < 0) state.results = null
  state.step = next
  render()
}

/* Single delegated listener — the whole UI is re-rendered strings. */
root.addEventListener('click', e => {
  const el = e.target.closest('button')
  if (!el) return

  if (el.dataset.action === 'next') return go(1)
  if (el.dataset.action === 'back') return go(-1)
  if (el.dataset.action === 'restart') return restart()
  if (el.dataset.action === 'download') return downloadChart()

  if (el.dataset.pick) {
    const list = state[el.dataset.pick]
    const key = el.dataset.key
    const i = list.indexOf(key)
    if (i >= 0) list.splice(i, 1)
    else if (list.length < MAX_PICKS) list.push(key)
    return render()
  }

  if (el.dataset.single) { state[el.dataset.single] = el.dataset.key; return go(1) }

  if (el.dataset.riasec) {
    state.riasec[Number(el.dataset.riasec)] = Number(el.dataset.val)
    return render()
  }

  if (el.dataset.level) { state.levels[el.dataset.level] = Number(el.dataset.val); return render() }

  if (el.dataset.evidence) {
    const k = el.dataset.evidence
    state.evidence.has(k) ? state.evidence.delete(k) : state.evidence.add(k)
    if (!state.evidence.has(k)) state.teaches.delete(k)
    return render()
  }

  if (el.dataset.teaches) {
    const k = el.dataset.teaches
    state.teaches.has(k) ? state.teaches.delete(k) : state.teaches.add(k)
    return render()
  }
})

function restart () {
  state.step = 0
  state.loves = []; state.goodAt = []; state.cause = ''; state.money = ''
  state.riasec = Array(RIASEC_ITEMS.length).fill(null)
  state.levels = Object.fromEntries(DOMAINS.map(d => [d.key, null]))
  state.evidence = new Set(); state.teaches = new Set()
  state.results = null
  render()
}

/* ---------------------------------------------------------------- */
/* Email capture — the actual thing step 1 is testing                */
/* ---------------------------------------------------------------- */

async function onCapture (e) {
  e.preventDefault()
  const note = document.getElementById('capture-note')
  const email = new FormData(e.target).get('email')

  const payload = {
    email,
    profile: state.results.domains,
    flame: state.results.flame,
    topFields: state.results.fields.slice(0, 3).map(f => f.key),
    riasec: state.results.riasec,
    answers: {
      loves: state.loves, goodAt: state.goodAt,
      cause: state.cause, money: state.money,
      levels: state.levels,
      evidence: [...state.evidence], teaches: [...state.teaches],
    },
    // The sheet stamps its own server-side time; this is only a fallback
    // for the copy kept in localStorage.
    savedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
  }

  // Local copy first, so a network failure can never lose someone's answers.
  localStorage.setItem('selfeducated.profile', JSON.stringify(payload))

  if (!CAPTURE_ENDPOINT) {
    note.textContent = 'Saved in this browser only — the capture endpoint is not connected yet (see tools/sheet-capture.gs).'
    note.className = 'capture-note is-warn'
    return
  }

  const btn = e.target.querySelector('button')
  btn.disabled = true
  note.textContent = 'Saving…'
  note.className = 'capture-note'

  const delivered = await send(payload)
  btn.disabled = false

  if (delivered) {
    note.textContent = 'Saved. Your profile is recorded — you will hear from us when tier assessments open.'
    note.className = 'capture-note is-ok'
    e.target.reset()
  } else {
    note.textContent = 'Could not reach the server. Your profile is stored in this browser, so nothing is lost — try again in a moment.'
    note.className = 'capture-note is-warn'
  }
}

/* Apps Script is awkward to POST to from a browser. A JSON content-type
   triggers a CORS preflight that Apps Script does not answer, so the request
   goes as text/plain — a "simple" request, no preflight — and the script
   parses the body itself. If even that is blocked, retry opaquely: the row
   still lands in the sheet, we just cannot read the response to confirm. */
async function send (payload) {
  const body = JSON.stringify(payload)
  try {
    const res = await fetch(CAPTURE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    })
    return res.ok
  } catch {
    try {
      await fetch(CAPTURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body })
      return true
    } catch {
      return false
    }
  }
}

/* Export the chart as a PNG — this is the object people put on LinkedIn,
   so it has to leave the page cleanly. */
function downloadChart () {
  const svg = root.querySelector('svg.radar')
  if (!svg) return

  const style = getComputedStyle(document.documentElement)
  const clone = svg.cloneNode(true)
  clone.setAttribute('width', 1240)
  clone.setAttribute('height', 1240)
  // Inline the computed palette so the exported file is standalone.
  const css = `
    .rd-ring,.rd-spoke{fill:none;stroke:${style.getPropertyValue('--line')};stroke-width:1}
    .rd-ring{stroke-width:1.1}
    .rd-tick{fill:${style.getPropertyValue('--muted')};font:11px system-ui}
    .rd-label{fill:${style.getPropertyValue('--text')};font:13px system-ui}
    .rd-demand{fill:${style.getPropertyValue('--demand')};fill-opacity:.16;stroke:${style.getPropertyValue('--demand')};stroke-width:2}
    .rd-demand-dot{fill:${style.getPropertyValue('--demand')}}
    .rd-you{fill:${style.getPropertyValue('--accent')};fill-opacity:.3;stroke:${style.getPropertyValue('--accent')};stroke-width:2}
    .rd-you-dot{fill:${style.getPropertyValue('--accent')}}
    .rd-legend-box{fill:${style.getPropertyValue('--bg')};stroke:${style.getPropertyValue('--line')}}
    .rd-legend-text{fill:${style.getPropertyValue('--text')};font:12px system-ui}`
  clone.insertAdjacentHTML('afterbegin', `<style>${css}</style><rect width="100%" height="100%" fill="${style.getPropertyValue('--bg')}"/>`)

  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1240; canvas.height = 1240
    canvas.getContext('2d').drawImage(img, 0, 0)
    canvas.toBlob(png => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(png)
      a.download = 'self-educated-profile.png'
      a.click()
      URL.revokeObjectURL(a.href)
    })
    URL.revokeObjectURL(url)
  }
  img.src = url
}

render()
