import FilterToggle from '@components/atoms/FilterToggle';
import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

export interface FilterOption {
  slug: string;
  name: string;
  iconSvg?: string;
  symbol?: string;
  swatchColor?: string;
}

export interface ProjectTagData {
  slug: string;
  phases: string[];
  modalities: string[];
  skills: string[];
}

export interface ProjectsFilterProps {
  gridId: string;
  phases: FilterOption[];
  modalities: FilterOption[];
  skills: FilterOption[];
  projects: ProjectTagData[];
}

type FilterKey = 'phases' | 'modalities' | 'skills';

type FilterState = Record<FilterKey, string[]>;

const EMPTY_STATE: FilterState = { phases: [], modalities: [], skills: [] };

const readFromUrl = (): FilterState => {
  if (typeof window === 'undefined') return EMPTY_STATE;
  const p = new URLSearchParams(window.location.search);
  const parse = (k: FilterKey) =>
    (p.get(k) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    phases: parse('phases'),
    modalities: parse('modalities'),
    skills: parse('skills'),
  };
};

const writeToUrl = (state: FilterState) => {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  (Object.keys(state) as FilterKey[]).forEach((k) => {
    if (state[k].length > 0) p.set(k, state[k].join(','));
    else p.delete(k);
  });
  const qs = p.toString();
  const url = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState({}, '', url);
};

const matches = (project: ProjectTagData, state: FilterState): boolean => {
  const check = (key: FilterKey) => {
    const sel = state[key];
    if (sel.length === 0) return true;
    return sel.some((s) => project[key].includes(s));
  };
  return check('phases') && check('modalities') && check('skills');
};

const joinWithAnd = (items: ReactNode[]): ReactNode[] => {
  if (items.length === 0) return [];
  if (items.length === 1) return [items[0]];
  if (items.length === 2) return [items[0], ' and ', items[1]];
  const out: ReactNode[] = [];
  items.forEach((item, i) => {
    if (i === 0) out.push(item);
    else if (i === items.length - 1) out.push(', and ', item);
    else out.push(', ', item);
  });
  return out;
};

const wrap = (key: string, node: ReactNode): ReactNode => (
  <Fragment key={key}>{node}</Fragment>
);

export default function ProjectsFilter({
  gridId,
  phases,
  modalities,
  skills,
  projects,
}: ProjectsFilterProps) {
  const [state, setState] = useState<FilterState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readFromUrl());
    setHydrated(true);
  }, []);

  const phaseBySlug = useMemo(
    () => new Map(phases.map((o) => [o.slug, o])),
    [phases]
  );
  const modalityBySlug = useMemo(
    () => new Map(modalities.map((o) => [o.slug, o])),
    [modalities]
  );
  const skillBySlug = useMemo(
    () => new Map(skills.map((o) => [o.slug, o])),
    [skills]
  );

  const visibleSlugs = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (matches(p, state)) set.add(p.slug);
    });
    return set;
  }, [projects, state]);

  useEffect(() => {
    if (!hydrated) return;
    writeToUrl(state);
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll<HTMLElement>('[data-project-slug]').forEach((el) => {
      const slug = el.dataset.projectSlug ?? '';
      el.toggleAttribute('hidden', !visibleSlugs.has(slug));
    });
    const empty = document.getElementById(`${gridId}-empty`);
    if (empty) empty.toggleAttribute('hidden', visibleSlugs.size !== 0);
  }, [state, gridId, hydrated, visibleSlugs]);

  useEffect(() => {
    const onPop = () => setState(readFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggle = useCallback((key: FilterKey, slug: string) => {
    setState((prev) => {
      const current = prev[key];
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      return { ...prev, [key]: next };
    });
  }, []);

  const clear = useCallback(() => setState(EMPTY_STATE), []);

  const activeCount =
    state.phases.length + state.modalities.length + state.skills.length;

  const visibleCount = visibleSlugs.size;

  const renderModalityChip = (slug: string): ReactNode => {
    const m = modalityBySlug.get(slug);
    if (!m) return slug;
    return (
      <span className="inline-flex items-center gap-1 font-medium text-ink">
        {m.symbol && <span aria-hidden="true">{m.symbol}</span>}
        {m.name}
      </span>
    );
  };

  const renderPhaseChip = (slug: string): ReactNode => {
    const p = phaseBySlug.get(slug);
    if (!p) return slug;
    return (
      <span
        className="font-medium"
        style={{ color: `var(--color-phase-${slug}-dark)` }}
      >
        {p.name}
      </span>
    );
  };

  const renderSkillChip = (slug: string): ReactNode => {
    const s = skillBySlug.get(slug);
    if (!s) return slug;
    return (
      <span className="inline-flex items-baseline gap-1 font-medium text-ink">
        {s.iconSvg && (
          <span
            aria-hidden="true"
            className="h-3 w-3.5 text-ink-muted"
            dangerouslySetInnerHTML={{ __html: s.iconSvg }}
          />
        )}
        {s.name}
      </span>
    );
  };

  const summary: ReactNode = useMemo(() => {
    if (activeCount === 0) {
      return (
        <>
          Showing all <strong>{projects.length}</strong>{' '}
          {projects.length === 1 ? 'project' : 'projects'}.
        </>
      );
    }

    const parts: ReactNode[] = [
      <>
        Showing <strong>{visibleCount}</strong>
      </>,
    ];

    if (state.modalities.length > 0) {
      parts.push(
        <>
          {' '}
          {joinWithAnd(
            state.modalities.map((s) => wrap(`m-${s}`, renderModalityChip(s)))
          )}
        </>
      );
    }

    parts.push(<> {visibleCount === 1 ? 'project' : 'projects'}</>);

    if (state.phases.length > 0) {
      const isSingle = state.phases.length === 1;
      parts.push(
        <>
          {' '}
          from {isSingle ? 'the ' : ''}
          {joinWithAnd(
            state.phases.map((s) => wrap(`p-${s}`, renderPhaseChip(s)))
          )}{' '}
          {isSingle ? 'phase' : 'phases'}
        </>
      );
    }

    if (state.skills.length > 0) {
      parts.push(
        <>
          {' '}
          using{' '}
          {joinWithAnd(
            state.skills.map((s) => wrap(`s-${s}`, renderSkillChip(s)))
          )}
        </>
      );
    }

    parts.push(<>.</>);

    return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
  }, [
    activeCount,
    projects.length,
    visibleCount,
    state,
    modalityBySlug,
    phaseBySlug,
    skillBySlug,
  ]);

  const renderRow = (
    label: string,
    key: FilterKey,
    options: FilterOption[]
  ) => (
    <div className="space-y-2">
      <div className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <FilterToggle
            key={opt.slug}
            label={opt.name}
            active={state[key].includes(opt.slug)}
            onToggle={() => toggle(key, opt.slug)}
            iconSvg={opt.iconSvg}
            symbol={opt.symbol}
            swatchStyle={
              opt.swatchColor ? { backgroundColor: opt.swatchColor } : undefined
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mb-8 space-y-4 rounded-lg border border-gray-200 bg-cream/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm leading-relaxed text-ink-soft">{summary}</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {renderRow('Modalities', 'modalities', modalities)}
      {renderRow('Phases', 'phases', phases)}
      {renderRow('Skills', 'skills', skills)}
    </div>
  );
}
