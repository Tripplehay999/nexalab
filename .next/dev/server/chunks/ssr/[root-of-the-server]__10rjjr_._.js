module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/nexalab/src/lib/jobs.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JOBS",
    ()=>JOBS,
    "getJob",
    ()=>getJob
]);
const JOBS = [
    {
        slug: 'senior-full-stack-engineer',
        title: 'Senior Full-Stack Engineer',
        department: 'Engineering',
        location: 'Remote (US / EU)',
        type: 'Full-time',
        salary: '$140k – $180k + equity',
        summary: 'Own features end-to-end across our commerce platform and client builds — from database schema to the pixel on the storefront.',
        responsibilities: [
            'Design, build, and ship features across Next.js, TypeScript, and Postgres (Supabase).',
            'Lead technical scoping for client engagements and turn fuzzy goals into shippable plans.',
            'Build integrations with Shopify, Stripe, shipping carriers, and third-party APIs.',
            'Review code, mentor engineers, and raise the bar on reliability and performance.'
        ],
        requirements: [
            '5+ years building production web applications.',
            'Deep experience with React, TypeScript, and a relational database.',
            'Comfortable owning a feature from spec through deploy and monitoring.',
            'Clear written communication — we work async-first.'
        ],
        niceToHave: [
            'E-commerce or payments experience.',
            'Experience with edge functions, background jobs, or event-driven systems.'
        ]
    },
    {
        slug: 'frontend-engineer',
        title: 'Frontend Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        salary: '$110k – $145k + equity',
        summary: 'Build fast, accessible, conversion-focused storefronts and dashboards that our clients use every day.',
        responsibilities: [
            'Turn designs into polished, responsive React interfaces.',
            'Own Core Web Vitals and accessibility across client storefronts.',
            'Build and maintain shared UI components for our client portal and admin tools.',
            'Run A/B tests on checkout and landing flows with the growth team.'
        ],
        requirements: [
            '3+ years of professional frontend experience.',
            'Strong command of React, modern CSS, and browser performance.',
            'An eye for detail and a portfolio of shipped work.'
        ],
        niceToHave: [
            'Experience with Next.js App Router and server components.',
            'Animation or motion design skills.'
        ]
    },
    {
        slug: 'devops-platform-engineer',
        title: 'DevOps / Platform Engineer',
        department: 'Engineering',
        location: 'Remote (US)',
        type: 'Full-time',
        salary: '$130k – $165k + equity',
        summary: 'Keep our infrastructure secure, observable, and boring — so product teams can ship quickly without breaking things.',
        responsibilities: [
            'Own CI/CD, environments, and deployment pipelines across projects.',
            'Set up monitoring, alerting, and incident response.',
            'Harden security: secrets management, access control, and compliance readiness.',
            'Reduce cloud costs and improve build times.'
        ],
        requirements: [
            '4+ years in DevOps, SRE, or platform roles.',
            'Hands-on experience with Vercel, AWS or GCP, and Postgres.',
            'Strong scripting skills (TypeScript, Bash, or Python).'
        ],
        niceToHave: [
            'SOC 2 or PCI compliance experience.',
            'Infrastructure-as-code (Terraform, Pulumi).'
        ]
    },
    {
        slug: 'product-designer',
        title: 'Product Designer',
        department: 'Design',
        location: 'Remote',
        type: 'Full-time',
        salary: '$100k – $135k + equity',
        summary: 'Design storefronts, checkout flows, and internal tools that look premium and convert.',
        responsibilities: [
            'Lead UX and UI for client storefronts and our own platform.',
            'Create wireframes, prototypes, and production-ready Figma files.',
            'Maintain and grow our design system.',
            'Partner with engineers through build to make sure the details land.'
        ],
        requirements: [
            '3+ years of product or web design experience.',
            'A portfolio showing shipped, end-to-end work.',
            'Fluency in Figma and design systems.'
        ],
        niceToHave: [
            'E-commerce or DTC brand experience.',
            'Basic HTML/CSS knowledge.'
        ]
    },
    {
        slug: 'growth-marketing-manager',
        title: 'Growth Marketing Manager',
        department: 'Growth',
        location: 'Remote (US)',
        type: 'Full-time',
        salary: '$90k – $120k + bonus',
        summary: 'Drive pipeline for NexaLab through content, paid acquisition, partnerships, and lifecycle campaigns.',
        responsibilities: [
            'Plan and run multi-channel campaigns that generate qualified demos.',
            'Own our content calendar, case studies, and newsletter.',
            'Track funnel metrics and report on what is working.',
            'Partner with sales on messaging and positioning.'
        ],
        requirements: [
            '3+ years in B2B or SaaS marketing.',
            'Hands-on with analytics, paid social/search, and email tools.',
            'Strong writer with a data-driven mindset.'
        ],
        niceToHave: [
            'Experience marketing to e-commerce brands.'
        ]
    },
    {
        slug: 'client-success-manager',
        title: 'Client Success Manager',
        department: 'Operations',
        location: 'Remote (US)',
        type: 'Full-time',
        salary: '$70k – $90k + bonus',
        summary: 'Be the main point of contact for our clients — keep projects on track and make sure every client feels taken care of.',
        responsibilities: [
            'Onboard new clients and run kickoff calls.',
            'Manage timelines, milestones, and communication across active projects.',
            'Triage support tickets and coordinate with the engineering team.',
            'Identify upsell and renewal opportunities.'
        ],
        requirements: [
            '2+ years in client success, account management, or project management.',
            'Highly organized and calm under pressure.',
            'Excellent written and verbal communication.'
        ],
        niceToHave: [
            'Agency or SaaS background.',
            'Familiarity with technical projects.'
        ]
    }
];
function getJob(slug) {
    return JOBS.find((j)=>j.slug === slug);
}
}),
"[project]/nexalab/src/app/careers/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CareersPage,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/src/lib/jobs.ts [app-rsc] (ecmascript)");
;
;
;
const metadata = {
    title: 'Careers — NexaLab',
    description: 'Join NexaLab. We are hiring engineers, designers, and operators to build commerce infrastructure that compounds.'
};
const PERKS = [
    {
        title: 'Remote-first',
        body: 'Work from anywhere with async-first collaboration and a few overlap hours.'
    },
    {
        title: 'Competitive pay + equity',
        body: 'Top-of-market salaries and meaningful ownership in what we build.'
    },
    {
        title: 'Health coverage',
        body: 'Medical, dental, and vision for you and your dependents.'
    },
    {
        title: 'Learning budget',
        body: '$2,000 / year for courses, books, and conferences.'
    },
    {
        title: 'Flexible time off',
        body: 'Minimum 20 days a year — and we actually make sure you take them.'
    },
    {
        title: 'Home office setup',
        body: '$1,500 to set up a workspace you love.'
    }
];
const DEPARTMENTS = [
    'Engineering',
    'Design',
    'Growth',
    'Operations'
];
function CareersPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "page-hero",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "eyebrow",
                            children: "Careers"
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            children: "Build the systems that power modern commerce."
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 27,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "subtitle",
                            children: "We're a small, senior team shipping infrastructure for growing brands. If you like ownership, fast feedback loops, and work that compounds — we'd love to meet you."
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 28,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "careers-hero-actions",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "#open-roles",
                                    className: "btn btn-primary",
                                    children: [
                                        "See open roles (",
                                        __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["JOBS"].length,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                    lineNumber: 32,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/careers/general-application",
                                    className: "btn btn-outline",
                                    children: "General application"
                                }, void 0, false, {
                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                    lineNumber: 33,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                    lineNumber: 25,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/nexalab/src/app/careers/page.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "section section-alt",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "section-label",
                            children: "Why NexaLab"
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            children: "Benefits & perks"
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 41,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "perk-grid",
                            children: PERKS.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                    className: "card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            children: p.title
                                        }, void 0, false, {
                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                            lineNumber: 45,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: p.body
                                        }, void 0, false, {
                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                            lineNumber: 46,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, p.title, true, {
                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                    lineNumber: 44,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                    lineNumber: 39,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/nexalab/src/app/careers/page.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                id: "open-roles",
                className: "section",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "section-label",
                            children: "Open roles"
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 55,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            children: "Find your role"
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 56,
                            columnNumber: 11
                        }, this),
                        DEPARTMENTS.map((dept)=>{
                            const roles = __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$src$2f$lib$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["JOBS"].filter((j)=>j.department === dept);
                            if (!roles.length) return null;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "job-dept",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "job-dept-title",
                                        children: dept
                                    }, void 0, false, {
                                        fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                        lineNumber: 62,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "job-list",
                                        children: roles.map((job)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                    href: `/careers/${job.slug}`,
                                                    className: "job-row",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    className: "job-row-title",
                                                                    children: job.title
                                                                }, void 0, false, {
                                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                                    lineNumber: 68,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "job-row-summary",
                                                                    children: job.summary
                                                                }, void 0, false, {
                                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                                    lineNumber: 69,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                            lineNumber: 67,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "job-row-meta",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: job.location
                                                                }, void 0, false, {
                                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                                    lineNumber: 72,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: job.type
                                                                }, void 0, false, {
                                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                                    lineNumber: 73,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "job-row-cta",
                                                                    children: "Apply →"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                                    lineNumber: 74,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                            lineNumber: 71,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                    lineNumber: 66,
                                                    columnNumber: 23
                                                }, this)
                                            }, job.slug, false, {
                                                fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                                lineNumber: 65,
                                                columnNumber: 21
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                        lineNumber: 63,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, dept, true, {
                                fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                lineNumber: 61,
                                columnNumber: 15
                            }, this);
                        }),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "careers-general card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            children: "Don't see your role?"
                                        }, void 0, false, {
                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                            lineNumber: 86,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: "We're always looking for great people. Send a general application and tell us how you'd contribute."
                                        }, void 0, false, {
                                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                            lineNumber: 87,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                    lineNumber: 85,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/careers/general-application",
                                    className: "btn btn-outline",
                                    children: "Apply anyway"
                                }, void 0, false, {
                                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                                    lineNumber: 89,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nexalab/src/app/careers/page.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nexalab/src/app/careers/page.tsx",
                    lineNumber: 54,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/nexalab/src/app/careers/page.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/nexalab/src/app/careers/page.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
}),
"[project]/nexalab/src/app/careers/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/nexalab/src/app/careers/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__10rjjr_._.js.map