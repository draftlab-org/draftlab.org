import type { TocEntry } from '@utils/renderMarkdown';
import { type MouseEvent, useEffect, useRef, useState } from 'react';

interface TOCProps {
  entries: TocEntry[];
  // Pass an empty string to omit the heading (e.g. inside a <details> summary)
  title?: string;
  // Stick to the viewport; turn off when a parent handles positioning
  sticky?: boolean;
}

// Breathing room between the sticky header and a heading scrolled to
const SCROLL_GAP = 16;
// A heading counts as "current" once its top passes this line, measured from
// the bottom of the sticky header. Slightly below where a TOC click lands a
// heading (SCROLL_GAP), so the heading just scrolled to registers as active.
const READING_LINE_GAP = SCROLL_GAP + 8;
// Nesting levels rendered: 2 = top-level headings plus one level of children
// (h2 + h3 for articles and docs)
const MAX_DEPTH = 2;
// Context kept above/below the active link when the TOC scrolls to it
const SCROLL_SLACK = 40;

// Left padding per nesting level, so a single active border line runs down
// the left edge regardless of depth
const INDENT_CLASSES = ['pl-3', 'pl-7'];

// Flatten the entries the TOC renders, in document order
function flattenEntries(entries: TocEntry[], depth = 0): TocEntry[] {
  const flattened: TocEntry[] = [];
  for (const entry of entries) {
    flattened.push(entry);
    if (depth + 1 < MAX_DEPTH && entry.children) {
      flattened.push(...flattenEntries(entry.children, depth + 1));
    }
  }
  return flattened;
}

// Height of the sticky site header, if any — measured, not hardcoded, so it
// follows the header's actual size (logo, banner, breakpoint)
function getStickyHeaderHeight(): number {
  const header = document.querySelector('header');
  if (!header || getComputedStyle(header).position !== 'sticky') return 0;
  return header.getBoundingClientRect().height;
}

// Nearest element (the nav itself or an ancestor) that scrolls vertically —
// the TOC may be its own scroll container (sticky) or sit inside a sticky
// sidebar that is (ContentSidebar)
function getScrollContainer(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const { overflowY } = getComputedStyle(current);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

// Render TOC entries recursively
function TOCEntries({
  entries,
  activeId,
  depth = 0,
  onEntryClick,
}: {
  entries: TocEntry[];
  activeId: string | null;
  depth?: number;
  onEntryClick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const indent = INDENT_CLASSES[depth] ?? INDENT_CLASSES.at(-1);
  return (
    <ul className={depth > 0 ? 'mt-1' : ''}>
      {entries.map((entry) => {
        const isActive = activeId === entry.id;
        return (
          <li key={entry.id} className="mt-1">
            <a
              href={`#${entry.id}`}
              data-component="toc-link"
              data-toc-id={entry.id}
              aria-current={isActive ? 'location' : undefined}
              onClick={(event) => onEntryClick(event, entry.id)}
              className={`toc-link block border-l-2 py-0.5 text-sm transition-colors ${indent} ${
                isActive ? 'border-primary-600' : 'border-transparent'
              }`}
            >
              {entry.value}
            </a>
            {depth + 1 < MAX_DEPTH &&
              entry.children &&
              entry.children.length > 0 && (
                <TOCEntries
                  entries={entry.children}
                  activeId={activeId}
                  depth={depth + 1}
                  onEntryClick={onEntryClick}
                />
              )}
          </li>
        );
      })}
    </ul>
  );
}

export default function TOC({
  entries,
  title = 'On this page',
  sticky = true,
}: TOCProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // Track the current section from scroll position: the active heading is the
  // last one whose top has passed the reading line. Unlike an
  // IntersectionObserver band this works in both scroll directions, inside
  // sections taller than the viewport, and at the very top of the page.
  useEffect(() => {
    const headings = flattenEntries(entries)
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = getStickyHeaderHeight() + READING_LINE_GAP;
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= readingLine) {
          current = heading;
        } else {
          break;
        }
      }
      setActiveId(current.id);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [entries]);

  // Keep the active link visible inside the TOC's scroll area. Set scrollTop
  // directly rather than calling scrollIntoView, which would also move the
  // page.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeId) return;
    const container = getScrollContainer(nav);
    const link = nav.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`
    );
    if (!container || !link) return;

    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (linkRect.top < containerRect.top + SCROLL_SLACK) {
      container.scrollTop += linkRect.top - containerRect.top - SCROLL_SLACK;
    } else if (linkRect.bottom > containerRect.bottom - SCROLL_SLACK) {
      container.scrollTop +=
        linkRect.bottom - containerRect.bottom + SCROLL_SLACK;
    }
  }, [activeId]);

  // Entries are real links (shareable, work without JS); when hydrated, scroll
  // with the sticky header accounted for and keep the URL hash in sync
  const handleEntryClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    // Let modified clicks (open in new tab etc.) behave natively
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;

    const element = document.getElementById(id);
    if (!element) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const top =
      element.getBoundingClientRect().top +
      window.scrollY -
      getStickyHeaderHeight() -
      SCROLL_GAP;

    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    history.pushState(null, '', `#${id}`);
    // Move focus for keyboard and screen reader users, without a second jump
    element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
    setActiveId(id);
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      className={
        sticky
          ? 'sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain pt-6'
          : ''
      }
      aria-label="Table of contents"
    >
      {title && (
        <h4 className="toc-title mb-3 font-semibold tracking-wide uppercase">
          {title}
        </h4>
      )}
      <TOCEntries
        entries={entries}
        activeId={activeId}
        onEntryClick={handleEntryClick}
      />
    </nav>
  );
}
