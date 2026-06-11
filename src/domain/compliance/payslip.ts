/**
 * Payslip Rendering — Statutory Outputs to PDF/Display
 *
 * Renders statutory payslips from compliance computation outputs.
 * All money formatting happens here (paise → ₹ at the UI edge).
 * generatePayslipHTML is a pure function: no DOM access, no I/O.
 */

import type { Employee, PayrollPeriod, StatutoryOutputs } from "./calculator.js";
import type { Jurisdiction } from "./types.js";

// ============================================================================
// PAYSLIP RECORD TYPE
// ============================================================================

export interface PayslipRecord {
  runId: string;
  paymentDate: string;          // ISO 8601 date e.g. '2026-06-30'
  period: PayrollPeriod;        // from calculator.ts
  employee: Employee;           // from calculator.ts (department?: string added)
  outputs: StatutoryOutputs;    // from calculator.ts
  // Statutory IDs — may be empty strings in prototype/mock
  uan: string;                  // UAN / PF member ID
  esiNumber: string;            // ESI insurance number (empty if gross > ₹21k)
  pan: string;                  // Employee PAN
  pfAccountNumber: string;      // Regional PF office account number
  companyName: string;
  companyAddress: string;
  companyPan: string;
}

// ============================================================================
// MONEY FORMATTING
// ============================================================================

/**
 * Format integer paise as ₹ string with Indian number grouping.
 * Uses integer arithmetic only — never floats.
 *
 * Examples:
 *   formatPaise(0)          → "₹0.00"
 *   formatPaise(1)          → "₹0.01"
 *   formatPaise(5_000_000)  → "₹50,000.00"
 *   formatPaise(10_000_000) → "₹1,00,000.00"
 */
export function formatPaise(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const paiseRemainder = abs % 100;
  const formatted = new Intl.NumberFormat("en-IN").format(rupees);
  const sign = paise < 0 ? "−" : "";
  return `${sign}₹${formatted}.${String(paiseRemainder).padStart(2, "0")}`;
}

// ============================================================================
// PT LABEL MAP
// ============================================================================

const PT_LABEL: Partial<Record<Jurisdiction, string>> = {
  MH: "Professional Tax (Maharashtra)",
  TN: "Professional Tax (Tamil Nadu)",
  KA: "Professional Tax (Karnataka)",
  TG: "Professional Tax (Telangana)",
  KL: "Professional Tax (Kerala)",
  WB: "Professional Tax (West Bengal)",
  AP: "Professional Tax (Andhra Pradesh)",
  MP: "Professional Tax (Madhya Pradesh)",
};

// Jurisdictions where PT is not levied
const PT_NOT_APPLICABLE: Jurisdiction[] = ["DL", "RJ", "UP", "HR", "GJ", "PB"];

