# Self-educated — step 1: the free assessment

A single-purpose page that answers one question before anything else gets built:

> **Will people finish this, and will they hand over an email to keep the result?**

If yes, build the paid tier. If no, the concept needs reshaping — and you found
out in two weeks rather than six months.

## Run it

```bash
python3 -m http.server 4321 --directory .
```

Then open <http://localhost:4321>. No build step, no dependencies, no framework.
Plain ES modules — which means it must be served over HTTP, not opened as a `file://`.

## What it does

1. **Ikigai, four rings** — what you lose time in, what people come to you for,
   what bugs you about the world, and what money has to do for you right now.
   The overlap between rings one and two is reported honestly, including when
   there isn't one.
2. **RIASEC inventory** — 18 items, the same Holland taxonomy O\*NET uses, so
   results can be joined to real occupation data later.
3. **Twelve domains, self-rated behaviourally** — what you have *done*, not how
   good you feel. Nudged slightly by the ikigai answers, capped so the nudge can
   never invent competence.
4. **Evidence check** — claims you cannot point at are capped one tier lower.
   This is the difference between a credential and a personality quiz.
5. **Result** — flame index, the radar chart with your profile against what the
   matched field demands, ranked fields with time-to-income and AI exposure,
   tier placement, and the ranked gap list. Then email capture.

## Files

| File | What lives there |
|---|---|
| `assets/data.js` | All questions, domains, tiers and fields. Tune content here. |
| `assets/scoring.js` | Pure scoring functions. No DOM — this is what moves server-side later. |
| `assets/radar.js` | Hand-rolled SVG chart. No chart library, so it exports cleanly and never needs a CDN. |
| `assets/app.js` | Flow, rendering, email capture, PNG export. |
| `assets/styles.css` | Everything visual. Dark by default, light follows the OS. |

## Before this goes live

- [ ] **Wire `SUBSCRIBE_ENDPOINT`** in `assets/app.js`. Empty right now, so emails
      only reach `localStorage` — which means you learn nothing. Buttondown,
      ConvertKit and Formspree all take a plain JSON POST.
- [ ] **Replace the `aiExposure` numbers** in `data.js`. They are editorial
      placeholders so the UI could be built and tested. Real sources:
      [O\*NET](https://www.onetcenter.org/database.html) (free, occupation and task
      data, joins on SOC codes) and the Anthropic Economic Index (observed vs.
      theoretical AI coverage). Do not ship placeholders as if they were sourced.
- [ ] **Sanity-check `months` ranges per field** against your own market. They are
      estimates, and people will make decisions on them.
- [ ] Add a privacy line at the email capture — what you store, why, how to delete.
      Required under GDPR, and it measurably raises conversion anyway.

## Deploying

Static, so anything serves it. GitHub Pages works for **this step only** — push
to a repo, Settings → Pages → deploy from branch, point the custom domain's CNAME
at it.

It stops working the moment you need accounts, saved profiles or payments: Pages
has no server, so there is nowhere to hold an API key or verify a Stripe webhook.
At that point move to Vercel (same repo, free tier, gives you API routes) rather
than bolting a backend onto a static host.

## Naming — the one legal constraint

Do not rename the tiers, or anything else here, to **bachelor**, **master**,
**Magister**, **Diplom**, **degree** or **Meister**. All are protected titles in
the EU, the UK and the US; awarding one without accreditation is a criminal
offence in several countries, Germany included (§132a StGB). "Meister" rules out
the apprentice/journeyman/master guild ladder too, which is otherwise a natural
fit. `Hochschule`, `Universität` and `Akademie` are regionally restricted as well.

The substance survives the constraint intact, because the protected words all
describe **who granted the thing**. This platform does not grant a title — it
measures a capability. So each tier names the knowledge, and states what an
equivalent stretch of formal study is *meant* to produce:

| Tier | Names | Says |
|---|---|---|
| Spark | Survey knowledge | You can follow the conversation |
| Kindling | Working knowledge | Roughly a first year of study |
| Flame | Professional knowledge | The working knowledge a three-year course of study is meant to produce |
| Torch | Specialist knowledge | The depth a taught postgraduate year is meant to produce |
| Beacon | Original knowledge | You produce what others learn from |

**"is meant to produce" carries the legal weight.** It is a factual claim about
the intended substance of a course of study — provable, and not a claim to have
awarded anything. It also lands the sharper point for free: the degree only
intends it; this measures whether it happened.

Which is the whole pitch in one line:

> **A degree proves you attended. This proves you can.**

Note the comparison is evidence, not price. Price is the weaker attack — public
university is close to free in Germany, so "a fraction of the cost" invites
"mine was free". The real cost of the degree is three years, and the real
weakness is that nobody checks whether it worked.
