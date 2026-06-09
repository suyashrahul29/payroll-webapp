# Domain Research — Indian Payroll Statutory Compliance

**Author:** Suyash · **Date:** 2026-06-09 · **Project:** payroll-webapp

> Compliance is the non-negotiable floor for any Indian payroll product. As of late 2025 the domain is mid-reform — the **Four Labour Codes are now in force**, which is both a compliance risk and a differentiation opportunity for a new entrant.

## 1. The Four Labour Codes — IN FORCE since 21 Nov 2025

Four codes replaced 29 legacy labour laws: **Code on Wages, Code on Social Security, Industrial Relations Code, OSH Code.** Effective **21 November 2025** (with some state-level exceptions).

**Critical caveat:** Detailed **Central & State implementation rules are still being finalized** (ongoing into 2026). Calculation specifics will keep shifting — our product must treat compliance logic as **configurable/versioned, not hard-coded.**

### Payroll-impacting changes
- **50% Wage Rule:** Basic pay (incl. DA) must be **≥ 50% of total CTC**. Directly inflates PF, gratuity, and bonus bases → forces salary-structure redesign for most employers. **High-value migration/restructuring feature opportunity.**
- **Final settlement within 2 working days** of separation (was much longer). Ties *directly* to PLAN.md's Lifecycle-to-Payroll Clock and F&F pain point.
- **Gratuity for fixed-term employees after 1 year** continuous service (was 5 years).
- **Fully digital record-keeping mandated:** wage registers, attendance, PF/ESI/LWF records — month-wise, employee-wise, digital.
- **Social security extended to gig/platform/unorganised workers.**

## 2. Core Statutory Contributions & Deadlines

| Item | Rate / Rule | Deadline |
|---|---|---|
| **EPF (PF)** | 12% employee + 12% employer | Remit by **15th** of each month |
| **ESI** | 0.75% employee + 3.25% employer | Remit by **15th** of each month |
| **TDS** | Per income-tax slabs | Deposit by **7th** of following month (Mar: 30 Apr) |
| **Professional Tax (PT)** | State-specific slabs | Varies by state |
| **Gratuity** | 15 days' wages/yr of service | On separation |
| **LWF** | State-specific | Periodic (state) |

**Income Tax Act 2025:** **Form 16 replaced by Form 130** as the annual TDS certificate.

## 3. Domain Implications for the Product

1. **Compliance engine must be rules-versioned & state-aware** — codes are live but rules still landing; PT/LWF are per-state. Build for change, not a 2025 snapshot.
2. **The 50% wage-restructuring moment is a wedge** — every mid-size employer needs structure remodeling *now*; a guided restructure-and-impact-preview tool is a strong acquisition hook.
3. **2-day final settlement makes the Lifecycle-to-Payroll Clock a compliance feature, not just UX** — late F&F is now a legal breach, sharpening the pain in PLAN.md.
4. **Digital record mandate validates the data-supply-chain thesis** — audit-ready, freshness-tracked records (Data Freshness Vitals) map directly to a new legal requirement.
5. **Deadline calendar (15th / 7th / state PT)** should drive the Payroll Readiness Score's countdown logic.

## Glossary
- **EPF / PF** — Employees' Provident Fund · **ESI** — Employees' State Insurance · **TDS** — Tax Deducted at Source · **PT** — Professional Tax (state) · **LWF** — Labour Welfare Fund · **F&F** — Full & Final settlement · **CTC** — Cost to Company · **LOP** — Loss of Pay · **DA** — Dearness Allowance.

## Sources
- [EY India — New Labour Codes effective 21 Nov 2025](https://www.ey.com/en_in/technical/alerts-hub/2025/11/new-labour-codes-implemented-across-the-country-effective-21-november-2025)
- [PwC India — New Labour Codes roadmap](https://www.pwc.in/tax-knowledge-hub/new-labour-codes.html)
- [Ministry of Labour — Additional FAQs on Labour Codes (Mar 2026)](https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf)
- [SalaryBox — Statutory Compliance Guide 2026](https://salarybox.in/complete-guide-to-statutory-compliance-for-indian-businesses-2026-pf-esi-tds-professional-tax-labour-codes/)
- [Ramco — Payroll Compliance India 2026–27](https://www.ramco.com/blog/payroll/payroll-compliance-india-employer-guide-2026-27)
- [PayrollOrg — India Labour Codes in force](https://payroll.org/news-resources/news/news-detail/2025/12/17/india-s-new-labour-codes-are-in-force-payroll-teams-must-act)
