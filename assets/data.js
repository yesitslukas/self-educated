/* ------------------------------------------------------------------
   Self-educated — assessment data model
   Everything the questionnaire asks and scores against lives here,
   so content can be tuned without touching app logic.
------------------------------------------------------------------ */

/* The 12 axes of the knowledge profile (the radar chart). */
export const DOMAINS = [
  { key: 'software',  label: 'Software & Code' },
  { key: 'data',      label: 'Data & Analysis' },
  { key: 'science',   label: 'Science & Research' },
  { key: 'making',    label: 'Making & Engineering' },
  { key: 'craft',     label: 'Craft & Trades' },
  { key: 'health',    label: 'Health & Care' },
  { key: 'people',    label: 'Teaching & People' },
  { key: 'systems',   label: 'Systems & Operations' },
  { key: 'finance',   label: 'Finance & Numbers' },
  { key: 'business',  label: 'Business & Strategy' },
  { key: 'marketing', label: 'Marketing & Persuasion' },
  { key: 'design',    label: 'Design & Media' },
]

/* Five tiers, earned per domain. Named off the torch in the logo.

   `kind` names the knowledge, `equiv` states what an equivalent stretch of
   formal study is *meant* to produce. That phrasing is deliberate and it is
   the only safe way to make the comparison: it is a factual claim about the
   intended substance of a course of study, not a claim to have awarded a
   title. Never rename these tiers to Bachelor, Master, Magister, Diplom or
   Meister — all are legally protected, and awarding one without
   accreditation is a criminal offence in several countries. */
export const TIERS = [
  { key: 'none',     name: '—',        kind: '',                       equiv: '',
    blurb: 'Not started here yet.' },
  { key: 'spark',    name: 'Spark',    kind: 'Survey knowledge',       equiv: 'You can follow the conversation.',
    blurb: 'You are curious. You have read and watched, not yet built.' },
  { key: 'kindling', name: 'Kindling', kind: 'Working knowledge',      equiv: 'Roughly a first year of study.',
    blurb: 'You have practised. Small things work when you make them.' },
  { key: 'flame',    name: 'Flame',    kind: 'Professional knowledge', equiv: 'The working knowledge a three-year course of study is meant to produce.',
    blurb: 'You have shipped real work that survived contact with reality.' },
  { key: 'torch',    name: 'Torch',    kind: 'Specialist knowledge',   equiv: 'The depth a taught postgraduate year is meant to produce.',
    blurb: 'Others rely on your judgement here. You solve the non-obvious cases.' },
  { key: 'beacon',   name: 'Beacon',   kind: 'Original knowledge',     equiv: 'You produce what others learn from.',
    blurb: 'You produce knowledge rather than consume it, and you teach it forward.' },
]

/* Ikigai step 1 & 2 share this tag set: what you lose time in,
   and what people come to you for. Overlap = the honest signal. */
export const ACTIVITIES = [
  { key: 'puzzles',   label: 'Taking apart a problem until it cracks', domains: { software: 2, science: 1.5, data: 1 } },
  { key: 'build',     label: 'Building or fixing physical things',      domains: { making: 2, craft: 2 } },
  { key: 'visual',    label: 'Drawing, designing, making things look right', domains: { design: 2.5 } },
  { key: 'write',     label: 'Writing things out until they are clear', domains: { people: 1, design: 0.5, business: 0.5 } },
  { key: 'organise',  label: 'Turning chaos into a system that runs',   domains: { systems: 2.5, data: 0.5 } },
  { key: 'persuade',  label: 'Pitching, negotiating, changing minds',   domains: { marketing: 2, business: 1.5 } },
  { key: 'teach',     label: 'Explaining something until someone gets it', domains: { people: 2.5 } },
  { key: 'numbers',   label: 'Finding the pattern hiding in numbers',   domains: { data: 2, finance: 1.5 } },
  { key: 'care',      label: 'Looking after people, bodies, wellbeing', domains: { health: 2.5, people: 0.5 } },
  { key: 'media',     label: 'Filming, recording, editing, performing', domains: { design: 2, marketing: 0.5 } },
  { key: 'research',  label: 'Reading into a topic far past the point most people stop', domains: { science: 2, data: 1 } },
  { key: 'venture',   label: 'Starting something and running it yourself', domains: { business: 2.5, marketing: 1 } },
]

