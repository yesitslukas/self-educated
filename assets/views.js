/* ------------------------------------------------------------------
   Views. Pure functions of (state, results) → HTML string.

   Nothing here touches the network, storage or the DOM, so a view can be
   rendered and inspected without a browser.
------------------------------------------------------------------ */
import {
  DOMAINS, ACTIVITIES, CAUSES, MONEY_MODES, TIERS,
  RIASEC_ITEMS, RIASEC_SCALE, RIASEC_TYPES, LEVEL_SCALE, RUBRIC_VERSION,
} from './data.js'
import { gapsFor, tierFor, W_KNOWLEDGE, W_INTEREST } from './scoring.js'
import { renderRadar } from './radar.js'

export const MAX_PICKS = 5

/* Escape anything that could carry markup. Nothing user-typed reaches a
   view today, but a template-literal renderer that has never escaped is
   one feature away from an injection. */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/* A five-segment meter. Deliberately not a number: the underlying
   measurement does not support two significant figures, and a bar says
   "roughly this much" in a way that "68%" does not. */
const meter = (v, label) => {
  const filled = Math.round(Math.max(0, Math.min(1, v ?? 0)) * 5)
  return `<span class="meter" role="img" aria-label="${esc(label)}: ${filled} out of 5">${
    Array.from({ length: 5 }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('')
  }</span>`
}

/* "A and B" for two, "A, B and C" beyond — the previous join produced
   "A and B, C", and field names must stay comma-free for it to read at all. */
const prose = names => names.length === 1
  ? `<b>${names[0]}</b>`
  : `<b>${names.slice(0, -1).join('</b>, <b>')}</b> and <b>${names[names.length - 1]}</b>`

const COUNT_WORD = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five' }

const AI_WORDS = {
  high: 'Software already drafts much of the routine output here',
  mid: 'Software does parts of it — the judgement and the relationship work, not yet',
  low: 'Little of it can be automated — physical, licensed, or done in person',
}

/* ---------------------------------------------------------------- */
/* Intro                                                             */
/* ---------------------------------------------------------------- */

export function renderIntro () {
  return `
    <section class="screen intro">
      <p class="eyebrow">Free · about 7 minutes · no account</p>
      <h1>Nobody wrote down what you learned.<br><span class="glow">This does.</span></h1>
      <p class="lede">
        This maps what you actually know across twelve domains, finds the fields your
        knowledge and interests already point at, and shows the distance between where
        you are and where those fields start hiring.
      </p>
      <p class="claim">A degree records where you studied. This records what you have built — and what is still missing.</p>
      <ul class="promise">
        <li><b>It asks what you made, not how you feel.</b> Every question is about work that exists — something you built, shipped, or were paid for.</li>
        <li><b>Unproven claims do not count.</b> If you cannot point at something a stranger could look at, the level below is the one that stands.</li>
        <li><b>It tells you when it does not know.</b> Two fields too close to call are reported as a tie, not dressed up as a winner.</li>
      </ul>

      <details class="method">
        <summary>How this is scored</summary>
        <div class="method-body">
          <p><b>The eighteen interest questions</b> are a RIASEC inventory — the six-type model
          (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) that the US
          Department of Labor's O*NET database uses to describe every occupation it lists. The
          model has been in use and under test since 1959. Eighteen items is a screener, not the
          full instrument: O*NET's own short form uses sixty. That limit is why your results come
          with a margin of error rather than a bare ranking.</p>
          <p><b>The twelve ratings</b> are your own, and nobody has checked them. They are asked
          behaviourally — what you have made, not how competent you feel — because that is the
          only self-report question people answer with any accuracy.</p>
          <p><b>The field matching</b> compares your knowledge against a written rubric of what
          each field asks of people entering it, weighted ${Math.round(W_KNOWLEDGE * 100)}%
          knowledge and ${Math.round(W_INTEREST * 100)}% interest. That rubric is an editorial
          judgement, published as ${RUBRIC_VERSION} so it can be argued with — not measured data.</p>
          <p><a href="method.html">The full method, in detail →</a></p>
        </div>
      </details>

      <button class="btn btn-primary btn-lg" data-action="next">Start</button>
    </section>`
}

/* ---------------------------------------------------------------- */
/* Questions                                                         */
/* ---------------------------------------------------------------- */

