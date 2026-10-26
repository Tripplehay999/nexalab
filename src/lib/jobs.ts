export type Job = {
  slug: string;
  title: string;
  department: 'Engineering' | 'Design' | 'Growth' | 'Operations';
  location: string;
  type: 'Full-time' | 'Contract' | 'Part-time';
  salary: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
};

export const JOBS: Job[] = [
  {
    slug: 'senior-full-stack-engineer',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Hybrid · Toronto or Brooklyn',
    type: 'Full-time',
    salary: '$140k – $180k + equity',
    summary:
      'Own features end-to-end across our commerce platform and client builds — from database schema to the pixel on the storefront.',
    responsibilities: [
      'Design, build, and ship features across Next.js, TypeScript, and Postgres (Supabase).',
      'Lead technical scoping for client engagements and turn fuzzy goals into shippable plans.',
      'Build integrations with Shopify, Stripe, shipping carriers, and third-party APIs.',
      'Review code, mentor engineers, and raise the bar on reliability and performance.',
    ],
    requirements: [
      '5+ years building production web applications.',
      'Deep experience with React, TypeScript, and a relational database.',
      'Comfortable owning a feature from spec through deploy and monitoring.',
      'Clear written communication — we work async-first.',
    ],
    niceToHave: [
      'E-commerce or payments experience.',
      'Experience with edge functions, background jobs, or event-driven systems.',
    ],
  },
  {
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    department: 'Engineering',
    location: 'Remote (US / Canada)',
    type: 'Full-time',
    salary: '$110k – $145k + equity',
    summary:
      'Build fast, accessible, conversion-focused storefronts and dashboards that our clients use every day.',
    responsibilities: [
      'Turn designs into polished, responsive React interfaces.',
      'Own Core Web Vitals and accessibility across client storefronts.',
      'Build and maintain shared UI components for our client portal and admin tools.',
      'Run A/B tests on checkout and landing flows with the growth team.',
    ],
    requirements: [
      '3+ years of professional frontend experience.',
      'Strong command of React, modern CSS, and browser performance.',
      'An eye for detail and a portfolio of shipped work.',
    ],
    niceToHave: [
      'Experience with Next.js App Router and server components.',
      'Animation or motion design skills.',
    ],
  },
  {
    slug: 'devops-platform-engineer',
    title: 'DevOps / Platform Engineer',
    department: 'Engineering',
    location: 'Hybrid · Toronto',
    type: 'Full-time',
    salary: '$130k – $165k + equity',
    summary:
      'Keep our infrastructure secure, observable, and boring — so product teams can ship quickly without breaking things.',
    responsibilities: [
      'Own CI/CD, environments, and deployment pipelines across projects.',
      'Set up monitoring, alerting, and incident response.',
      'Harden security: secrets management, access control, and compliance readiness.',
      'Reduce cloud costs and improve build times.',
    ],
    requirements: [
      '4+ years in DevOps, SRE, or platform roles.',
      'Hands-on experience with Vercel, AWS or GCP, and Postgres.',
      'Strong scripting skills (TypeScript, Bash, or Python).',
    ],
    niceToHave: [
      'SOC 2 or PCI compliance experience.',
      'Infrastructure-as-code (Terraform, Pulumi).',
    ],
  },
  {
    slug: 'product-designer',
    title: 'Product Designer',
    department: 'Design',
    location: 'Hybrid · Brooklyn',
    type: 'Full-time',
    salary: '$100k – $135k + equity',
    summary:
      'Design storefronts, checkout flows, and internal tools that look premium and convert.',
    responsibilities: [
      'Lead UX and UI for client storefronts and our own platform.',
      'Create wireframes, prototypes, and production-ready Figma files.',
      'Maintain and grow our design system.',
      'Partner with engineers through build to make sure the details land.',
    ],
    requirements: [
      '3+ years of product or web design experience.',
      'A portfolio showing shipped, end-to-end work.',
      'Fluency in Figma and design systems.',
    ],
    niceToHave: ['E-commerce or DTC brand experience.', 'Basic HTML/CSS knowledge.'],
  },
  {
    slug: 'growth-marketing-manager',
    title: 'Growth Marketing Manager',
    department: 'Growth',
    location: 'Remote (US / Canada)',
    type: 'Full-time',
    salary: '$90k – $120k + bonus',
    summary:
      'Drive pipeline for NexaLab through content, paid acquisition, partnerships, and lifecycle campaigns.',
    responsibilities: [
      'Plan and run multi-channel campaigns that generate qualified demos.',
      'Own our content calendar, case studies, and newsletter.',
      'Track funnel metrics and report on what is working.',
      'Partner with sales on messaging and positioning.',
    ],
    requirements: [
      '3+ years in B2B or SaaS marketing.',
      'Hands-on with analytics, paid social/search, and email tools.',
      'Strong writer with a data-driven mindset.',
    ],
    niceToHave: ['Experience marketing to e-commerce brands.'],
  },
  {
    slug: 'client-success-manager',
    title: 'Client Success Manager',
    department: 'Operations',
    location: 'Hybrid · Toronto',
    type: 'Full-time',
    salary: '$70k – $90k + bonus',
    summary:
      'Be the main point of contact for our clients — keep projects on track and make sure every client feels taken care of.',
    responsibilities: [
      'Onboard new clients and run kickoff calls.',
      'Manage timelines, milestones, and communication across active projects.',
      'Triage support tickets and coordinate with the engineering team.',
      'Identify upsell and renewal opportunities.',
    ],
    requirements: [
      '2+ years in client success, account management, or project management.',
      'Highly organized and calm under pressure.',
      'Excellent written and verbal communication.',
    ],
    niceToHave: ['Agency or SaaS background.', 'Familiarity with technical projects.'],
  },
];

export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug);
}
