# Self-educated — the knowledge-profile assessment

A free web assessment for people who learned outside university. It maps what you
have actually done across twelve domains, matches that against a rubric of what
seventeen fields ask of people entering them, and places you on a five-tier ladder
where every tier above the first requires evidence.

Live: <https://yesitslukas.github.io/self-educated/> · Method: [`method.html`](method.html)

## Run it

```bash
python3 .claude/serve.py 4321
```

Then open <http://localhost:4321>. No build step, no dependencies, no framework —
plain ES modules, which means it must be served over HTTP rather than opened as a
`file://`. The dev server sends `no-store` so module edits show up on reload.

```bash
node tests/run.mjs && node tests/views.mjs
```

Two suites, 69 tests, no dependencies.

`run.mjs` — 43 invariant tests over the scoring engine. They assert properties, not
pinned numbers, so they survive a re-weighting of the model, which is the point. A
block marked `REGRESSIONS` pins the specific defects found in the v1 audit; each of
those fails against the code as it was before.

`views.mjs` — 26 render tests. `views.js` is pure `(state) → HTML`, so every screen
the product can show is rendered in Node and checked for `undefined`, `NaN`,
unresolved templates, unbalanced tags, and the invariants that must survive any
copy edit: the disclaimer is on every results variant, no unevidenced claim shows a
Torch or Beacon badge, no protected title ever reaches the page, and no email is
requested while there is nowhere to send it. It covers ten profile shapes a browser
walkthrough would rarely reach by accident — the empty profile, the flat responder,
the maximal unevidenced profile, contradictory answers, and the blank state that
"Start over" leaves behind, which used to throw a TypeError one press of Back
later. Two of the checks are structural rather than about any one screen: the
page may never make an absolute storage claim (it once said "Nothing here is
stored anywhere" while writing every answer to sessionStorage), and `method.html`
may not quote tier wording that no longer exists in `data.js`.

## Files

| File | What lives there |
|---|---|
| `assets/data.js` | Questions, domains, tiers, and the seventeen fields. All content lives here. |
| `assets/scoring.js` | Pure scoring functions. No DOM — this is what moves server-side later. |
| `assets/views.js` | Pure `(state) → HTML` render functions. |
| `assets/radar.js` | The SVG chart, plus the one stylesheet the page and the PNG exporter share. |
| `assets/capture.js` | Storage and the POST to the Sheet. |
| `assets/export-png.js` | PNG export of the chart. |
| `assets/app.js` | State, routing, the render loop. |
| `method.html` | The public methodology. Keep it in sync with the code. |
| `tools/sheet-capture.gs` | The Apps Script that receives signups. |

## Two things to know before changing anything

**Bump the asset version.** `index.html` carries an import map pinning every module
to `?v=N`. Change a module and you must bump `N` in that map *and* on the
`<script>` and stylesheet tags, or visitors keep the old graph — GitHub Pages
serves assets with a ten-minute cache and browsers hold module graphs harder than
that.

**`method.html` is a promise.** It states the weights, the tier table and the
limitations. If you change the scoring, change that page in the same commit, or the
product starts lying about itself — which for this product is the only unrecoverable
failure.

## Design rules

Three token systems in `styles.css`, and nothing should sit outside them: a 1.25
modular type scale (`--t-xs` … `--t-4xl`, plus interpolated `--t-sm` and `--t-md`
where the scale's own gaps are too wide for UI), a 4px spacing grid (`--s-1` …
`--s-20`), and fourteen colour tokens per theme.

Two rules that are easy to undo by accident:

**Nothing a person is asked to read sits below `--t-base`.** 14px and below is for
UI chrome — counters, badges, metadata. An earlier version set forty of its
fifty-two font sizes at 14px or smaller, and that single fact was what made the
page look like a form rather than a document.

**Colours are measured, not eyeballed.** `--muted`, `--accent` and `--display`
against `--bg` and `--surface`, in both themes. Three tier badges were once
hardcoded hex outside the theme blocks and sat at 1.47:1 in light mode. If you
change a colour, compute the ratio again.

## What the scoring does, and why

The full version is on the method page. The short version, because these are the
decisions most likely to be undone by accident:

- **Interest matching centres both vectors on their own means.** Answering
  "strongly like" to all eighteen items therefore buys nothing. Before this, a
  straight-liner scored a perfect match on every single field.
- **Knowledge fit is a criticality-weighted shortfall**, not coverage. The previous
  form reduced algebraically to `Σmin(u,d)/Σd`, in which the demand vector was only
  a ceiling and never a weight — so someone who had merely *read about* all twelve
  domains outranked a genuine specialist in a field's own core.
- **Evidence caps a claim; it never promotes one.** Both the intro and the evidence
  screen promise this. The old table promoted, so "practised it — small things of my
  own" plus one self-ticked box returned a tier whose text claims the working
  knowledge of three to four years of study.
- **Nothing adjusts upward.** An earlier version added up to a third of a level based
  on what you said you enjoyed, in an instrument whose own screens promise levels are
  behavioural. Contradictions between sections are now shown to the user instead.
- **Every number carries its margin**, computed by perturbing each input by its own
  standard error and combining the movements in quadrature. The swing takes the
  LARGER of the two directions, not the average: `domainFit` is a hinge, so above
  the demand the upward perturbation moves nothing at all, and averaging that
  structural zero against real movement halves the estimate instead of removing
  the bias.
- **Ties are propagated through the difference, not combined as if independent.**
  Two fit scores are functions of the same twelve ratings and six interest scores,
  so `Math.hypot(a.se, b.se)` is the wrong formula. The tied set is also taken as
  the contiguous run from the top, because a pairwise test is not transitive and
  "these are tied for first" cannot skip the field ranked between them.

## Before this is shared widely

- [ ] **Wire `CAPTURE_ENDPOINT`** in `assets/capture.js`. While it is empty the
      results page deliberately does not ask for an email at all — collecting
      addresses the product cannot store, in exchange for a follow-up it cannot
      send, would cost more trust than it earns. Setup is in the header of
      [`tools/sheet-capture.gs`](tools/sheet-capture.gs).
- [ ] **Add operator identity** to the privacy line and the footer before the form
      goes live — a name and a contact address. Storing an email address without
      saying who is storing it is not GDPR-compliant.
- [ ] **Replace the field rubric with derived data.** The `entryDemand` vectors and
      the `months` ranges are an editorial judgement, labelled as such on the method
      page and versioned as `RUBRIC_VERSION`. The honest version comes from
      [O*NET's free downloads](https://www.onetcenter.org/database.html) joined on
      SOC codes, with the derivation script committed alongside.
- [ ] **`aiBand` is a three-way editorial judgement**, deliberately not a percentage,
      because nobody has measured what share of these occupations current AI performs.
      Do not turn it back into a number without a citation.

## Deploying

Static, so anything serves it. Live on GitHub Pages from `main`; every push
redeploys within about a minute.

**Custom domain**, once bought: add a `CNAME` file at the repo root containing the
bare domain, point a `CNAME` record for `www` at `yesitslukas.github.io` and the
apex `@` at GitHub's four A records (`185.199.108.153`, `.109.153`, `.110.153`,
`.111.153`), then tick "Enforce HTTPS" once the certificate is issued.

Pages stops being enough the moment you need accounts, saved profiles or payments:
it has no server, so there is nowhere to hold an API key or verify a Stripe webhook.
At that point move to Vercel (same repo, free tier, adds API routes). The Sheet
capture is deliberately the kind of thing thrown away at that step — it exists to
answer the validation question, not to be architecture.

## Naming — the one legal constraint

Do not rename the tiers, or anything else here, to **bachelor**, **master**,
**Magister**, **Diplom**, **degree** or **Meister**. All are protected titles in the
EU, the UK and the US; awarding one without accreditation is a criminal offence in
several countries, Germany included (§132a StGB). "Meister" rules out the
apprentice/journeyman/master guild ladder too. `Hochschule`, `Universität` and
`Akademie` are regionally restricted as well.

The substance survives the constraint intact, because the protected words all
describe **who granted the thing**. This platform does not grant a title — it
measures a capability. So each tier names the knowledge, and states what an
equivalent stretch of formal study is *meant* to produce:

| Tier | Names | Says |
|---|---|---|
| Spark | Survey knowledge | You can follow the conversation, not yet lead it |
| Kindling | Working knowledge | The grounding a first year of full-time study is meant to produce |
| Flame | Professional knowledge | The working knowledge three to four years of full-time study is meant to produce |
| Torch | Specialist knowledge | The depth a further specialist year after that is meant to produce |
| Beacon | Original knowledge | Past the point a course of study takes anyone |

**"is meant to produce" carries the legal weight.** It is a factual claim about the
intended substance of a course of study — provable, and not a claim to have awarded
anything. A test in `tests/run.mjs` fails if any tier naming a duration loses that
hedge, or if a protected title appears in a tier's text.

Which is the whole pitch in one line:

> **A degree proves you attended. This proves you can.**

Note the comparison is evidence, not price. Price is the weaker attack — public
university is close to free in Germany, so "a fraction of the cost" invites "mine was
free". The real cost of the degree is three years, and the real weakness is that
nobody checks whether it worked.
