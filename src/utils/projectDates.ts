/**
 * Pure date helpers for projects. No Astro imports so this can be used from
 * `astro.config.mjs` (sitemap lastmod) as well as from pages.
 */

export interface ProjectDateFields {
  dateStart?: string;
  dateEnd?: string;
  updates?: Array<{ date: string }>;
}

/** Normalise loose inputs ("2026-3-01", Date) to "YYYY-MM-DD"; undefined if unparseable. */
export function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function latestOf(dates: Array<string | undefined>): string | undefined {
  return dates
    .map(toIsoDate)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
}

export function earliestOf(dates: Array<string | undefined>): string | undefined {
  return dates
    .map(toIsoDate)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(0);
}

/** When the project first became public: its start date, else its first update. */
export function getProjectPublished(p: ProjectDateFields): string | undefined {
  return (
    toIsoDate(p.dateStart) ??
    earliestOf((p.updates ?? []).map((u) => u.date))
  );
}

/**
 * Last meaningful change: the newest update, or the end date if it has already
 * passed (a planned future end date is not a modification), else the start.
 */
export function getProjectModified(
  p: ProjectDateFields,
  today: Date = new Date()
): string | undefined {
  const todayIso = today.toISOString().slice(0, 10);
  const end = toIsoDate(p.dateEnd);
  return latestOf([
    ...(p.updates ?? []).map((u) => u.date),
    end && end <= todayIso ? end : undefined,
    p.dateStart,
  ]);
}
