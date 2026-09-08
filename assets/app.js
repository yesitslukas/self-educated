/* ------------------------------------------------------------------
   Self-educated — flow, state and the render loop.

   The whole UI is re-rendered from strings on every state change, which
   is simple and fast enough at this size but has three consequences that
   have to be handled deliberately rather than ignored: focus is
   destroyed, scroll position is destroyed, and event listeners bound to
   replaced nodes are lost. Each is dealt with below.
------------------------------------------------------------------ */
import { DOMAINS, RIASEC_ITEMS, MONEY_MODES, RUBRIC_VERSION } from './data.js'
import {
  scoreRiasec, scoreDomains, scoreFields, flameIndex, flameError, tierFor,
  ikigaiRead, interestQuality, consistencyFlags, stability, tiedWithTop,
} from './scoring.js'
import * as views from './views.js'
import { captureEnabled, send, buildPayload, readStored, writeStored, clearStored } from './capture.js'
import { downloadChart } from './export-png.js'
import { radarCss } from './radar.js'

/* One source of truth for the chart's appearance: the page resolves the
   tokens through var(), the PNG exporter resolves the same stylesheet
   through getComputedStyle, so the download cannot drift from the screen. */
document.head.insertAdjacentHTML('beforeend', `<style>${radarCss(n => `var(${n})`)}</style>`)

const ITEMS_PER_PAGE = 6
const MONEY_HORIZON = Object.fromEntries(MONEY_MODES.map(m => [m.key, m.horizon]))

/* Derived from the data, never hard-coded: data.js promises its arrays can
   be tuned without touching app logic, and a hand-written [[0,6],[6,12],
   [12,18]] silently drops any nineteenth item that is ever added. */
const RIASEC_PAGES = Array.from(
  { length: Math.ceil(RIASEC_ITEMS.length / ITEMS_PER_PAGE) },
  (_, p) => [p * ITEMS_PER_PAGE, Math.min((p + 1) * ITEMS_PER_PAGE, RIASEC_ITEMS.length)]
)

const blankState = () => ({
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
})

let state = blankState()

const root = document.getElementById('app')
const bar = document.getElementById('progress-bar')
const count = document.getElementById('progress-count')
const live = document.getElementById('live')

/* ---------------------------------------------------------------- */
/* Steps                                                             */
/* ---------------------------------------------------------------- */

const riasecDone = page => {
  const [from, to] = RIASEC_PAGES[page]
  return state.riasec.slice(from, to).every(v => v !== null)
}

const steps = [
  { id: 'intro', render: () => views.renderIntro(), valid: () => true },
  {
    id: 'loves',
    render: () => views.renderPicker(state, 'loves', 'What do you lose track of time doing?',
      'Not what you are paid for. The thing you start, then look up and an hour is gone. Pick up to five.'),
    valid: () => state.loves.length > 0,
  },
  {
    id: 'goodAt',
    render: () => views.renderPicker(state, 'goodAt', 'What do people come to you for?',
      'The thing others ask you about, even informally. Be accurate rather than modest. Pick up to five.'),
    valid: () => state.goodAt.length > 0,
  },
  { id: 'cause', render: () => views.renderCause(state), valid: () => !!state.cause },
  { id: 'money', render: () => views.renderMoney(state), valid: () => !!state.money },
  ...RIASEC_PAGES.map((_, p) => ({
    id: `riasec${p}`,
    render: () => views.renderRiasec(state, RIASEC_PAGES, p),
    valid: () => riasecDone(p),
  })),
  {
    id: 'levels',
    render: () => views.renderLevels(state),
    valid: () => Object.values(state.levels).every(v => v !== null),
  },
  {
    id: 'evidence',
    render: () => views.renderEvidence(state),
    valid: () => true,
    // A step with nothing to ask is not a step. The person who reaches this
    // with nothing to evidence is the thin-profile respondent — the one least
    // in need of another screen telling them there is nothing here.
    skip: () => !DOMAINS.some(d => (state.levels[d.key] ?? 0) >= 2),
  },
  { id: 'results', render: () => views.renderResults(state.results), valid: () => true },
]

const RESULTS_STEP = steps.length - 1

/* ---------------------------------------------------------------- */
/* Computation                                                       */
/* ---------------------------------------------------------------- */

