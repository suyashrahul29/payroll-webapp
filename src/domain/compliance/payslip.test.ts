import { formatPaise, generatePayslipHTML, MOCK_PAYSLIP, PayslipRecord } from "./payslip.js";

// ============================================================================
// formatPaise
// ============================================================================

describe("formatPaise", () => {
  it("formats 0 paise as ₹0.00", () => {
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("formats 1 paise as ₹0.01", () => {
    expect(formatPaise(1)).toBe("₹0.01");
  });

  it("formats 5_000_000 paise (₹50,000) with correct Indian grouping", () => {
    expect(formatPaise(5_000_000)).toBe("₹50,000.00");
  });

  it("formats 10_000_000 paise (₹1,00,000) with Indian lakh grouping", () => {
    // Indian grouping: 1,00,000 — not 100,000
    expect(formatPaise(10_000_000)).toBe("₹1,00,000.00");
  });
});

// ============================================================================
// generatePayslipHTML
// ============================================================================

describe("generatePayslipHTML", () => {
  it("includes the employee name in the output", () => {
    const html = generatePayslipHTML(MOCK_PAYSLIP);
    expect(html).toContain("Aditya Sharma");
  });

  it("includes the formatted net pay in the output", () => {
    const html = generatePayslipHTML(MOCK_PAYSLIP);
    // Net pay = ₹48,000 = 4_800_000 paise
    expect(html).toContain("₹48,000.00");
  });

  it("includes the Professional Tax label for MH jurisdiction", () => {
    const html = generatePayslipHTML(MOCK_PAYSLIP);
    expect(html).toContain("Professional Tax (Maharashtra)");
  });

  it("omits the PT row when ptPaise is 0 and jurisdiction has no PT (Delhi)", () => {
    const delhiRecord: PayslipRecord = {
      ...MOCK_PAYSLIP,
      employee: {
        ...MOCK_PAYSLIP.employee,
        jurisdiction: "DL",
      },
      outputs: {
        ...MOCK_PAYSLIP.outputs,
        ptPaise: 0,
        appliedRules: {
          ...MOCK_PAYSLIP.outputs.appliedRules,
          pt: null,
        },
      },
    };
    const html = generatePayslipHTML(delhiRecord);
    expect(html).not.toContain("Professional Tax");
  });

  it("escapes HTML in employee name to prevent XSS", () => {
    const xssRecord: PayslipRecord = {
      ...MOCK_PAYSLIP,
      employee: {
        ...MOCK_PAYSLIP.employee,
        name: '<script>alert("xss")</script>',
      },
    };
    const html = generatePayslipHTML(xssRecord);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes the run ID in the footer", () => {
    const html = generatePayslipHTML(MOCK_PAYSLIP);
    expect(html).toContain("RUN-2026-06-001");
  });

  it("shows ESI row when esiEmployeePaise > 0", () => {
    const esiRecord: PayslipRecord = {
      ...MOCK_PAYSLIP,
      employee: {
        ...MOCK_PAYSLIP.employee,
        grossSalaryPaise: 1_500_000, // ₹15,000 — below ESI ceiling
        esiApplicable: true,
      },
      outputs: {
        ...MOCK_PAYSLIP.outputs,
        esiEmployeePaise: 11_250,    // 0.75% of ₹15,000
        esiEmployerPaise: 48_750,    // 3.25% of ₹15,000
      },
    };
    const html = generatePayslipHTML(esiRecord);
    expect(html).toContain("ESI (Employee)");
    expect(html).toContain("ESI (Employer)");
  });

  it("includes company name in the output", () => {
    const html = generatePayslipHTML(MOCK_PAYSLIP);
    expect(html).toContain("Acme Pvt Ltd");
  });
});
