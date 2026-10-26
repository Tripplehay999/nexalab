// Content for the public marketing site.
//
// PLACEHOLDER NOTICE: the people, photos, client names, quotes, and metrics below are
// stand-ins (photos are from Unsplash). Swap in your real team, real headshots, and
// real client results before launch.

export function photo(id: string, w = 800, h?: number) {
  if (id.startsWith('/')) return id; // local image in /public
  const size = h ? `&h=${h}&fit=crop&crop=faces` : '';
  return `https://images.unsplash.com/photo-${id}?auto=format&q=80&w=${w}${size}`;
}

export type Person = {
  name: string;
  role: string;
  team: 'Leadership' | 'Design' | 'Engineering' | 'Growth' | 'Client Success' | 'Operations' | 'People';
  city: string;
  photo: string;
  fun: string;
};

export const TEAM: Person[] = [
  { name: 'Marcus Tan', role: 'Co-founder & CEO', team: 'Leadership', city: 'Brooklyn', photo: '1507003211169-0a1dd7228f2d', fun: 'Has rebuilt 40+ checkouts. Still gets excited about every one.' },
  { name: 'Amara Okafor', role: 'Co-founder & Design Director', team: 'Leadership', city: 'Brooklyn', photo: '1531123897727-8f129e1688ce', fun: 'Believes every product page should feel like a shop window.' },
  { name: 'Jade McMiller', role: 'Head of Recruiting & HR', team: 'People', city: 'Atlanta', photo: '1507152832244-10d45c7eda57', fun: 'Has personally welcomed every new hire on their first day.' },
  { name: 'Daniel Kovač', role: 'Head of Engineering', team: 'Engineering', city: 'Lisbon', photo: '1500648767791-00dcc994a43e', fun: 'Measures page speed the way some people track marathon times.' },
  { name: 'Sofia Marchetti', role: 'Head of Client Success', team: 'Client Success', city: 'Brooklyn', photo: '1494790108377-be9c29b29330', fun: 'Knows every client’s launch date by heart.' },
  { name: 'Rosa Delgado', role: 'Operations Director', team: 'Operations', city: 'Miami', photo: '1527980965255-d3b416303d12', fun: 'Turns shipping chaos into calm, boring spreadsheets.' },
  { name: 'Megan Hayes', role: 'Growth Lead', team: 'Growth', city: 'Toronto', photo: '1508214751196-bcfd4ca60f91', fun: 'Runs an A/B test on her own grocery list.' },
  { name: 'Theo Laurent', role: 'Product Designer', team: 'Design', city: 'Toronto', photo: '1539571696357-5a69c17a67c6', fun: 'Sketches every layout on paper first.' },
  { name: 'Rafael Ortiz', role: 'Senior Engineer', team: 'Engineering', city: 'Mexico City', photo: '1557862921-37829c790f19', fun: 'Connected 14 shipping carriers. Has opinions on all of them.' },
  { name: 'Jonas Weber', role: 'Frontend Engineer', team: 'Engineering', city: 'Berlin', photo: '1599566150163-29194dcaad36', fun: 'Animates things that probably don’t need animating.' },
  { name: 'Hannah Brooks', role: 'Account Manager', team: 'Client Success', city: 'Toronto', photo: '1573496359142-b8d87734a5a2', fun: 'Sends the best weekly reports in the business.' },
  { name: 'Al-Hamid (AJ)', role: 'Lead On-Call Developer', team: 'Engineering', city: 'Toronto', photo: '/team/aj.png', fun: 'First on the scene when a checkout breaks — day or night.' },
];

export const SUPPORT_TEAM: Person[] = [
  { name: 'Sofia Marchetti', role: 'Support Lead', team: 'Client Success', city: 'Brooklyn', photo: '1494790108377-be9c29b29330', fun: 'Answers most tickets before her coffee cools.' },
  { name: 'Leah Bennett', role: 'Support Specialist', team: 'Client Success', city: 'Nashville', photo: '1580489944761-15a19d654956', fun: 'Speaks fluent Shopify, Stripe, and ShipStation.' },
  { name: 'Diego Alvarez', role: 'Support Specialist', team: 'Client Success', city: 'Phoenix', photo: '1504593811423-6dd665756598', fun: 'Our evening shift hero — and resident order-tracking detective.' },
  { name: 'Nadia Haddad', role: 'Technical Support', team: 'Client Success', city: 'Toronto', photo: '1534751516642-a1af1ef26a56', fun: 'Fixes broken integrations the same day they break.' },
];