function compute () {
  const riasec = scoreRiasec(state.riasec)
  const domains = scoreDomains(state.levels)
  const ikigai = {
    loves: state.loves,
    goodAt: state.goodAt,
    cause: state.cause,
    moneyHorizon: MONEY_HORIZON[state.money] ?? 18,
  }

  const fields = scoreFields(riasec, domains, ikigai)
  const tied = tiedWithTop(fields, riasec, domains)
  const flame = flameIndex(domains, state.evidence)

  // The tier is the product's actual output, so it is computed here and
  // stored — not derived inside a template, where it could never be
  // recorded in the payload or re-scored later.
  const tiers = Object.fromEntries(DOMAINS.map(d =>
    [d.key, tierFor(domains[d.key], state.evidence.has(d.key), state.teaches.has(d.key)).key]))

  const ranked = Object.entries(riasec.score)
    .filter(([, v]) => v !== null)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)

  // The cause is a tie-break and a sentence, never a silent bonus: it
  // predicts whether someone is still doing this in year three, not
  // whether they can get in at all.
  const meaningful = tied.filter(f => f.causes.includes(state.cause))
  const causeNote = meaningful.length && state.cause
    ? `Of the fields this test cannot separate, <b>${meaningful[0].name}</b> is the one that touches what you said bugs you about the world. That is the difference that shows up in year three rather than year one.`
    : ''

  const prior = readStored()

  state.results = {
    rubric: RUBRIC_VERSION,
    date: new Date().toISOString().slice(0, 10),
    riasec,
    quality: interestQuality(state.riasec),
    topTypes: ranked.slice(0, 2),
    domains,
    tiers,
    fields,
    tied,
    flame,
    flameSe: flameError(domains, state.evidence),
    ikigai: ikigaiRead(ikigai),
    flags: consistencyFlags(state.levels, ikigai),
    causeNote,
    captureEnabled,
    // Nobody who has practised nothing can be told what they are good at.
    thin: Object.values(state.levels).every(v => (v ?? 0) < 2),
    stability: prior
      ? stability(prior, { levels: state.levels, topFields: fields.map(f => f.key), flame }, Date.now())
      : null,
  }

  // Keep the finished run in this browser whether or not an address was
  // given. Retest stability is browser-local either way, and gating the write
  // on the capture endpoint meant the comparison never ran for anyone. The
  // results page states plainly that this is kept and how to remove it.
  writeStored(buildPayload(null, state, state.results, new Date().toISOString()))
}


/* ---------------------------------------------------------------- */
/* Render                                                            */
/* ---------------------------------------------------------------- */

let lastStep = -1
let announced = -1

function render () {
  const step = steps[state.step]
  if (step.id === 'results' && !state.results) compute()

  // Remember what had focus so a keyboard user is not thrown back to the
  // top of the document after every single answer.
  const active = document.activeElement
  const focusKey = active && active !== document.body
    ? JSON.stringify({ ...active.dataset })
    : null

  const chromeless = step.id === 'results' || step.id === 'intro'
  root.innerHTML = step.render() + (chromeless ? '' : navHtml(step))

  // Restore focus only WITHIN a step. Across a step change the matching
  // dataset belongs to a different question, and the new Continue is disabled
  // and cannot take focus — which is how a keyboard user landed on
  // document.body once per screen.
  const sameStep = state.step === lastStep
  if (sameStep && focusKey) {
    const match = [...root.querySelectorAll('button')]
      .find(el => JSON.stringify({ ...el.dataset }) === focusKey)
    match?.focus({ preventScroll: true })
  }

  // Scroll only when the step actually changed. Scrolling on every state
  // change means answering question ten on a phone throws the page back
  // to question one.
  if (state.step !== lastStep) {
    lastStep = state.step
    window.scrollTo({ top: 0, behavior: 'instant' })
    root.querySelector('h1, h2')?.focus?.({ preventScroll: true })
  }

  const progress = state.step / (steps.length - 1)
  bar.style.width = `${progress * 100}%`
  count.textContent = state.step === 0 ? ''
    : state.step === RESULTS_STEP ? 'Done'
    : `Step ${state.step} of ${steps.length - 2}`

  // Announce the step, not the screen. The whole of #app used to be a polite
  // live region, so every one of the ~44 answers re-queued all sixty controls.
  if (state.step !== announced) {
    announced = state.step
    live.textContent = state.step === RESULTS_STEP
      ? 'Your results are ready.'
      : `${root.querySelector('h1, h2')?.textContent ?? ''}. ${count.textContent}`
  }

  if (step.id === 'results' && captureEnabled) {
    document.getElementById('capture')?.addEventListener('submit', onCapture)
  }
  persist()
}