export function renderPicker (state, key, title, sub) {
  const picked = state[key]
  const full = picked.length >= MAX_PICKS
  return `
    <section class="screen">
      <h2 tabindex="-1">${title}</h2>
      <p class="sub">${sub}</p>
      <div class="grid-pick" role="group" aria-label="${esc(title)}">
        ${ACTIVITIES.map(a => {
          const on = picked.includes(a.key)
          // Disabled rather than a silent no-op: clicking a sixth tile and
          // having nothing happen at all reads as a broken page.
          return `
          <button class="pick${on ? ' is-on' : ''}" data-pick="${key}" data-key="${a.key}"
                  aria-pressed="${on}"${!on && full ? ' disabled' : ''}>${a.label}</button>`
        }).join('')}
      </div>
      <p class="counter">${picked.length} of ${MAX_PICKS} chosen${full ? ' — deselect one to swap' : ''}</p>
    </section>`
}

export function renderCause (state) {
  return `
    <section class="screen">
      <h2 tabindex="-1">What bugs you about the world?</h2>
      <p class="sub">Not the noblest answer — the one you actually argue about. This does not change
      your score. It decides which of two close fields gets recommended, because it predicts whether
      you are still doing this in year three.</p>
      <div class="stack" role="radiogroup" aria-label="What bugs you about the world">
        ${CAUSES.map(c => `
          <button class="row-opt${state.cause === c.key ? ' is-on' : ''}" role="radio"
                  aria-checked="${state.cause === c.key}"
                  data-single="cause" data-key="${c.key}">${c.label}</button>`).join('')}
      </div>
    </section>`
}

export function renderMoney (state) {
  return `
    <section class="screen">
      <h2 tabindex="-1">What does money need to do for you right now?</h2>
      <p class="sub">A field that takes three years is the wrong answer for someone with four months
      of savings, however well it fits. This is reported as its own line on every result rather than
      folded into the score, so you can see the trade instead of having it made for you.</p>
      <div class="stack" role="radiogroup" aria-label="What money needs to do">
        ${MONEY_MODES.map(m => `
          <button class="row-opt${state.money === m.key ? ' is-on' : ''}" role="radio"
                  aria-checked="${state.money === m.key}"
                  data-single="money" data-key="${m.key}">${m.label}</button>`).join('')}
      </div>
    </section>`
}

export function renderRiasec (state, pages, page) {
  const [from, to] = pages[page]
  return `
    <section class="screen">
      <h2 tabindex="-1">How much would you enjoy this?</h2>
      <p class="sub">Not whether you are good at it, and not whether it pays — only whether you would
      like doing it. Answer for how you actually are. Page ${page + 1} of ${pages.length}.</p>
      <div class="stack-q">
        ${RIASEC_ITEMS.slice(from, to).map((item, n) => {
          const idx = from + n
          return `
          <div class="q">
            <p class="q-text" id="q${idx}">${item.q}</p>
            <div class="scale" role="radiogroup" aria-labelledby="q${idx}">
              ${RIASEC_SCALE.map(s => `
                <button class="scale-btn${state.riasec[idx] === s.v ? ' is-on' : ''}" role="radio"
                        aria-checked="${state.riasec[idx] === s.v}"
                        data-riasec="${idx}" data-val="${s.v}">${s.label}</button>`).join('')}
            </div>
          </div>`
        }).join('')}
      </div>
    </section>`
}