export const SERVICES = [
  {
    slug: 'design-build',
    num: '01',
    color: 'tomato',
    title: 'We design & build your store',
    short: 'A fast, beautiful storefront and a checkout that converts.',
    body: 'From brand-new launches to full replatforms, we design every page and engineer the checkout so it’s fast on any phone and easy to buy from.',
    items: ['Store design & product pages', 'Checkout & payments setup', 'Shopify, WooCommerce, or custom', 'Speed & mobile optimization', 'Migration from your old store'],
  },
  {
    slug: 'operations',
    num: '02',
    color: 'lime',
    title: 'We connect your operations',
    short: 'Inventory, shipping, and payments that sync on their own.',
    body: 'We wire your store to your warehouse, carriers, and payment providers so stock is always right and orders ship without anyone copying data by hand.',
    items: ['Inventory & catalog sync', 'Shipping carriers & labels', 'Warehouse / 3PL integration', 'Payment providers & fraud rules', 'Order routing automation'],
  },
  {
    slug: 'growth',
    num: '03',
    color: 'sky',
    title: 'We grow your sales every month',
    short: 'Tracking, experiments, and steady improvements.',
    body: 'After launch, we keep going. We set up clean tracking, find where you’re losing customers, and run monthly experiments that add up to real revenue.',
    items: ['Analytics & conversion tracking', 'Monthly A/B experiments', 'Email & retention flows', 'Ad attribution & spend review', 'Weekly performance reports'],
  },
  {
    slug: 'support',
    num: '04',
    color: 'lilac',
    title: 'We support you, every day',
    short: 'Real people on call when something needs fixing.',
    body: 'You get a named account manager plus a support team that answers in minutes, not days. If something breaks at checkout, we’re already on it.',
    items: ['Named account manager', 'Same-day ticket responses', 'Uptime & checkout monitoring', 'Security & app updates', 'Training for your team'],
  },
] as const;

export const CASE_STUDIES = [
  {
    client: 'Driftwood Supply',
    industry: 'Apparel',
    photo: '1523381210434-271e8be1f52b',
    headline: 'A new store and checkout, live in 14 days',
    metric: '+38%',
    metricLabel: 'conversion rate',
    summary: 'Moved from a slow template to a custom storefront with one-page checkout. Mobile sales jumped in the first month.',
    color: 'lime',
  },
  {
    client: 'Lumière Co.',
    industry: 'Beauty',
    photo: '1596462502278-27bfdc403348',
    headline: 'Inventory across 3 warehouses, finally in sync',
    metric: '−94%',
    metricLabel: 'stockouts',
    summary: 'Connected three warehouses and two sales channels into one live inventory count. Overselling stopped overnight.',
    color: 'lilac',
  },
  {
    client: 'AeroKit Audio',
    industry: 'Electronics',
    photo: '1505740420928-5e560c06d30e',
    headline: 'Found the ad spend that wasn’t working',
    metric: '4×',
    metricLabel: 'return on retainer',
    summary: 'Rebuilt tracking from scratch, discovered 60% of paid social was wasted, and moved budget to what actually sold.',
    color: 'sun',
  },
  {
    client: 'Nuveau Label',
    industry: 'Retail',
    photo: '1441986300917-64674bd600d8',
    headline: 'Online and in-store, one system',
    metric: '+52%',
    metricLabel: 'repeat purchases',
    summary: 'Unified their boutique POS with the online store, then launched loyalty emails that bring customers back.',
    color: 'sky',
  },
] as const;

export const TESTIMONIALS = [
  {
    quote: 'They rebuilt our checkout in under two weeks. Cart abandonment dropped 22% the first month. It feels like having our own in-house team.',
    name: 'Jordan Miles',
    role: 'CEO, Vantage Studio',
    photo: '1472099645785-5658abf4ff4e',
  },
  {
    quote: 'Whenever something goes wrong, I message Sofia and it’s handled within the hour. I’ve never had an agency actually pick up like this.',
    name: 'Simone Archer',
    role: 'Founder, Lumière Co.',
    photo: '1544005313-94ddf0286df2',
  },
  {
    quote: 'The tracking work alone paid for a year of retainer. We finally know which ads make money.',
    name: 'Ben Carter',
    role: 'Head of Growth, AeroKit',
    photo: '1556157382-97eda2d62296',
  },
];

export function person(name: string): Person {
  const found = [...TEAM, ...SUPPORT_TEAM].find((p) => p.name === name);
  if (!found) throw new Error(`Unknown team member: ${name}`);
  return found;
}

export const OFFICE_PHOTOS = {
  team: '1522071820081-009f0129c71c',
  laughing: '1543269865-cbf427effbad',
  highFive: '1600880292203-757bb62b4baf',
  stickies: '1531482615713-2afd69097998',
  coding: '1517245386807-bb43f82c33c4',
  talk: '1556761175-5973dc0f32e7',
  studio: '1559136555-9303baea8ebd',
  pairing: '1551836022-d5d88e9218df',
  offsite: '1529156069898-49953e39b3ac',
  checkout: '1556745757-8d76bdb6984b',
};

export const SUPPORT_HOURS = {
  timeZone: 'America/New_York',
  // 0 = Sunday … 6 = Saturday; [openHour, closeHour) in 24h time
  days: { 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [10, 16] } as Record<number, [number, number]>,
  label: 'Mon–Fri 8am–8pm ET · Sat 10am–4pm ET',
};

export const CONTACT = {
  email: 'hello@nexalab.studio',
  support: 'support@nexalab.studio',
  careers: 'careers@nexalab.studio',
  phone: '416-206-1469',
  phoneHref: 'tel:+14162061469',
};