function navHtml (step) {
  const ok = step.valid()
  const next = steps[state.step + 1]
  return `
    <nav class="nav">
      <button class="btn btn-ghost" data-action="back">Back</button>
      <button class="btn btn-primary" data-action="next" aria-disabled="${!ok}">
        ${next?.id === 'results' ? 'See my profile' : 'Continue'}
      </button>
    </nav>`
}

/* ---------------------------------------------------------------- */
/* Navigation                                                        */
/* ---------------------------------------------------------------- */

function go (delta, viaHistory) {
  if (delta > 0 && !steps[state.step].valid()) return
  let next = state.step + delta
  while (steps[next]?.skip?.()) next += delta
  if (next < 0 || next >= steps.length) return
  state.step = next
  if (!viaHistory) {
    try { history.pushState({ step: next }, '', `#${steps[next].id}`) } catch {}
  }
  render()
}

/* History can point at a step the current answers no longer support — most
   obviously after "Start over", whose pushState leaves the finished run's
   entries behind it on the stack, so one press of Back lands compute() on an
   empty questionnaire. go() guards forward moves with valid(); popstate skips
   that guard, so clamp it to the first step that is not yet answered. */
const furthestValid = () => {
  for (let i = 0; i < steps.length; i++) if (!steps[i].valid()) return i
  return steps.length - 1
}

window.addEventListener('popstate', e => {
  const step = e.state?.step
  const want = Number.isInteger(step) && step >= 0 && step < steps.length ? step : 0
  state.step = Math.min(want, furthestValid())
  render()
})

/* Any change to an answer invalidates the cached result. Previously this
   happened only on backward navigation, which was correct only because
   results was a dead end — adding a "Change an answer" button to that
   screen would otherwise have started showing people stale profiles. */
const dirty = () => { state.results = null }

/* ---------------------------------------------------------------- */
/* Events — one delegated listener, since the DOM is replaced wholesale */
/* ---------------------------------------------------------------- */

root.addEventListener('click', e => {
  const el = e.target.closest('button')
  // A <button> with no type attribute reports type "submit", so testing
  // el.type here would skip every control in the assessment. The capture
  // form has its own submit handler; scope the exclusion to that form.
  if (!el || el.disabled || el.closest('#capture')) return

  const d = el.dataset

  // A disabled button explains nothing on a 2,166px screen. Keep it
  // focusable, and on a premature press take the reader to the answer that
  // is actually missing.
  if (d.action === 'next' && !steps[state.step].valid()) {
    const missing = root.querySelector('[data-missing]')
    if (missing) {
      missing.scrollIntoView({ block: 'center', behavior: 'smooth' })
      missing.querySelector('button')?.focus({ preventScroll: true })
    }
    return
  }
  if (d.action === 'next') return go(1)
  if (d.action === 'back') return go(-1)
  if (d.action === 'restart') return restart()
  if (d.action === 'rest-none') {
    // "Nothing" is the floor of the scale, so this can only ever lower a
    // profile — it cannot be used to inflate one.
    for (const dm of DOMAINS) if (state.levels[dm.key] === null) state.levels[dm.key] = 0
    dirty()
    return render()
  }
  if (d.action === 'download') {
    return downloadChart(root.querySelector('svg.radar'), (msg, ok) => {
      const note = document.getElementById('export-note')
      if (!note) return
      note.textContent = msg
      note.className = `export-note ${ok ? 'is-ok' : 'is-warn'}`
    })
  }

  if (d.pick) {
    const list = state[d.pick]
    const i = list.indexOf(d.key)
    if (i >= 0) list.splice(i, 1)
    else if (list.length < views.MAX_PICKS) list.push(d.key)
    dirty()
    return render()
  }

  // No auto-advance: every other screen in the flow is confirmed with
  // Continue, and a single-select that jumps forward on its own denies
  // people the chance to change their mind.
  if (d.single) { state[d.single] = d.key; dirty(); return render() }

  if (d.riasec) { state.riasec[Number(d.riasec)] = Number(d.val); dirty(); return render() }

  if (d.level) {
    const k = d.level
    state.levels[k] = Number(d.val)
    // Prune at the point of truth. The evidence screen only renders
    // domains at level 2+, so lowering a level afterwards would otherwise
    // strand a tick the user can no longer see or remove — and it would
    // still be written into the captured dataset.
    if (state.levels[k] < 2) state.evidence.delete(k)
    if (state.levels[k] < 4) state.teaches.delete(k)
    dirty()
    return render()
  }

  if (d.evidence) {
    const k = d.evidence
    if (state.evidence.has(k)) { state.evidence.delete(k); state.teaches.delete(k) }
    else state.evidence.add(k)
    dirty()
    return render()
  }

  if (d.teaches) {
    const k = d.teaches
    state.teaches.has(k) ? state.teaches.delete(k) : state.teaches.add(k)
    dirty()
    return render()
  }
})

