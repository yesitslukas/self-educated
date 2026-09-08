/* ------------------------------------------------------------------
   Self-educated — assessment data model, rubric v1.

   Everything the questionnaire asks and scores against lives here, so
   content can be tuned without touching app logic. Two rules keep that
   promise true: nothing downstream may hard-code the LENGTH of any array
   in this file, and nothing may assume a key exists that is not declared
   here.

   HONESTY NOTE, which the UI repeats to users: the field vectors below
   are an editorial rubric, not measured data. They are one person's
   reading of what these occupations ask for, published so it can be
   argued with. Where a number could mislead someone making a real
   decision, it is expressed as a band rather than a false decimal.
------------------------------------------------------------------ */

export const RUBRIC_VERSION = 'v1'

/* The 12 axes of the knowledge profile.

   `short` is what the radar prints — one word, so twelve axes fit round a
   circle without wrapping or colliding. `label` is the long form for prose.

   Order is FIXED and grouped by family — technical, physical, human,
   commercial, creative. It is a layout choice, not a ranking, and the
   method page says so.

   `hours` is cumulative deliberate practice to reach each level, 0-4. These
   are rough estimates and are labelled as such wherever they surface; they
   exist so the gap list can say "about 900 hours" instead of implying that
   a four-level hole and a one-level hole are the same errand. */
export const DOMAINS = [
  { key: 'software',  short: 'Software',  label: 'Software & Code',       hours: [0, 60, 400, 1600, 4000] },
  { key: 'data',      short: 'Data',      label: 'Data & Analysis',       hours: [0, 50, 350, 1400, 3500] },
  { key: 'science',   short: 'Science',   label: 'Science & Research',    hours: [0, 80, 500, 2000, 5000] },
  { key: 'making',    short: 'Making',    label: 'Making & Engineering',  hours: [0, 70, 450, 1800, 4500] },
  { key: 'craft',     short: 'Craft',     label: 'Craft & Trades',        hours: [0, 80, 600, 2500, 6000] },
  { key: 'health',    short: 'Health',    label: 'Health & Care',         hours: [0, 80, 600, 2400, 6000] },
  { key: 'people',    short: 'Teaching',  label: 'Teaching & People',     hours: [0, 40, 250, 1000, 3000] },
  { key: 'systems',   short: 'Systems',   label: 'Systems & Operations',  hours: [0, 40, 300, 1200, 3000] },
  { key: 'finance',   short: 'Finance',   label: 'Finance & Numbers',     hours: [0, 60, 400, 1600, 4000] },
  { key: 'business',  short: 'Business',  label: 'Business & Strategy',   hours: [0, 50, 350, 1500, 4000] },
  { key: 'marketing', short: 'Marketing', label: 'Marketing & Persuasion',hours: [0, 40, 300, 1200, 3000] },
  { key: 'design',    short: 'Design',    label: 'Design & Media',        hours: [0, 60, 400, 1600, 4000] },
]

/* Five tiers, earned per domain. Named off the torch in the logo.

   `kind` names the knowledge. `equiv` locates the person against formal
   study. Every row that names a duration carries the hedge "is meant to
   produce" — that phrasing is load-bearing and must never be dropped: it
   is a factual claim about what a course of study is DESIGNED to deliver,
   not a claim to have awarded anything.

   Never rename these tiers to Bachelor, Master, Magister, Diplom or
   Meister. All are legally protected titles, and awarding one without
   accreditation is a criminal offence in several countries. */
export const TIERS = [
  { key: 'none',     name: '—',        kind: '',                       equiv: '',
    blurb: 'Not started here yet.' },
  { key: 'spark',    name: 'Spark',    kind: 'Survey knowledge',       equiv: 'You can follow the conversation, not yet lead it.',
    blurb: 'You are curious. You have read and watched, not yet built.' },
  { key: 'kindling', name: 'Kindling', kind: 'Working knowledge',      equiv: 'The grounding a first year of full-time study is meant to produce.',
    blurb: 'You have practised. Small things work when you make them.' },
  { key: 'flame',    name: 'Flame',    kind: 'Professional knowledge', equiv: 'The professional grounding three to four years of full-time study is meant to produce.',
    blurb: 'You have shipped real work that survived contact with reality.' },
  { key: 'torch',    name: 'Torch',    kind: 'Specialist knowledge',   equiv: 'The depth a further, specialist year of study is meant to produce.',
    blurb: 'Others rely on your judgement here. You solve the non-obvious cases.' },
  { key: 'beacon',   name: 'Beacon',   kind: 'Original knowledge',     equiv: 'Beyond what a taught course sets out to produce.',
    blurb: 'You produce knowledge rather than consume it, and you teach it forward.' },
]