/* What bugs you about the world — the "what the world needs" ring. */
export const CAUSES = [
  { key: 'access',    label: 'People locked out of opportunity by credentials they never got' },
  { key: 'climate',   label: 'Climate, energy, how we treat the planet' },
  { key: 'health',    label: 'Health, ageing, mental health, how people suffer avoidably' },
  { key: 'waste',     label: 'Waste — broken systems, bureaucracy, things that should just work' },
  { key: 'truth',     label: 'Misinformation, manipulation, people being lied to' },
  { key: 'inequality',label: 'Wealth gaps, who gets a shot and who does not' },
  { key: 'culture',   label: 'Culture, art, things worth making that nobody is paying for' },
  { key: 'tech',      label: 'Technology outrunning our ability to handle it' },
]

/* The "what you can be paid for" ring — reframed as a constraint,
   because it changes which recommendation is actually useful. */
export const MONEY_MODES = [
  { key: 'urgent',    label: 'I need income within a few months. Speed beats ceiling.',  horizon: 6 },
  { key: 'stable',    label: 'I want a solid, stable job I can grow inside.',             horizon: 18 },
  { key: 'ceiling',   label: 'I will trade years now for a much higher ceiling later.',   horizon: 36 },
  { key: 'freedom',   label: 'Location and time freedom matter more than the number.',    horizon: 18 },
]

/* RIASEC interest inventory (Holland codes) — the same taxonomy O*NET
   uses, so results can be joined to real occupation data later.
   3 items per type, answered 0–3. */
export const RIASEC_TYPES = {
  R: 'Realistic — hands, tools, machines, outdoors',
  I: 'Investigative — ideas, analysis, figuring out why',
  A: 'Artistic — expression, aesthetics, original work',
  S: 'Social — helping, teaching, working with people',
  E: 'Enterprising — leading, selling, taking the risk',
  C: 'Conventional — order, accuracy, systems that hold',
}

export const RIASEC_ITEMS = [
  { t: 'R', q: 'Repair something mechanical or electrical yourself rather than replace it' },
  { t: 'I', q: 'Spend an evening understanding how something actually works under the hood' },
  { t: 'A', q: 'Make something where taste and judgement matter more than being correct' },
  { t: 'S', q: 'Sit with someone and help them work through a problem of theirs' },
  { t: 'E', q: 'Convince a room to back an idea that is yours' },
  { t: 'C', q: 'Set up a filing, tracking or bookkeeping system and keep it exact' },

  { t: 'R', q: 'Work with your body outdoors instead of at a desk' },
  { t: 'I', q: 'Run a small experiment to settle a question rather than argue about it' },
  { t: 'A', q: 'Write, design, compose or film something for its own sake' },
  { t: 'S', q: 'Train or onboard someone new and watch them get good' },
  { t: 'E', q: 'Negotiate a price or a deal on your own behalf' },
  { t: 'C', q: 'Find the one wrong number in a long list and fix the process that let it in' },

  { t: 'R', q: 'Assemble, install or wire something that then physically works' },
  { t: 'I', q: 'Read a dense technical paper or manual for the satisfaction of it' },
  { t: 'A', q: 'Have strong opinions about how something looks, sounds or reads' },
  { t: 'S', q: 'Be the person others come to when they are stuck or upset' },
  { t: 'E', q: 'Start a small venture knowing most of the risk lands on you' },
  { t: 'C', q: 'Follow a checklist precisely when the cost of an error is high' },
]

export const RIASEC_SCALE = [
  { v: 0, label: 'No' },
  { v: 1, label: 'Rarely' },
  { v: 2, label: 'Often' },
  { v: 3, label: 'Yes, that is me' },
]

/* Self-rating scale for each of the 12 domains. Deliberately behavioural
   — "what have you done", not "how good are you". */
export const LEVEL_SCALE = [
  { v: 0, short: 'Nothing',   label: 'Never touched it' },
  { v: 1, short: 'Read',      label: 'Read or watched about it, never practised' },
  { v: 2, short: 'Practised', label: 'Practised it — small things of my own' },
  { v: 3, short: 'Shipped',   label: 'Made real things other people used or paid for' },
  { v: 4, short: 'Relied on', label: 'Others come to me for it' },
]