// ============================================================================
// MONTH DISPLAY HELPER
// ============================================================================

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPeriod(period: PayrollPeriod): string {
  return `${MONTH_NAMES[period.month]} ${period.year}`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================================
// HTML GENERATION — pure function, no DOM access, inline styles only
// ============================================================================

/**
 * Generate a complete, self-contained HTML payslip string.
 * Pure function — no side effects, no DOM, no I/O.
 * Inline styles only (no external CSS dependency).
 */
export function generatePayslipHTML(record: PayslipRecord): string {
  const { employee, outputs, period } = record;

  const showPT =
    outputs.ptPaise > 0 ||
    (PT_LABEL[employee.jurisdiction] !== undefined &&
      !PT_NOT_APPLICABLE.includes(employee.jurisdiction));

  const ptLabel =
    PT_LABEL[employee.jurisdiction] ?? `Professional Tax (${employee.jurisdiction})`;

  const showESI = outputs.esiEmployeePaise > 0;

  // Earnings breakdown: basic + HRA (25% of basic) + special allowance (gross - basic - HRA)
  const hraPaise = Math.floor(employee.basicSalaryPaise * 0.25);
  const specialAllowancePaise = Math.max(
    0,
    employee.grossSalaryPaise - employee.basicSalaryPaise - hraPaise
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip — ${escHtml(employee.name)} — ${escHtml(formatPeriod(period))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
      font-size: 13px;
      color: #111;
      background: #fff;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a5f2e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-name { font-size: 18px; font-weight: 700; color: #1a5f2e; }
    .company-sub { font-size: 12px; color: #555; margin-top: 2px; }
    .payslip-title {
      text-align: right;
      font-size: 16px;
      font-weight: 700;
      color: #111;
    }
    .payslip-sub { font-size: 12px; color: #555; margin-top: 2px; }
    .employee-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      background: #f5f7f5;
      border: 1px solid #dde;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: 0.4px; }
    .field-value { font-size: 13px; font-weight: 600; color: #111; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1a5f2e;
      margin: 14px 0 6px;
      border-bottom: 1px solid #c8e6c9;
      padding-bottom: 4px;
    }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 4px; font-size: 13px; }
    td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    tr.subtotal td {
      border-top: 1px solid #ddd;
      font-weight: 700;
      padding-top: 6px;
    }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
    .net-pay-box {
      background: #1a5f2e;
      color: #fff;
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
    }
    .net-pay-label { font-size: 13px; font-weight: 600; }
    .net-pay-amount { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .statutory-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
      font-size: 12px;
      margin-top: 6px;
    }
    .statutory-item { display: flex; gap: 6px; }
    .statutory-label { color: #666; min-width: 120px; }
    .statutory-value { font-weight: 600; color: #111; }
    .employer-note { font-size: 11px; color: #888; font-style: italic; margin-top: 4px; }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      font-size: 11px;
      color: #888;
      text-align: center;
      line-height: 1.6;
    }
    .run-sig { font-family: monospace; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="company-name">${escHtml(record.companyName)}</div>
      <div class="company-sub">${escHtml(record.companyAddress)}</div>
      <div class="company-sub">PAN: ${escHtml(record.companyPan)}</div>
    </div>
    <div>
      <div class="payslip-title">PAYSLIP</div>
      <div class="payslip-sub">${escHtml(formatPeriod(period))}</div>
      <div class="payslip-sub">Payment Date: ${escHtml(formatDate(record.paymentDate))}</div>
    </div>
  </div>

  <!-- EMPLOYEE INFO -->
  <div class="employee-grid">
    <div class="field">
      <span class="field-label">Employee Name</span>
      <span class="field-value">${escHtml(employee.name)}</span>
    </div>
    <div class="field">
      <span class="field-label">Employee ID</span>
      <span class="field-value">${escHtml(employee.employeeId)}</span>
    </div>
    ${employee.department ? `<div class="field">
      <span class="field-label">Department</span>
      <span class="field-value">${escHtml(employee.department)}</span>
    </div>` : ""}
    <div class="field">
      <span class="field-label">Annual CTC</span>
      <span class="field-value">${formatPaise(employee.ctcAnnualPaise)}</span>
    </div>
    <div class="field">
      <span class="field-label">Gross Salary (Monthly)</span>
      <span class="field-value">${formatPaise(employee.grossSalaryPaise)}</span>
    </div>
    <div class="field">
      <span class="field-label">PF / UAN</span>
      <span class="field-value">${escHtml(record.uan || "—")}</span>
    </div>
    <div class="field">
      <span class="field-label">PAN</span>
      <span class="field-value">${escHtml(record.pan || "—")}</span>
    </div>
    ${record.uan ? `<div class="field">
      <span class="field-label">PF Account No.</span>
      <span class="field-value">${escHtml(record.pfAccountNumber || "—")}</span>
    </div>` : ""}
    ${showESI || record.esiNumber ? `<div class="field">
      <span class="field-label">ESI Number</span>
      <span class="field-value">${escHtml(record.esiNumber || "—")}</span>
    </div>` : ""}
  </div>

  <!-- EARNINGS + DEDUCTIONS side-by-side -->
  <div class="two-col">

    <!-- EARNINGS -->
    <div>
      <div class="section-title">Earnings</div>
      <table>
        <tr>
          <td>Basic Salary</td>
          <td>${formatPaise(employee.basicSalaryPaise)}</td>
        </tr>
        <tr>
          <td>House Rent Allowance (HRA)</td>
          <td>${formatPaise(hraPaise)}</td>
        </tr>
        ${specialAllowancePaise > 0 ? `<tr>
          <td>Special Allowance</td>
          <td>${formatPaise(specialAllowancePaise)}</td>
        </tr>` : ""}
        <tr class="subtotal">
          <td>Gross Pay</td>
          <td>${formatPaise(outputs.grossPaise)}</td>
        </tr>
      </table>
    </div>

    <!-- DEDUCTIONS -->
    <div>
      <div class="section-title">Deductions</div>
      <table>
        <tr>
          <td>Provident Fund (Employee)</td>
          <td>${formatPaise(outputs.pfEmployeePaise)}</td>
        </tr>
        ${showESI ? `<tr>
          <td>ESI (Employee)</td>
          <td>${formatPaise(outputs.esiEmployeePaise)}</td>
        </tr>` : ""}
        <tr>
          <td>Tax Deducted at Source (TDS)</td>
          <td>${formatPaise(outputs.tdsPaise)}</td>
        </tr>
        ${showPT ? `<tr>
          <td>${escHtml(ptLabel)}</td>
          <td>${formatPaise(outputs.ptPaise)}</td>
        </tr>` : ""}
        <tr class="subtotal">
          <td>Total Deductions</td>
          <td>${formatPaise(outputs.totalDeductionsPaise)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- NET PAY -->
  <div class="net-pay-box">
    <span class="net-pay-label">Net Pay (Take-Home)</span>
    <span class="net-pay-amount">${formatPaise(outputs.netPayPaise)}</span>
  </div>

  <!-- EMPLOYER CONTRIBUTIONS (informational) -->
  <div class="section-title">Employer Contributions (Informational — not deducted from salary)</div>
  <table>
    <tr>
      <td>Provident Fund (Employer)</td>
      <td>${formatPaise(outputs.pfEmployerPaise)}</td>
    </tr>
    ${outputs.esiEmployerPaise > 0 ? `<tr>
      <td>ESI (Employer)</td>
      <td>${formatPaise(outputs.esiEmployerPaise)}</td>
    </tr>` : ""}
  </table>
  <div class="employer-note">Employer contributions are part of your CTC but are not deducted from your take-home pay.</div>

  <!-- STATUTORY DISCLOSURES -->
  <div class="section-title">Statutory Disclosures</div>
  <div class="statutory-grid">
    <div class="statutory-item">
      <span class="statutory-label">PF Rule Applied:</span>
      <span class="statutory-value">${escHtml(outputs.appliedRules.pf)}</span>
    </div>
    <div class="statutory-item">
      <span class="statutory-label">ESI Rule Applied:</span>
      <span class="statutory-value">${escHtml(outputs.appliedRules.esi)}</span>
    </div>
    <div class="statutory-item">
      <span class="statutory-label">TDS Rule Applied:</span>
      <span class="statutory-value">${escHtml(outputs.appliedRules.tds)}</span>
    </div>
    ${outputs.appliedRules.pt ? `<div class="statutory-item">
      <span class="statutory-label">PT Rule Applied:</span>
      <span class="statutory-value">${escHtml(outputs.appliedRules.pt)}</span>
    </div>` : ""}
    <div class="statutory-item">
      <span class="statutory-label">Pay Period:</span>
      <span class="statutory-value">${escHtml(formatPeriod(period))}</span>
    </div>
    <div class="statutory-item">
      <span class="statutory-label">Payment Date:</span>
      <span class="statutory-value">${escHtml(formatDate(record.paymentDate))}</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    This payslip is computer-generated and is valid without signature.
    Computed under the applicable Labour Codes and statutory rules in force for the pay period.<br />
    <span class="run-sig">Run ID: ${escHtml(record.runId)}</span>
  </div>

</body>
</html>`;
}

// ============================================================================
// ESCAPE HTML — prevent XSS in generated HTML
// ============================================================================

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================================
// MOCK PAYSLIP — for tests and prototype demo
// ============================================================================

export const MOCK_PAYSLIP: PayslipRecord = {
  runId: "RUN-2026-06-001",
  paymentDate: "2026-06-30",
  period: { year: 2026, month: 6, periodString: "2026-06" },
  employee: {
    employeeId: "EMP001",
    name: "Aditya Sharma",
    department: "Engineering",
    basicSalaryPaise: 2_500_000,    // ₹25,000
    grossSalaryPaise: 5_000_000,    // ₹50,000
    ctcAnnualPaise: 70_000_000,     // ₹7,00,000
    jurisdiction: "MH",
    pfOptOut: false,
    esiApplicable: false,           // gross > ₹21k → ESI not applicable
  },
  outputs: {
    grossPaise: 5_000_000,
    pfEmployeePaise: 180_000,       // 12% of min(₹25k, ₹15k) = 12% × ₹15k = ₹1,800
    pfEmployerPaise: 180_000,
    esiEmployeePaise: 0,
    esiEmployerPaise: 0,
    tdsPaise: 0,                    // 87A rebate (annual taxable < ₹7L)
    ptPaise: 20_000,                // MH ₹200/month
    totalDeductionsPaise: 200_000,  // PF + PT = ₹1,800 + ₹200
    netPayPaise: 4_800_000,         // ₹48,000
    appliedRules: {
      pf: "pf-in-2025-04",
      esi: "esi-in-2025-04",
      tds: "tds-in-2025-04",
      pt: "pt-mh-2025-04",
    },
  },
  uan: "MH/45678/01234",
  esiNumber: "",
  pan: "ABCDE1234F",
  pfAccountNumber: "MH/MUM/0012345/000/0001234",
  companyName: "Acme Pvt Ltd",
  companyAddress: "Mumbai, Maharashtra",
  companyPan: "AABCA1234D",
};
