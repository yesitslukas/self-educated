/**
 * Self-educated — email + profile capture into a Google Sheet.
 *
 * SETUP (5 minutes, once):
 *  1. Create a new Google Sheet. Name the first tab "signups".
 *  2. Extensions → Apps Script. Delete the placeholder, paste this file in.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as:        Me
 *       Who has access:    Anyone
 *     (It must be "Anyone" — "Anyone with Google account" blocks the page.)
 *  4. Copy the /exec URL it gives you.
 *  5. Paste it into CAPTURE_ENDPOINT at the top of assets/app.js, commit, push.
 *
 * Re-deploying after an edit: Deploy → Manage deployments → pencil icon →
 * Version "New version" → Deploy. The URL stays the same. Creating a *new*
 * deployment instead gives you a new URL and silently breaks the site.
 */

const SHEET_NAME = 'signups'

const HEADERS = [
  'timestamp', 'email', 'flame', 'topFields', 'cause', 'money',
  'loves', 'goodAt', 'evidence', 'teaches', 'levels', 'riasec', 'userAgent',
]

function doPost (e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const sheet = getSheet_()

    sheet.appendRow([
      new Date(),                          // server time, not the client's
      data.email || '',
      data.flame ?? '',
      (data.topFields || []).join(', '),
      data.answers?.cause || '',
      data.answers?.money || '',
      (data.answers?.loves || []).join(', '),
      (data.answers?.goodAt || []).join(', '),
      (data.answers?.evidence || []).join(', '),
      (data.answers?.teaches || []).join(', '),
      JSON.stringify(data.answers?.levels || {}),
      JSON.stringify(data.riasec || {}),
      data.userAgent || '',
    ])

    return json_({ ok: true })
  } catch (err) {
    // Never lose a signup to a schema change — park the raw payload instead.
    try {
      getSheet_('errors').appendRow([new Date(), String(err), e?.postData?.contents || ''])
    } catch (_) {}
    return json_({ ok: false, error: String(err) })
  }
}

/** Lets you open the /exec URL in a browser to check it is alive. */
function doGet () {
  return json_({ ok: true, service: 'self-educated capture' })
}

function getSheet_ (name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const target = name || SHEET_NAME
  let sheet = ss.getSheetByName(target)
  if (!sheet) {
    sheet = ss.insertSheet(target)
    if (!name) sheet.appendRow(HEADERS)
  }
  if (!name && sheet.getLastRow() === 0) sheet.appendRow(HEADERS)
  return sheet
}

function json_ (obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
