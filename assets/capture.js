/* ------------------------------------------------------------------
   Capture: local storage, and the POST to the Google Apps Script that
   writes into a Sheet.

   Set CAPTURE_ENDPOINT to the /exec URL of the deployed web app — the
   setup steps are in tools/sheet-capture.gs. While it is empty the
   results page does not ask for an email at all, rather than collecting
   addresses it has nowhere to put.
------------------------------------------------------------------ */

export const CAPTURE_ENDPOINT = ''
export const captureEnabled = CAPTURE_ENDPOINT !== ''

const KEY = 'selfeducated.profile'

/* Every storage call is wrapped. localStorage throws outright — not
   returns null — when a browser is set to block site data, and an
   unguarded setItem in an async handler becomes an unhandled rejection
   that silently kills the submit before any message is shown. */
export function readStored () {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function writeStored (payload) {
  try { localStorage.setItem(KEY, JSON.stringify(payload)); return true } catch { return false }
}

export function clearStored () {
  try { localStorage.removeItem(KEY) } catch {}
}

/* Apps Script is awkward to POST to from a browser: a JSON content-type
   triggers a CORS preflight it does not answer. The request therefore
   goes as text/plain — a "simple" request, no preflight — and the script
   parses the body itself.

   The opaque no-cors retry is a last resort and is reported as such.
   `fetch(url, {mode:'no-cors'})` resolves for ANY outcome including a 404
   or a redirect to a Google sign-in page, so treating it as success would
   let a misconfigured deployment record zeros while telling every visitor
   they were saved — which would quietly destroy the one experiment this
   page exists to run. */
export async function send (payload) {
  const body = JSON.stringify(payload)
  try {
    const res = await fetch(CAPTURE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    })
    if (!res.ok) return { ok: false, confirmed: true }
    const data = await res.json().catch(() => null)
    return { ok: data?.ok === true, confirmed: true }
  } catch {
    try {
      await fetch(CAPTURE_ENDPOINT, { method: 'POST', mode: 'no-cors', body })
      return { ok: true, confirmed: false }
    } catch {
      return { ok: false, confirmed: true }
    }
  }
}

/* Schema version is deliberate: the first thing wanted from this data
   will be re-scoring it with a corrected model, and that is impossible
   without knowing which version produced each row. `riasecRaw` exists
   for the same reason — the six aggregated type scores throw away the
   item-level resolution that any re-scoring or item analysis needs. */
export function buildPayload (email, state, results, nowISO) {
  return {
    v: 1,
    rubric: results.rubric,
    email,
    profile: results.domains,
    tiers: results.tiers,
    flame: results.flame,
    flameSe: results.flameSe,
    topFields: results.fields.slice(0, 3).map(f => f.key),
    interestQuality: results.quality.verdict,
    riasecScores: results.riasec.score,
    riasecRaw: state.riasec,
    answers: {
      loves: state.loves,
      goodAt: state.goodAt,
      cause: state.cause,
      money: state.money,
      levels: state.levels,
      evidence: [...state.evidence],
      teaches: [...state.teaches],
    },
    savedAt: nowISO,
  }
}