/* role="radiogroup" is a contract: one tab stop for the group, arrows to move
   within it. Sixty separately-tabbable radios is not a radiogroup, it is sixty
   buttons wearing the wrong role — and crossing the levels screen by keyboard
   took sixty presses of Tab. */
root.addEventListener('keydown', e => {
  const el = e.target.closest('[role="radio"]')
  if (!el) return
  const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!dir) return
  e.preventDefault()
  const group = el.closest('[role="radiogroup"]')
  if (!group) return
  const radios = [...group.querySelectorAll('[role="radio"]')]
  const next = radios[(radios.indexOf(el) + dir + radios.length) % radios.length]
  next?.focus({ preventScroll: true })
  next?.click()
})

function restart () {
  state = blankState()
  lastStep = -1
  // Do not leave the previous person's email and full profile behind on a
  // shared machine.
  clearStored()
  clearSession()
  try { history.pushState({ step: 0 }, '', '#intro') } catch {}
  render()
}

/* ---------------------------------------------------------------- */
/* Session persistence — a refresh must not cost 25 answers            */
/* ---------------------------------------------------------------- */

const SESSION_KEY = 'selfeducated.session'

function persist () {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...state,
      results: null,
      evidence: [...state.evidence],
      teaches: [...state.teaches],
    }))
  } catch {}
}

function clearSession () {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

function rehydrate () {
  let saved
  try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return }
  if (!saved || !Number.isInteger(saved.step) || saved.step < 0) return
  // Validate rather than trust: a stale shape from an older deploy must not
  // brick the page.
  try {
    state = {
      ...blankState(),
      ...saved,
      step: Math.min(Math.max(0, saved.step), steps.length - 1),
      riasec: Array.isArray(saved.riasec) && saved.riasec.length === RIASEC_ITEMS.length
        ? saved.riasec : Array(RIASEC_ITEMS.length).fill(null),
      levels: { ...Object.fromEntries(DOMAINS.map(d => [d.key, null])), ...(saved.levels || {}) },
      evidence: new Set(saved.evidence || []),
      teaches: new Set(saved.teaches || []),
      results: null,
    }
  } catch { state = blankState() }

  // A step restored from an older deploy can point past answers this build no
  // longer has — a changed RIASEC_ITEMS length resets that whole section.
  // Walk back to the first step that is not satisfied.
  for (let i = 0; i <= state.step; i++) {
    if (!steps[i].valid()) { state.step = i; break }
  }
}

/* ---------------------------------------------------------------- */
/* Capture                                                           */
/* ---------------------------------------------------------------- */

async function onCapture (e) {
  e.preventDefault()
  const note = document.getElementById('capture-note')
  const btn = e.target.querySelector('button')
  const email = new FormData(e.target).get('email')
  const payload = buildPayload(email, state, state.results, new Date().toISOString())

  const localSaved = writeStored(payload)

  btn.disabled = true
  note.textContent = 'Saving…'
  note.className = 'capture-note'

  const { ok, confirmed } = await send(payload)
  btn.disabled = false

  if (ok && confirmed) {
    note.textContent = 'Saved. You will hear from us once — when there is a version where someone else checks the evidence.'
    note.className = 'capture-note is-ok'
    e.target.reset()
  } else if (ok) {
    note.textContent = 'Sent, but this browser would not let us read the confirmation. If you hear nothing, open an issue on the repository linked in the footer.'
    note.className = 'capture-note is-warn'
  } else {
    note.textContent = localSaved
      ? 'Could not reach the server. Your answers are still in this browser, so nothing is lost — try again in a moment.'
      : 'Could not reach the server, and this browser is blocking local storage. Download the chart before you close the tab.'
    note.className = 'capture-note is-warn'
  }
}

/* ---------------------------------------------------------------- */

rehydrate()
try { history.replaceState({ step: state.step }, '', `#${steps[state.step].id}`) } catch {}
render()
