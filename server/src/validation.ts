import { z } from 'zod';

// Canonical employee shape — modeled on app/import.html's normalized record
// (the richer of the two prototype shapes), with CTC already in integer paise.
export const employeeRow = z.object({
  employee_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  department: z.string().trim().default(''),
  ctc_annual_paise: z.number().int().nonnegative(),
  doj: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'doj must be YYYY-MM-DD'),
  state: z
    .string()
    .trim()
    .length(2, 'state must be a 2-letter code')
    .transform((s) => s.toUpperCase()),
});

export const importRequest = z.object({
  source: z.string().trim().default('CSV'),
  row_count: z.number().int().nonnegative(),
  employees: z.array(employeeRow).min(1),
});

export type EmployeeRow = z.infer<typeof employeeRow>;
export type ImportRequest = z.infer<typeof importRequest>;
