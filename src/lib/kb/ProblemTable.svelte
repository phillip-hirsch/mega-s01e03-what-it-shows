<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { mergedInto, PROBLEM_LABEL, splitTicket, type Problem } from '#lib/kb/problems.ts';

  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, string>> } = $props();

  const groups = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const total = $derived(mergedInto(reports as Report[], ticket).length);
  const oneDay = $derived(groups.find((g) => g.problem === 'one-day'));
  const filedAs = (ids: string[]) =>
    groups.filter((g) => g.problem !== 'one-day' && g.reports.some((r) => ids.includes(r.id))).map((g) => g.problem).join(', ');
  const unplaced = $derived(groups.find((g) => g.problem === 'unplaced')?.reports.length ?? 0);
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{total}</strong> reports in #{ticket} ·
  <strong>{groups.filter((g) => g.problem !== 'unplaced').length}</strong> problems
  {#if unplaced}· <span class="warn">{unplaced} not placed</span>{/if}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="label">{PROBLEM_LABEL[g.problem]}</span></td>
        <td>{g.reports.length}</td>
        <td>{g.tenants.length}</td>
        <td class="small">{channels(g.channels)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if tickets[g.problem]}<a href={tickets[g.problem]}>{tickets[g.problem]?.replace(/^.*\/issues\//, 'issue #')}</a>{:else}<span class="warn">none</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if oneDay}
  <p class="small">
    The {oneDay.reports.length} <code>one-day</code> reports are counted the desk's way: filed under
    <code>{filedAs(oneDay.reports.map((r) => r.id))}</code> by tenant, and listed again in their own row.
  </p>
{/if}

<style>
  .sum { font-size: 1.1rem; }
  .label, .small { color: var(--muted); font-size: 0.85em; }
  .warn { color: var(--warn); font-weight: 600; }
</style>
