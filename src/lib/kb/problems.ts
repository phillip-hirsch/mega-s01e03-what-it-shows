// The problems inside one big ticket. causes.ts says which bug a date flip comes from; the desk's
// own notes (desk-notes.json) mark the reports that are not a flip at all but a one-day move.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';

export const PROBLEM_LABEL: Record<Problem, string> = {
  parser: 'shared parser reads day-first dates month first',
  hint: 'booking-v3 form hints MM/DD/YYYY to day-first tenants',
  'one-day': 'date moves by one day, not a month flip',
  unplaced: 'no tenant on file, or tenant writes month first',
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const groups = new Map<Problem, Report[]>();
  for (const r of uniqueById(all)) {
    if (r.mergedInto !== ticket) continue;
    const p = problemOf(r, tenantOf(r), oneDayMove);
    groups.set(p, [...(groups.get(p) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([problem, reports]) => {
      const days = reports.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports,
        tenants: [...new Set(reports.map((r) => r.tenant))].sort(),
        channels: reports.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
