(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/nexalab/src/components/StatCounter.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StatCounter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function Counter({ count, prefix = '', suffix = '', decimals = 0 }) {
    _s();
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const animated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Counter.useEffect": ()=>{
            const el = ref.current;
            if (!el) return;
            const observer = new IntersectionObserver({
                "Counter.useEffect": ([entry])=>{
                    if (!entry.isIntersecting || animated.current) return;
                    animated.current = true;
                    const duration = 1600;
                    let start = null;
                    const step = {
                        "Counter.useEffect.step": (ts)=>{
                            if (!start) start = ts;
                            const progress = Math.min((ts - start) / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            setValue(eased * count);
                            if (progress < 1) requestAnimationFrame(step);
                            else setValue(count);
                        }
                    }["Counter.useEffect.step"];
                    requestAnimationFrame(step);
                }
            }["Counter.useEffect"], {
                threshold: 0.5
            });
            observer.observe(el);
            return ({
                "Counter.useEffect": ()=>observer.disconnect()
            })["Counter.useEffect"];
        }
    }["Counter.useEffect"], [
        count
    ]);
    const display = decimals ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        ref: ref,
        children: [
            prefix,
            display,
            suffix
        ]
    }, void 0, true, {
        fileName: "[project]/nexalab/src/components/StatCounter.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(Counter, "3GlYL7HNdX5qiF3Lxls+FGv65YM=");
_c = Counter;
function StatCounter({ items }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "stats-section",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "stats-grid",
                children: items.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "stat-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-val",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Counter, {
                                    count: item.count,
                                    prefix: item.prefix,
                                    suffix: item.suffix,
                                    decimals: item.decimals
                                }, void 0, false, {
                                    fileName: "[project]/nexalab/src/components/StatCounter.tsx",
                                    lineNumber: 62,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/nexalab/src/components/StatCounter.tsx",
                                lineNumber: 61,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "stat-label",
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/nexalab/src/components/StatCounter.tsx",
                                lineNumber: 69,
                                columnNumber: 15
                            }, this)
                        ]
                    }, i, true, {
                        fileName: "[project]/nexalab/src/components/StatCounter.tsx",
                        lineNumber: 60,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/nexalab/src/components/StatCounter.tsx",
                lineNumber: 58,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/nexalab/src/components/StatCounter.tsx",
            lineNumber: 57,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/nexalab/src/components/StatCounter.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_c1 = StatCounter;
var _c, _c1;
__turbopack_context__.k.register(_c, "Counter");
__turbopack_context__.k.register(_c1, "StatCounter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nexalab/src/components/FaqAccordion.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FaqAccordion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function FaqAccordion({ items }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "faq-list",
        style: {
            marginTop: '2rem'
        },
        children: items.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "faq-item",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `faq-toggle${open === i ? ' is-open' : ''}`,
                        "aria-expanded": open === i,
                        onClick: ()=>setOpen(open === i ? null : i),
                        children: item.question
                    }, void 0, false, {
                        fileName: "[project]/nexalab/src/components/FaqAccordion.tsx",
                        lineNumber: 17,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "faq-panel",
                        style: {
                            maxHeight: open === i ? '400px' : '0px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: item.answer
                        }, void 0, false, {
                            fileName: "[project]/nexalab/src/components/FaqAccordion.tsx",
                            lineNumber: 28,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/nexalab/src/components/FaqAccordion.tsx",
                        lineNumber: 24,
                        columnNumber: 11
                    }, this)
                ]
            }, i, true, {
                fileName: "[project]/nexalab/src/components/FaqAccordion.tsx",
                lineNumber: 16,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/nexalab/src/components/FaqAccordion.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_s(FaqAccordion, "3gHT60S3lHEhyYybFcB05ha95j4=");
_c = FaqAccordion;
var _c;
__turbopack_context__.k.register(_c, "FaqAccordion");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nexalab/src/components/RevealWrapper.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RevealWrapper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nexalab/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
function RevealWrapper({ children }) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RevealWrapper.useEffect": ()=>{
            const container = ref.current;
            if (!container) return;
            const targets = container.querySelectorAll('.card, .stat-card, .faq-item, .tool-card, .highlight-card, .module-card, .pricing-card, .step, .testimonial-card');
            if (!targets.length) return;
            const observer = new IntersectionObserver({
                "RevealWrapper.useEffect": (entries, o)=>{
                    entries.forEach({
                        "RevealWrapper.useEffect": (e)=>{
                            if (e.isIntersecting) {
                                e.target.classList.add('in-view');
                                o.unobserve(e.target);
                            }
                        }
                    }["RevealWrapper.useEffect"]);
                }
            }["RevealWrapper.useEffect"], {
                threshold: 0.12
            });
            targets.forEach({
                "RevealWrapper.useEffect": (el, i)=>{
                    el.classList.add('reveal');
                    el.style.transitionDelay = `${Math.min(i * 40, 240)}ms`;
                    observer.observe(el);
                }
            }["RevealWrapper.useEffect"]);
            return ({
                "RevealWrapper.useEffect": ()=>observer.disconnect()
            })["RevealWrapper.useEffect"];
        }
    }["RevealWrapper.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nexalab$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        children: children
    }, void 0, false, {
        fileName: "[project]/nexalab/src/components/RevealWrapper.tsx",
        lineNumber: 37,
        columnNumber: 10
    }, this);
}
_s(RevealWrapper, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = RevealWrapper;
var _c;
__turbopack_context__.k.register(_c, "RevealWrapper");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=nexalab_src_components_06t_b5l._.js.map