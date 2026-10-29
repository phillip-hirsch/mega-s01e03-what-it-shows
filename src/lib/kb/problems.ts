// The problems inside one big ticket, counted the desk's way. causes.ts files every report under
// its cause by tenant; the desk's own notes (desk-notes.json) mark the reports that are not a flip
// at all but a one-day move. Those stay counted where they're filed and also get their own row.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEM_LABEL: Record<Problem, string> = {
  parser: 'shared parser reads day-first dates month first',
  hint: 'booking-v3 form hints MM/DD/YYYY to day-first tenants',
  'one-day': 'date moves by one day, not a month flip',
  unplaced: 'no tenant on file, or tenant writes month first',
};

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

function group(problem: Problem, reports: Report[]): ProblemGroup {
  const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports,
    tenants: [...new Set(reports.map((r) => r.tenant))].sort(),
    channels: reports.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function mergedInto(all: Report[], ticket: number): Report[] {
  return uniqueById(all).filter((r) => r.mergedInto === ticket);
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = mergedInto(all, ticket);
  const byCause = new Map<Problem, Report[]>();
  for (const r of merged) {
    const cause = causeOf(r, tenantOf(r)) ?? 'unplaced';
    byCause.set(cause, [...(byCause.get(cause) ?? []), r]);
  }
  const groups = [...byCause.entries()].map(([p, rs]) => group(p, rs));
  const oneDay = merged.filter((r) => oneDayMove.includes(r.id));
  if (oneDay.length) groups.push(group('one-day', oneDay));
  return groups.sort((a, b) => b.reports.length - a.reports.length);
}