/* Ikigai steps 1 & 2 share this tag set: what you lose time in, and what
   people come to you for. The overlap is the signal — and where the two
   contradict the domain ratings, that contradiction is reported rather
   than quietly added to the score. */
export const ACTIVITIES = [
  { key: 'puzzles',   label: 'Taking apart a problem until it cracks',              domains: { software: 2, science: 1.5, data: 1 } },
  { key: 'build',     label: 'Building or fixing physical things',                  domains: { making: 2, craft: 2 } },
  { key: 'visual',    label: 'Drawing, designing, making things look right',        domains: { design: 2.5 } },
  { key: 'write',     label: 'Writing things out until they are clear',             domains: { people: 1, design: 1, business: 1 } },
  { key: 'organise',  label: 'Turning chaos into a system that runs',               domains: { systems: 2.5, data: 1 } },
  { key: 'persuade',  label: 'Pitching, negotiating, changing minds',               domains: { marketing: 2, business: 1.5 } },
  { key: 'teach',     label: 'Explaining something until someone gets it',          domains: { people: 2.5 } },
  { key: 'numbers',   label: 'Finding the pattern hiding in numbers',               domains: { data: 2, finance: 1.5 } },
  { key: 'care',      label: 'Looking after people, bodies, wellbeing',             domains: { health: 2.5, people: 1 } },
  { key: 'media',     label: 'Filming, recording, editing, performing',             domains: { design: 2, marketing: 1 } },
  { key: 'research',  label: 'Reading into a topic past the point most people stop', domains: { science: 2, data: 1 } },
  { key: 'venture',   label: 'Starting something and running it yourself',          domains: { business: 2.5, marketing: 1 } },
]

/* What bugs you about the world. Used as a tie-break between fields that
   are statistically indistinguishable, and as narrative — never as a
   silent bonus, because it predicts whether someone stays in year three,
   not whether they can get in at all. */
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

/* The runway question. Reported as its own axis — feasibility — rather
   than folded into fit, because "does this suit me" and "can I survive
   the wait" are different questions and averaging them destroys both. */
export const MONEY_MODES = [
  { key: 'urgent',    label: 'I need income within a few months. Speed matters more than how far it goes.', horizon: 6 },
  { key: 'stable',    label: 'I want a solid, steady job I can grow inside.',              horizon: 18 },
  { key: 'ceiling',   label: 'I will trade years now to reach much further later.',        horizon: 36 },
  { key: 'freedom',   label: 'Working where and when I choose matters more than the money.', horizon: 18 },
]

/* RIASEC interest inventory (Holland's six types) — the same taxonomy
   O*NET uses, so results can be joined to real occupation data later.

   This is an 18-item SCREENER, three items per type. It is not the O*NET
   Interest Profiler, which uses 60 items in its short form and 180 in
   full. Three items per scale caps internal consistency at roughly
   alpha = .73, which is why the scoring propagates a standard error and
   the results page prints a margin instead of a bare ranking. The method
   page states this in the same words. */
export const RIASEC_TYPES = {
  R: 'Realistic — hands, tools, machines, outdoors',
  I: 'Investigative — ideas, analysis, figuring out why',
  A: 'Artistic — expression, aesthetics, original work',
  S: 'Social — helping, teaching, working with people',
  E: 'Enterprising — leading, selling, taking the risk',
  C: 'Conventional — order, accuracy, systems that hold',
}

/* Items are phrased as activities and answered on a liking scale, which
   is how interest inventories are actually anchored. Items that confounded
   interest with present circumstance ("instead of at a desk") have been
   rewritten to ask only about the activity. */
export const RIASEC_ITEMS = [
  { t: 'R', q: 'Repairing something mechanical or electrical yourself rather than replacing it' },
  { t: 'I', q: 'Spending an evening working out how something functions under the hood' },
  { t: 'A', q: 'Making something where taste and judgement matter more than being correct' },
  { t: 'S', q: 'Sitting with someone and helping them work through a problem of theirs' },
  { t: 'E', q: 'Convincing a room to back an idea that is yours' },
  { t: 'C', q: 'Setting up a filing, tracking or bookkeeping system and keeping it exact' },

  { t: 'R', q: 'Spending a whole day on your feet building something, and going home satisfied' },
  { t: 'I', q: 'Running a small experiment to settle a question rather than arguing about it' },
  { t: 'A', q: 'Writing, designing, composing or filming something for its own sake' },
  { t: 'S', q: 'Training someone new and watching them get good at it' },
  { t: 'E', q: 'Negotiating a price or a deal on your own behalf' },
  { t: 'C', q: 'Finding the one wrong number in a long list and fixing what let it in' },

  { t: 'R', q: 'Assembling, installing or wiring something that then physically works' },
  { t: 'I', q: 'Reading a dense technical paper or manual for the satisfaction of it' },
  { t: 'A', q: 'Arguing about how something looks, sounds or reads' },
  { t: 'S', q: 'Being the person others come to when they are stuck or upset' },
  { t: 'E', q: 'Starting a small venture knowing most of the risk lands on you' },
  { t: 'C', q: 'Following a checklist precisely when the cost of an error is high' },
]

