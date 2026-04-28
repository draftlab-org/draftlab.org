import FilterToggle from '@components/atoms/FilterToggle';
import type { ReactNode } from 'react';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface FilterOption {
  slug: string;
  name: string;
  iconSvg?: string;
  swatchColor?: string;
}

export interface FeedItemTagData {
  slug: string;          // unique within (kind, slug)
  kind: string;          // 'project' | 'quote'
  phases: string[];
  modalities: string[];
  skills: string[];
}

export interface FeedFilterProps {
  gridId: string;
  modalities: FilterOption[];
  phases: FilterOption[];
  skills: FilterOption[];
  items: FeedItemTagData[];
}

type FilterKey = 'modalities' | 'phases' | 'skills';

type FilterState = Record<FilterKey, string[]>;

const EMPTY_STATE: FilterState = {
  modalities: [],
  phases: [],
  skills: [],
};

const FILTER_KEYS: FilterKey[] = ['modalities', 'phases', 'skills'];

const readFromUrl = (): FilterState => {
  if (typeof window === 'undefined') return EMPTY_STATE;
  const p = new URLSearchParams(window.location.search);
  const parse = (k: FilterKey) =>
    (p.get(k) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    modalities: parse('modalities'),
    phases: parse('phases'),
    skills: parse('skills'),
  };
};

const writeToUrl = (state: FilterState) => {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  FILTER_KEYS.forEach((k) => {
    if (state[k].length > 0) p.set(k, state[k].join(','));
    else p.delete(k);
  });
  const qs = p.toString();
  const url = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState({}, '', url);
};

const matches = (item: FeedItemTagData, state: FilterState): boolean => {
  const check = (key: FilterKey) => {
    const sel = state[key];
    if (sel.length === 0) return true;
    return sel.some((s) => item[key].includes(s));
  };
  return check('modalities') && check('phases') && check('skills');
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

export default function FeedFilter({
  gridId,
  modalities,
  phases,
  skills,
  items,
}: FeedFilterProps) {
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
    items.forEach((p) => {
      if (matches(p, state)) set.add(`${p.kind}-${p.slug}`);
    });
    return set;
  }, [items, state]);

  useEffect(() => {
    if (!hydrated) return;
    writeToUrl(state);
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll<HTMLElement>('[data-feed-slug]').forEach((el) => {
      const slug = el.dataset.feedSlug ?? '';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = `${gridId}-filter-panel`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleTriggerClick = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const activeCount = FILTER_KEYS.reduce((n, k) => n + state[k].length, 0);

  // Inline-icon-beside-text wrapper. SVG inside is expected to have
  // width="100%" height="100%" so it fills the wrapper.
  const chipIconClass =
    'inline-block size-[1em] shrink-0 align-[-0.125em] [&>svg]:h-full [&>svg]:w-full';

  // Placeholder treatment for the "all X" slots — signals to users that those
  // words are filterable slots, not fixed copy.
  const placeholderClass =
    'italic text-ink-muted underline decoration-ink-muted/50 decoration-dotted underline-offset-4';

  const renderModalityChip = useCallback(
    (slug: string): ReactNode => {
      const m = modalityBySlug.get(slug);
      if (!m) return slug;
      return (
        <span className="font-medium text-ink">
          {m.iconSvg && (
            <span
              aria-hidden="true"
              className={`${chipIconClass} mr-1 text-ink`}
              dangerouslySetInnerHTML={{ __html: m.iconSvg }}
            />
          )}
          {m.name}
        </span>
      );
    },
    [modalityBySlug]
  );

  const renderPhaseChip = useCallback(
    (slug: string): ReactNode => {
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
    },
    [phaseBySlug]
  );

  const renderSkillChip = useCallback(
    (slug: string): ReactNode => {
      const s = skillBySlug.get(slug);
      if (!s) return slug;
      return (
        <span className="font-medium text-ink">
          {s.iconSvg && (
            <span
              aria-hidden="true"
              className={`${chipIconClass} mr-1 text-ink-muted`}
              dangerouslySetInnerHTML={{ __html: s.iconSvg }}
            />
          )}
          {s.name}
        </span>
      );
    },
    [skillBySlug]
  );

  const summary: ReactNode = useMemo(() => {
    const parts: Array<{ id: string; node: ReactNode }> = [
      { id: 'showing', node: <>Showing</> },
    ];

    if (state.modalities.length > 0) {
      parts.push({
        id: 'modalities',
        node: (
          <>
            {' '}
            {joinWithAnd(
              state.modalities.map((s) => wrap(`m-${s}`, renderModalityChip(s)))
            )}
          </>
        ),
      });
    }

    parts.push({
      id: 'noun',
      node:
        state.modalities.length > 0 ? (
          <> projects</>
        ) : (
          <>
            {' '}
            <span className={placeholderClass}>all projects</span>
          </>
        ),
    });

    if (state.phases.length > 0) {
      const isSingle = state.phases.length === 1;
      parts.push({
        id: 'phases',
        node: (
          <>
            {' '}
            from {isSingle ? 'the ' : ''}
            {joinWithAnd(
              state.phases.map((s) => wrap(`p-${s}`, renderPhaseChip(s)))
            )}{' '}
            {isSingle ? 'phase' : 'phases'}
          </>
        ),
      });
    } else {
      parts.push({
        id: 'phases-default',
        node: (
          <>
            {' '}
            from <span className={placeholderClass}>all phases</span>
          </>
        ),
      });
    }

    if (state.skills.length > 0) {
      parts.push({
        id: 'skills',
        node: (
          <>
            {' '}
            using{' '}
            {joinWithAnd(
              state.skills.map((s) => wrap(`s-${s}`, renderSkillChip(s)))
            )}
          </>
        ),
      });
    } else {
      parts.push({
        id: 'skills-default',
        node: (
          <>
            {' '}
            using <span className={placeholderClass}>all skills</span>
          </>
        ),
      });
    }

    parts.push({ id: 'period', node: <>.</> });

    return parts.map((p) => <Fragment key={p.id}>{p.node}</Fragment>);
  }, [state, renderModalityChip, renderPhaseChip, renderSkillChip]);

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
            swatchStyle={
              opt.swatchColor ? { backgroundColor: opt.swatchColor } : undefined
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="sticky top-24 z-30 mx-auto mb-8 w-full sm:w-9/10"
    >
      <div className="relative">
        <div className="flex flex-wrap items-stretch gap-2 border border-gray-200 bg-white/60 shadow-sm backdrop-blur-md">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={handleTriggerClick}
            className="flex flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm leading-relaxed text-ink-soft transition-colors hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cx(
                'h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200',
                open ? 'rotate-180' : 'rotate-0'
              )}
            >
              <path d="M5 7.5l5 5 5-5" />
            </svg>
            <span className="flex-1">{summary}</span>
          </button>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear all filters"
              className="shrink-0 cursor-pointer self-center pr-4 text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          )}
        </div>

        <div
          id={panelId}
          aria-hidden={!open}
          className={cx(
            'absolute top-full -right-px -left-px border border-t-0 border-gray-200 bg-white/60 shadow-sm backdrop-blur-md transition-opacity duration-200 ease-out',
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <div className="space-y-4 p-4 sm:p-5">
            {renderRow('Modalities', 'modalities', modalities)}
            {renderRow('Phases', 'phases', phases)}
            {renderRow('Skills', 'skills', skills)}
          </div>
        </div>
      </div>
    </div>
  );
}

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');