export function renderLevels (state) {
  const answered = Object.values(state.levels).filter(v => v !== null).length
  return `
    <section class="screen wide">
      <h2 tabindex="-1">What have you actually done in each of these?</h2>
      <p class="sub">Twelve domains. Most people are honestly at nothing in most of them — that is the
      normal shape of a profile, not a failure. Answer for what you have <i>made</i>, not what you have
      an opinion about.</p>
      <div class="levels">
        ${DOMAINS.map(d => `
          <div class="lvl">
            <span class="lvl-name" id="lvl-${d.key}">${d.label}</span>
            <div class="lvl-scale" role="radiogroup" aria-labelledby="lvl-${d.key}">
              ${LEVEL_SCALE.map(s => `
                <button class="lvl-btn${state.levels[d.key] === s.v ? ' is-on' : ''}" role="radio"
                        aria-checked="${state.levels[d.key] === s.v}"
                        data-level="${d.key}" data-val="${s.v}" title="${esc(s.label)}">${s.short}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <p class="counter">${answered} of ${DOMAINS.length} answered</p>
    </section>`
}

export function renderEvidence (state) {
  const claimed = DOMAINS.filter(d => state.levels[d.key] >= 2)
  if (!claimed.length) {
    return `
      <section class="screen">
        <h2 tabindex="-1">Nothing to verify yet</h2>
        <p class="sub">You have not claimed a level that needs proof, so nothing here gets capped.
        The first move is to make one small thing a stranger could look at: practised, plus something
        to point at, is Kindling.</p>
      </section>`
  }
  return `
    <section class="screen">
      <h2 tabindex="-1">Which of these could a stranger check?</h2>
      <p class="sub">
        Evidence is the difference between a claim and a tier. Tick a domain only if something exists
        that someone else could look at — code, a site, a client, a portfolio, a payslip, a building,
        a case you handled. <b>Untick and the level below is what counts.</b> Nobody is checking these
        today; ticking one is a statement you are making, and the results page says so.
      </p>
      <div class="stack">
        ${claimed.map(d => `
          <div class="ev-row">
            <button class="row-opt${state.evidence.has(d.key) ? ' is-on' : ''}"
                    aria-pressed="${state.evidence.has(d.key)}" data-evidence="${d.key}">
              <span>${d.label}</span>
              <span class="ev-flag">${state.evidence.has(d.key) ? 'Something exists' : 'Nothing to point at'}</span>
            </button>
            ${state.evidence.has(d.key) && state.levels[d.key] >= 4 ? `
              <button class="chip${state.teaches.has(d.key) ? ' is-on' : ''}"
                      aria-pressed="${state.teaches.has(d.key)}" data-teaches="${d.key}">
                I also teach or mentor others in this
              </button>` : ''}
          </div>`).join('')}
      </div>
    </section>`
}

/* ---------------------------------------------------------------- */
/* Results                                                           */
/* ---------------------------------------------------------------- */

function fieldCard (f, rank, tied) {
  return `
    <article class="field${rank === 0 ? ' is-top' : ''}${tied ? ' is-tied' : ''}">
      <header>
        <h4>${f.name}</h4>
        <span class="rank">#${rank + 1}</span>
      </header>
      <p class="field-blurb">${f.blurb}</p>
      ${f.runwayRisk && rank === 0 ? `
        <p class="risk">Typically takes longer than the time you said you have. Realistic only if
        something else pays the bills for the first ${f.months[0]} months at least.</p>` : ''}
      <ul class="fit-parts">
        <li><span>Knowledge you already have</span>${meter(f.parts.knowledge, 'Knowledge you already have')}</li>
        <li><span>Interest match</span>${f.parts.interest === null
            ? '<span class="na">not usable — see below</span>'
            : meter(f.parts.interest, 'Interest match')}</li>
        <li><span>Fits your timeline</span>${meter(f.parts.feasibility, 'Fits your timeline')}</li>
      </ul>
      <dl class="meta">
        <div><dt>Typical ramp</dt><dd>${f.months[0]}–${f.months[1]} months of focused work before people report first paid work</dd></div>
        <div><dt>Example roles</dt><dd>${f.roles.join(' · ')}</dd></div>
        <div><dt>Automation pressure</dt><dd><span class="ai-badge ai-${f.aiBand}">${AI_WORDS[f.aiBand]}</span></dd></div>
      </dl>
    </article>`
}

/* Someone who has practised nothing cannot be told what they are good at.
   The old page handed that person a "62% fit" and a headline reading
   "strongest in nothing yet". */
function renderThin (r) {
  return `
    <section class="screen results">
      <p class="eyebrow">Your knowledge profile</p>
      <h2 tabindex="-1">There is not enough here to tell you what you are good at</h2>
      <p class="lede">
        You said you have not practised any of these twelve domains yet. That is a real answer and a
        common one, and it means this assessment can only tell you what you are <i>drawn to</i> —
        not what you can do. Anything else it printed would be invented.
      </p>

      <div class="chart-wrap">${renderRadar({}, r.fields[0].entryDemand, r.fields[0].name, r.date)}</div>
      <p class="caption">The dashed outline is what ${r.fields[0].name} asks of people entering it.
      Yours is empty. That picture is the honest one, and it is also the whole task.</p>

      <div class="block">
        <h3>What you are drawn to</h3>
        <p class="read">${r.ikigai.verdict}</p>
        ${r.quality.verdict === 'flat' ? `
          <p class="warn-note">Your interest answers were all the same, so they carry no information
          about which direction suits you. Retaking that section and answering honestly across the
          range would change this page completely.</p>` : `
          <p class="sub">Your strongest interest types: ${r.topTypes.map(t =>
            `<b>${esc(RIASEC_TYPES[t].split('—')[0].trim())}</b>`).join(' and ')}
            — ${esc(RIASEC_TYPES[r.topTypes[0]].split('—')[1].trim())}.</p>`}
      </div>

      <div class="block">
        <h3>The one thing to do next</h3>
        <p class="read">Pick the domain you are most curious about and make one small thing in it that
        another person could look at. That single act moves you from Spark to Kindling, and it is the
        only move that makes any of the rest of this page mean anything.</p>
      </div>

      ${renderFooterBlock(r)}
    </section>`
}

export function renderResults (r) {
  if (r.thin) return renderThin(r)

  const top = r.fields[0]
  const gaps = gapsFor(top, r.domains).slice(0, 4)
  const placed = DOMAINS
    .map(d => ({ ...d, level: r.domains[d.key], tier: TIERS.find(t => t.key === r.tiers[d.key]) }))
    .filter(d => d.tier.key !== 'none')
    .sort((a, b) => b.level - a.level)
    .slice(0, 5)

  const tiedNames = r.tied.map(f => f.name)

  return `
    <section class="screen results">
      <p class="eyebrow">Your knowledge profile</p>

      <div class="headline">
        <div class="flame">
          <span class="flame-num">${r.flame}</span>
          <span class="flame-lbl">±${Math.max(1, r.flameSe)}</span>
        </div>
        <div class="headline-txt">
          <p class="headline-lead">${tiedNames.length
            ? `${COUNT_WORD[tiedNames.length + 1] ?? tiedNames.length + 1} fields come out level:
               ${prose([top.name, ...tiedNames])}. The gaps between them are smaller than this test's
               own margin of error, so it does not rank them.`
            : `Your profile is deepest in <b>${placed[0].label}</b>, and points most clearly at
               <b>${top.name}</b>.`}</p>
          <p class="flame-def">The number is your <b>depth score</b>: your deepest domains, weighted so
          that being genuinely good at one thing counts for more than having dabbled in twelve. It
          counts only the levels your evidence supports.</p>
        </div>
      </div>

      <div class="chart-wrap">${renderRadar(r.domains, top.entryDemand, top.name, r.date)}</div>

      ${r.quality.verdict === 'flat' || !top.interestUsable ? `
        <p class="warn-note"><b>Your interest answers did not separate.</b> You gave the same response to
        every item, so there is no pattern to match against a field. The ranking below is running on
        knowledge alone. Retaking that section would change these results substantially.</p>` : ''}

      ${r.flags.length ? `
      <div class="block flags">
        <h3>${r.flags.length === 1 ? 'One pair of answers does not line up' : 'Some of your answers do not line up'}</h3>
        ${r.flags.map(f => `
          <p class="read">You chose <b>${esc(f.claimed.toLowerCase())}</b> as something people come to you
          for, but rated <b>${f.label}</b> at "${esc(LEVEL_SCALE[f.rated].label.toLowerCase())}". Both can be
          true — the skill may sit in a domain this list does not name. If it does not, the rating is the
          one worth changing, because the rest of this page is built on those twelve numbers.</p>`).join('')}
        <p class="sub">Nothing was adjusted for this. It is shown rather than averaged away, so you can
        decide which of the two answers to trust.</p>
      </div>` : ''}

      <div class="block">
        <h3>What you enjoy against what you are known for</h3>
        <p class="read">${r.ikigai.verdict}</p>
        ${r.ikigai.overlap.length ? `
          <p class="sub">Both at once: ${r.ikigai.overlap.map(o => esc(o.toLowerCase())).join(' · ')}.</p>` : ''}
      </div>

      <div class="block">
        <h3>Fields that fit you</h3>
        <p class="sub">Ranked, not scored out of a hundred. The three meters under each field are what
        the ranking is actually made of${tiedNames.length ? ', and the leaders sit inside the margin of error — treat them as one answer with more than one name' : ''}.</p>
        ${r.fields.slice(0, 4).every(f => f.runwayRisk) ? `
          <p class="warn-note">Every field that fits you takes longer than the time you said you have.
          That is worth knowing on its own: the options are a stopgap that pays while you train, or
          accepting a slower start. Sales and writing are the two fields here that most often pay
          inside a few months, whether or not they came out on top.</p>` : ''}
        <div class="fields">
          ${r.fields.slice(0, 4).map((f, i) => fieldCard(f, i, r.tied.includes(f))).join('')}
        </div>
        ${r.causeNote ? `<p class="cause-note">${r.causeNote}</p>` : ''}
      </div>

      <div class="block">
        <h3>Where you stand today</h3>
        <div class="tiers">
          ${placed.map(d => `
            <div class="tier-row">
              <span class="tier-dom">${d.label}</span>
              <span class="tier-badge t-${d.tier.key}">${d.tier.name}</span>
              <span class="tier-meaning">
                <b>${d.tier.kind}</b> — ${d.tier.equiv}
                <i>${d.tier.blurb}</i>
              </span>
            </div>`).join('')}
        </div>
        <p class="sub">Spark → Kindling → Flame → Torch → Beacon. Above Spark, every tier is capped by
        whether you said something exists that a stranger could check — so these badges describe work you
        can point at, not confidence you feel. They are self-reported. The next version will let you name
        that evidence, so a reader can check it instead of taking your word for it.</p>
        <p class="disclaimer">These five tiers describe knowledge. They are not academic qualifications,
        they are not awarded by an accredited institution, and they do not entitle anyone to a protected
        title. Where a tier names a stretch of study, it describes what that study is designed to
        produce — not something you hold.</p>
      </div>

      ${gaps.length ? `
      <div class="block">
        <h3>The distance to ${top.name}</h3>
        <p class="sub">Where you sit below what this field asks of people entering it, ranked by how
        heavily it leans on each domain. Hours are rough estimates of deliberate practice, at fifteen
        hours a week — a prompt for what to look into next, not a study plan.</p>
        <ol class="gaps">
          ${gaps.map(g => `
            <li>
              <span class="gap-name">${g.label}</span>
              <span class="gap-bar">
                <u style="width:${(Math.sqrt(g.want / 4) * 100).toFixed(0)}%"></u>
                <i style="width:${(Math.sqrt(g.have / 4) * 100).toFixed(0)}%"></i>
              </span>
              <span class="gap-num">~${g.hours.toLocaleString('en')} h<em>about ${g.months} months</em></span>
            </li>`).join('')}
        </ol>
      </div>` : `
      <div class="block">
        <h3>The distance to ${top.name}</h3>
        <p class="read">You already meet what this field asks of people entering it, in every domain it
        leans on. Your problem is not knowledge — it is evidence and access. The next move is proof
        other people can check, not another course.</p>
      </div>`}

      ${r.stability ? `
      <div class="block">
        <h3>Compared with last time</h3>
        <p class="read">You last took this ${r.stability.days} days ago.
        ${r.stability.agree} of ${r.stability.of} ratings are unchanged, your top field
        ${r.stability.topFieldHeld ? 'is the same' : 'has changed'}, and your depth score moved
        ${r.stability.flameDelta >= 0 ? '+' : ''}${r.stability.flameDelta}.
        ${r.stability.topFieldHeld
          ? 'A result that survives a gap like that is worth more than one that does not — that stability is itself a form of evidence.'
          : 'A result that moves this much between sittings should be treated as a prompt, not a verdict.'}</p>
      </div>` : ''}

      ${renderFooterBlock(r)}
    </section>`
}

/* The block under every results variant. When no capture endpoint is
   configured the page does not ask for an email at all — asking for an
   address the product cannot store, in exchange for a follow-up it cannot
   send, is the one thing that would cost more trust than it earns. */
function renderFooterBlock (r) {
  return `
    <div class="block capture">
      ${r.captureEnabled ? `
        <h3>Where should this go?</h3>
        <p class="sub">Your answers stay inside this browser tab until you send them — close the tab and
        the profile is gone. Leave an address and it is stored, so you can come back to it, and you get
        written to once: when assessments that someone other than you has checked are open.</p>
        <form id="capture" class="capture-form">
          <input type="email" name="email" required placeholder="you@example.com" aria-label="Email address">
          <button class="btn btn-primary" type="submit">Save my profile</button>
        </form>
        <p class="capture-note" id="capture-note" role="status"></p>
        <p class="privacy">Stored: your email address and the answers behind this chart. Nothing else,
        nothing shared or sold, no tracking scripts, no analytics, no cookies.</p>
      ` : `
        <h3>Take this with you</h3>
        <p class="sub">Your answers stay inside this browser tab and go nowhere else — no account, no
        database, no mailing list behind this page. Close the tab and the profile is gone. Download the
        chart if you want to keep it; when assessments that someone other than you has checked are open,
        this page will say so.</p>
      `}
      <div class="secondary-actions">
        <button class="btn btn-ghost" data-action="download">Download the chart</button>
        <button class="btn btn-ghost" data-action="back">Change an answer</button>
        <button class="btn btn-ghost" data-action="restart">Start over</button>
      </div>
      <p class="export-note" id="export-note" role="status"></p>
    </div>`
}