/* ------------------------------------------------------------------
   Fields. `demand` = how strongly each domain matters in that field,
   0–4, on the same scale as the user's self-rating, so the two
   polygons on the radar are directly comparable.

   NOTE ON `aiExposure`: these are editorial placeholders (0–1) so the
   UI can be built and tested. Before launch, replace with real figures
   joined on SOC codes — O*NET (onetcenter.org, free API + downloads)
   for the occupation/skill data, and the Anthropic Economic Index for
   observed vs. theoretical AI coverage. Do not ship these numbers as
   if they were sourced.
------------------------------------------------------------------ */
export const FIELDS = [
  {
    key: 'software', name: 'Software Engineering',
    blurb: 'Building the systems everything else now runs on. The most credential-blind field that pays well — portfolios beat degrees here more than anywhere.',
    riasec: { I: 3, R: 2, C: 2 },
    demand: { software: 4, data: 2.5, systems: 2, science: 1.5, design: 1, business: 1, making: 1, people: 1, marketing: 0.5, finance: 0.5, health: 0, craft: 0 },
    months: [8, 18], aiExposure: 0.72,
    roles: ['Backend developer', 'Frontend developer', 'Automation engineer'],
    causes: ['tech', 'waste', 'access'],
  },
  {
    key: 'data', name: 'Data & Analytics',
    blurb: 'Turning messy records into decisions. Lower entry barrier than engineering, and every company has the problem.',
    riasec: { I: 3, C: 3 },
    demand: { data: 4, software: 2.5, finance: 2, science: 2, business: 2, systems: 1.5, design: 1, marketing: 1, people: 0.5, making: 0, health: 0, craft: 0 },
    months: [6, 14], aiExposure: 0.68,
    roles: ['Data analyst', 'BI developer', 'Analytics engineer'],
    causes: ['truth', 'waste', 'tech'],
  },
  {
    key: 'design', name: 'Product & UX Design',
    blurb: 'Deciding how a thing should work before anyone builds it. Taste plus research — hard to automate, easy to prove with a portfolio.',
    riasec: { A: 3, I: 2, S: 2 },
    demand: { design: 4, people: 2, software: 1.5, data: 1.5, business: 1.5, marketing: 1.5, systems: 1, science: 1, making: 0.5, finance: 0, health: 0, craft: 0 },
    months: [6, 14], aiExposure: 0.55,
    roles: ['Product designer', 'UX researcher', 'Design systems lead'],
    causes: ['access', 'waste', 'culture'],
  },
  {
    key: 'marketing', name: 'Marketing & Growth',
    blurb: 'Getting the right people to find and want the thing. Results are measurable, which is exactly why nobody checks your diploma.',
    riasec: { E: 3, A: 2, C: 2 },
    demand: { marketing: 4, data: 2.5, business: 2.5, design: 2, people: 1.5, systems: 1.5, finance: 1, software: 1, science: 0.5, making: 0, health: 0, craft: 0 },
    months: [4, 10], aiExposure: 0.65,
    roles: ['Growth marketer', 'Performance media buyer', 'Lifecycle & CRM'],
    causes: ['culture', 'access', 'truth'],
  },
  {
    key: 'content', name: 'Content, Writing & Comms',
    blurb: 'Making complicated things land. Fastest field to show competence in publicly — but the one AI is pressing hardest, so depth matters.',
    riasec: { A: 3, I: 2, S: 2 },
    demand: { design: 2.5, people: 2.5, marketing: 2.5, science: 1.5, business: 1.5, data: 1, systems: 1, software: 0.5, finance: 0.5, health: 0.5, making: 0, craft: 0 },
    months: [3, 9], aiExposure: 0.80,
    roles: ['Content strategist', 'Technical writer', 'Communications lead'],
    causes: ['truth', 'culture', 'access'],
  },
  {
    key: 'sales', name: 'Sales & Business Development',
    blurb: 'The one field that has never cared where you went to school, only whether you close. Fastest path from zero to real income.',
    riasec: { E: 3, S: 3 },
    demand: { marketing: 3, business: 3, people: 2.5, systems: 1.5, finance: 1.5, data: 1, design: 0.5, software: 0.5, science: 0, making: 0, health: 0, craft: 0 },
    months: [2, 6], aiExposure: 0.40,
    roles: ['Account executive', 'Partnerships', 'Solutions consultant'],
    causes: ['access', 'inequality'],
  },
  {
    key: 'ops', name: 'Operations & Project Management',
    blurb: 'Making an organisation actually run. Undervalued, everywhere, and learnable almost entirely on the job.',
    riasec: { C: 3, E: 2, S: 2 },
    demand: { systems: 4, business: 2.5, people: 2, data: 2, finance: 2, marketing: 1, software: 1, design: 0.5, making: 0.5, science: 0.5, health: 0.5, craft: 0.5 },
    months: [4, 12], aiExposure: 0.50,
    roles: ['Operations manager', 'Project manager', 'Chief of staff'],
    causes: ['waste', 'inequality'],
  },
  {
    key: 'finance', name: 'Finance & Accounting',
    blurb: 'Money as a system. Parts are licence-gated, but analysis, controlling and fintech roles are wide open to the self-taught.',
    riasec: { C: 3, I: 2, E: 2 },
    demand: { finance: 4, data: 3, systems: 2.5, business: 2.5, software: 1, science: 0.5, people: 0.5, marketing: 0.5, design: 0, making: 0, health: 0, craft: 0 },
    months: [6, 18], aiExposure: 0.60,
    roles: ['Financial analyst', 'Controller', 'Fintech operations'],
    causes: ['inequality', 'waste'],
  },
  {
    key: 'trades', name: 'Skilled Trades',
    blurb: 'Electrical, HVAC, plumbing, solar. Formal apprenticeship in most countries, near-zero AI exposure, and demand that is not going anywhere.',
    riasec: { R: 3, C: 2 },
    demand: { craft: 4, making: 3.5, systems: 2, business: 1.5, science: 1, health: 0.5, people: 0.5, finance: 0.5, data: 0, software: 0, design: 0, marketing: 0 },
    months: [12, 36], aiExposure: 0.08,
    roles: ['Electrician', 'HVAC / heat pump technician', 'Solar installer'],
    causes: ['climate', 'waste'],
  },
  {
    key: 'health', name: 'Health & Care Work',
    blurb: 'Largely licence-gated, but the licences are vocational, not academic — this is a real route without a university degree.',
    riasec: { S: 3, R: 2, C: 2 },
    demand: { health: 4, people: 3, science: 2, systems: 1.5, data: 1, craft: 0.5, business: 0.5, making: 0.5, design: 0, software: 0, finance: 0, marketing: 0 },
    months: [12, 30], aiExposure: 0.15,
    roles: ['Care specialist', 'Rehabilitation / physio assistant', 'Health coach'],
    causes: ['health', 'inequality', 'access'],
  },
  {
    key: 'teaching', name: 'Teaching, Training & Coaching',
    blurb: 'Public schooling needs certification; corporate training, online education and coaching do not. Your own learning story is the credential.',
    riasec: { S: 3, A: 2, E: 2 },
    demand: { people: 4, design: 2, marketing: 2, business: 1.5, science: 1.5, systems: 1.5, data: 1, health: 1, software: 0.5, finance: 0.5, making: 0.5, craft: 0.5 },
    months: [3, 12], aiExposure: 0.35,
    roles: ['Corporate trainer', 'Instructional designer', 'Coach / course creator'],
    causes: ['access', 'inequality', 'culture'],
  },
  {
    key: 'venture', name: 'Entrepreneurship & Small Business',
    blurb: 'The field where nobody grants you anything — you take it. Highest variance, and the one that most rewards a broad rather than deep profile.',
    riasec: { E: 3, R: 2, A: 2 },
    demand: { business: 4, marketing: 3, finance: 2.5, systems: 2.5, people: 2, design: 1.5, data: 1.5, software: 1, making: 1, craft: 1, science: 0.5, health: 0.5 },
    months: [6, 36], aiExposure: 0.45,
    roles: ['Founder', 'Owner-operator', 'Freelance / agency'],
    causes: ['access', 'inequality', 'waste', 'culture'],
  },
  {
    key: 'applied', name: 'Applied Science & Lab Work',
    blurb: 'Technician and applied-research roles. The hardest of these to enter without formal study — be honest with yourself about that.',
    riasec: { I: 3, R: 3 },
    demand: { science: 4, data: 2.5, making: 2, health: 1.5, systems: 1.5, software: 1, craft: 1, design: 0.5, finance: 0, business: 0.5, people: 0.5, marketing: 0 },
    months: [12, 36], aiExposure: 0.35,
    roles: ['Lab technician', 'Quality / materials tech', 'Field research assistant'],
    causes: ['climate', 'health', 'tech'],
  },
  {
    key: 'media', name: 'Video, Audio & Media Production',
    blurb: 'Craft you can prove in ten seconds of showreel. Tooling is collapsing in price; taste and reliability are what still sell.',
    riasec: { A: 3, R: 2, E: 2 },
    demand: { design: 4, making: 2, marketing: 2, people: 1.5, business: 1.5, systems: 1, craft: 1, software: 1, data: 0.5, science: 0.5, finance: 0, health: 0 },
    months: [4, 14], aiExposure: 0.50,
    roles: ['Video editor', 'Producer', 'Audio / podcast engineer'],
    causes: ['culture', 'truth', 'access'],
  },
]