export const RIASEC_SCALE = [
  { v: 0, label: 'Dislike' },
  { v: 1, label: 'Slightly' },
  { v: 2, label: 'Like' },
  { v: 3, label: 'Strongly like' },
]

/* Self-rating scale for each of the 12 domains. Deliberately behavioural —
   "what have you done", not "how good are you". */
export const LEVEL_SCALE = [
  { v: 0, short: 'Nothing',   label: 'Never touched it' },
  { v: 1, short: 'Read',      label: 'Read or watched about it, never practised' },
  { v: 2, short: 'Practised', label: 'Practised it — small things of my own' },
  { v: 3, short: 'Shipped',   label: 'Made real things other people used or paid for' },
  { v: 4, short: 'Relied on', label: 'Others come to me for it' },
]

/* ------------------------------------------------------------------
   Fields.

   `riasec` gives all six Holland types explicitly, including zeros. The
   zeros are load-bearing: interest matching centres both vectors on their
   own means, and an absent type would be centred against the wrong
   denominator.

   `entryDemand` is the level at which people are HIRED INTO this field —
   not the level of its best practitioners. It is capped at 3 ("made real
   things other people used or paid for"); 4 is reserved for nobody,
   because no field requires that you be the person others come to before
   it will let you in. Domains a field does not genuinely lean on are 0
   rather than a decorative 0.5.

   `aiBand` is a three-way editorial judgement — high / mid / low — and
   deliberately not a percentage. Nobody has measured what share of any of
   these occupations current AI performs, so printing "72%" would be
   inventing precision about the labour market. When the numbers exist
   (O*NET task data joined to the Anthropic Economic Index on SOC codes),
   this becomes a real figure with a citation.

   `months` is a rough ramp, not a projection. Surfaced as "what people
   commonly report", never as a forecast for any individual.
------------------------------------------------------------------ */
export const FIELDS = [
  {
    key: 'software', name: 'Software Engineering',
    blurb: 'Building the systems everything else now runs on. The most credential-blind field that pays well — portfolios beat degrees here more than anywhere.',
    riasec: { R: 1, I: 3, A: 1, S: 0, E: 0, C: 2 },
    entryDemand: { software: 3, data: 1.5, science: 0, making: 0, craft: 0, health: 0, people: 0, systems: 1, finance: 0, business: 0, marketing: 0, design: 0 },
    months: [8, 18], aiBand: 'high',
    roles: ['Backend developer', 'Frontend developer', 'Automation engineer'],
    causes: ['tech', 'waste', 'access'],
  },
  {
    key: 'data', name: 'Data & Analytics',
    blurb: 'Turning messy records into decisions. Lower entry barrier than engineering, and every organisation has the problem.',
    riasec: { R: 0, I: 3, A: 0, S: 0, E: 1, C: 3 },
    entryDemand: { software: 1.5, data: 3, science: 0, making: 0, craft: 0, health: 0, people: 0, systems: 1, finance: 0, business: 1, marketing: 0, design: 0 },
    months: [6, 14], aiBand: 'high',
    roles: ['Data analyst', 'BI developer', 'Analytics engineer'],
    causes: ['truth', 'waste', 'tech'],
  },
  {
    key: 'design', name: 'Product & UX Design',
    blurb: 'Deciding how a thing should work before anyone builds it. Taste plus research — hard to automate, easy to prove with a portfolio.',
    riasec: { R: 0, I: 2, A: 3, S: 2, E: 1, C: 1 },
    entryDemand: { software: 1, data: 0, science: 0, making: 0, craft: 0, health: 0, people: 1.5, systems: 0, finance: 0, business: 1, marketing: 0, design: 3 },
    months: [6, 14], aiBand: 'mid',
    roles: ['Product designer', 'UX researcher', 'Design systems lead'],
    causes: ['access', 'waste', 'culture'],
  },
  {
    key: 'marketing', name: 'Marketing & Growth',
    blurb: 'Getting the right people to find and want the thing. Results are measurable, which is exactly why nobody checks your diploma.',
    riasec: { R: 0, I: 1, A: 2, S: 1, E: 3, C: 2 },
    entryDemand: { software: 0, data: 1.5, science: 0, making: 0, craft: 0, health: 0, people: 0, systems: 0, finance: 0, business: 1.5, marketing: 3, design: 1 },
    months: [4, 10], aiBand: 'high',
    roles: ['Growth marketer', 'Performance media buyer', 'Lifecycle & CRM'],
    causes: ['culture', 'access', 'truth'],
  },
  {
    key: 'content', name: 'Writing & Communications',
    blurb: 'Making complicated things land. The fastest field to show competence in publicly — and the one software is pressing hardest, so depth matters.',
    riasec: { R: 0, I: 2, A: 3, S: 2, E: 1, C: 1 },
    entryDemand: { software: 0, data: 0, science: 0, making: 0, craft: 0, health: 0, people: 2.5, systems: 0, finance: 0, business: 1, marketing: 1.5, design: 2.5 },
    months: [3, 9], aiBand: 'high',
    roles: ['Content strategist', 'Technical writer', 'Communications lead'],
    causes: ['truth', 'culture', 'access'],
  },
  {
    key: 'sales', name: 'Sales & Business Development',
    blurb: 'The field that has cared least about where you went to school. What counts is whether deals close — which makes it the fastest route from zero to real income.',
    riasec: { R: 0, I: 0, A: 1, S: 3, E: 3, C: 1 },
    entryDemand: { software: 0, data: 0, science: 0, making: 0, craft: 0, health: 0, people: 2.5, systems: 1, finance: 0, business: 2.5, marketing: 2, design: 0 },
    months: [2, 6], aiBand: 'mid',
    roles: ['Account executive', 'Partnerships', 'Solutions consultant'],
    causes: ['access', 'inequality'],
  },
  {
    key: 'ops', name: 'Operations & Project Management',
    blurb: 'Making an organisation actually run. Undervalued, everywhere, and learnable almost entirely on the job.',
    riasec: { R: 1, I: 1, A: 0, S: 2, E: 2, C: 3 },
    entryDemand: { software: 0, data: 1, science: 0, making: 0, craft: 0, health: 0, people: 1, systems: 3, finance: 0, business: 2, marketing: 0, design: 0 },
    months: [4, 12], aiBand: 'mid',
    roles: ['Operations manager', 'Project manager', 'Chief of staff'],
    causes: ['waste', 'inequality'],
  },
  {
    key: 'itsupport', name: 'IT Support & Administration',
    blurb: 'Keeping the machines and accounts of an organisation working. The classic no-degree entry into technology, and it opens onto everything else.',
    riasec: { R: 2, I: 2, A: 0, S: 2, E: 0, C: 3 },
    entryDemand: { software: 1.5, data: 1, science: 0, making: 0, craft: 0, health: 0, people: 1.5, systems: 3, finance: 0, business: 0, marketing: 0, design: 0 },
    months: [4, 12], aiBand: 'mid',
    roles: ['IT support technician', 'Systems administrator', 'Cloud operations'],
    causes: ['waste', 'access', 'tech'],
  },
  {
    key: 'security', name: 'Cybersecurity',
    blurb: 'Finding what breaks before someone else does. Hiring here runs on demonstrated skill and certifications rather than degrees.',
    riasec: { R: 1, I: 3, A: 0, S: 0, E: 1, C: 3 },
    entryDemand: { software: 2.5, data: 1.5, science: 1, making: 0, craft: 0, health: 0, people: 0, systems: 2.5, finance: 0, business: 0, marketing: 0, design: 0 },
    months: [10, 24], aiBand: 'mid',
    roles: ['Security analyst', 'Penetration tester', 'Security operations'],
    causes: ['tech', 'truth', 'waste'],
  },
  {
    key: 'logistics', name: 'Logistics & Supply Chain',
    blurb: 'Moving physical things through a system without loss. Enormous, unglamorous, and full of people who started on the floor.',
    riasec: { R: 2, I: 1, A: 0, S: 1, E: 2, C: 3 },
    entryDemand: { software: 0, data: 1.5, science: 0, making: 0, craft: 0, health: 0, people: 0, systems: 3, finance: 1, business: 1.5, marketing: 0, design: 0 },
    months: [3, 10], aiBand: 'mid',
    roles: ['Logistics coordinator', 'Supply chain analyst', 'Warehouse operations lead'],
    causes: ['waste', 'climate', 'inequality'],
  },
  {
    key: 'finance', name: 'Finance & Accounting',
    blurb: 'Money as a system. Parts are licence-gated, but analysis, controlling and fintech roles are wide open to the self-taught.',
    riasec: { R: 0, I: 2, A: 0, S: 0, E: 2, C: 3 },
    entryDemand: { software: 0, data: 2, science: 0, making: 0, craft: 0, health: 0, people: 0, systems: 1.5, finance: 3, business: 1, marketing: 0, design: 0 },
    months: [6, 18], aiBand: 'mid',
    roles: ['Financial analyst', 'Controller', 'Fintech operations'],
    causes: ['inequality', 'waste'],
  },
  {
    key: 'trades', name: 'Skilled Trades',
    blurb: 'Electrical, HVAC, plumbing, solar. Formal apprenticeship in most countries, very little of it automatable, and demand that is not going anywhere.',
    riasec: { R: 3, I: 1, A: 0, S: 0, E: 1, C: 2 },
    entryDemand: { software: 0, data: 0, science: 0, making: 2.5, craft: 3, health: 0, people: 0, systems: 1, finance: 0, business: 1, marketing: 0, design: 0 },
    months: [12, 36], aiBand: 'low',
    roles: ['Electrician', 'HVAC / heat pump technician', 'Solar installer'],
    causes: ['climate', 'waste'],
  },
  {
    key: 'health', name: 'Health & Care Work',
    blurb: 'Largely licence-gated, but the licences are vocational rather than academic — this is a real route without a university degree.',
    riasec: { R: 2, I: 1, A: 0, S: 3, E: 0, C: 2 },
    entryDemand: { software: 0, data: 0, science: 1, making: 0, craft: 0, health: 3, people: 2.5, systems: 1, finance: 0, business: 0, marketing: 0, design: 0 },
    months: [12, 30], aiBand: 'low',
    roles: ['Care specialist', 'Rehabilitation / physio assistant', 'Health coach'],
    causes: ['health', 'inequality', 'access'],
  },
  {
    key: 'teaching', name: 'Teaching & Training',
    blurb: 'Public schooling needs certification; corporate training, online education and coaching do not. Your own learning story is the credential.',
    riasec: { R: 0, I: 1, A: 2, S: 3, E: 2, C: 1 },
    entryDemand: { software: 0, data: 0, science: 0, making: 0, craft: 0, health: 0, people: 3, systems: 0, finance: 0, business: 1, marketing: 1, design: 1.5 },
    months: [3, 12], aiBand: 'mid',
    roles: ['Corporate trainer', 'Instructional designer', 'Coach / course creator'],
    causes: ['access', 'inequality', 'culture'],
  },
  {
    key: 'venture', name: 'Entrepreneurship & Small Business',
    blurb: 'The field where nobody grants you anything — you take it. Highest variance, and the one that most rewards a broad rather than deep profile.',
    riasec: { R: 1, I: 1, A: 2, S: 1, E: 3, C: 1 },
    entryDemand: { software: 0, data: 0, science: 0, making: 0, craft: 0, health: 0, people: 1, systems: 1.5, finance: 1.5, business: 3, marketing: 2.5, design: 0 },
    months: [6, 36], aiBand: 'mid',
    roles: ['Founder', 'Owner-operator', 'Freelance / agency'],
    causes: ['access', 'inequality', 'waste', 'culture'],
  },
  {
    key: 'applied', name: 'Applied Science & Lab Work',
    blurb: 'Technician and applied-research roles. This is the hardest field on the list to enter without formal study — most labs still ask for a qualification at the door.',
    riasec: { R: 3, I: 3, A: 0, S: 0, E: 0, C: 2 },
    entryDemand: { software: 0, data: 1.5, science: 3, making: 1.5, craft: 0, health: 0, people: 0, systems: 1, finance: 0, business: 0, marketing: 0, design: 0 },
    months: [12, 36], aiBand: 'mid',
    roles: ['Lab technician', 'Quality / materials tech', 'Field research assistant'],
    causes: ['climate', 'health', 'tech'],
  },
  {
    key: 'media', name: 'Media Production',
    blurb: 'Craft you can prove in ten seconds of a showreel. The tools have collapsed in price; taste and reliability are what still sell.',
    riasec: { R: 2, I: 1, A: 3, S: 1, E: 2, C: 1 },
    entryDemand: { software: 0, data: 0, science: 0, making: 1.5, craft: 0, health: 0, people: 0, systems: 0, finance: 0, business: 1, marketing: 1.5, design: 3 },
    months: [4, 14], aiBand: 'mid',
    roles: ['Video editor', 'Producer', 'Audio / podcast engineer'],
    causes: ['culture', 'truth', 'access'],
  },
]
