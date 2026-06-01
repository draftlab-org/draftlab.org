import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from '@headlessui/react';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import ExclamationTriangleIcon from '~icons/heroicons/exclamation-triangle';
import MagnifyingGlassIcon from '~icons/heroicons/magnifying-glass-20-solid';

type SearchResult = {
  id: string;
  name: string;
  url: string;
  clientName?: string;
  partnerNames?: string[];
};

type RawProject = {
  id: string;
  slug?: string;
  name: string;
  status?: string;
  client?: string;
  partners?: string[];
};

type RawOrganisation = {
  id: string;
  name: string;
};

function fuzzySearch(items: SearchResult[], query: string): SearchResult[] {
  const fuse = new Fuse(items, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'clientName', weight: 1 },
      { name: 'partnerNames', weight: 1 },
    ],
    threshold: 0.4,
    includeScore: true,
  });
  return fuse.search(query).map((result) => result.item);
}

export default function RichSearch() {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const query = rawQuery.toLowerCase().trim();

  useEffect(() => {
    async function fetchSearchData() {
      setLoading(true);
      try {
        const [orgsData, projectsData] = await Promise.all([
          fetch('/api/organisations.json').then(
            (r) => r.json() as Promise<RawOrganisation[]>
          ),
          fetch('/api/projects.json').then(
            (r) => r.json() as Promise<RawProject[]>
          ),
        ]);

        const orgMap = new Map(orgsData.map((o) => [o.id, o.name]));

        const projects: SearchResult[] = projectsData
          .filter(
            (p) =>
              !p.status || p.status === 'published' || p.status === 'archived'
          )
          .map((p) => ({
            id: p.id,
            name: p.name,
            url: `/projects/${p.slug ?? p.id}`,
            clientName: p.client ? orgMap.get(p.client) : undefined,
            partnerNames: (p.partners ?? [])
              .map((slug) => orgMap.get(slug))
              .filter((n): n is string => Boolean(n)),
          }));

        setResults(projects);
      } catch (error) {
        console.error('Failed to fetch search data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (open && !hasFetched.current) {
      hasFetched.current = true;
      fetchSearchData();
    }
  }, [open]);

  useEffect(() => {
    const handleOpenSearch = () => setOpen(true);
    window.addEventListener('open-search', handleOpenSearch);
    return () => window.removeEventListener('open-search', handleOpenSearch);
  }, []);

  const filteredResults = useMemo<SearchResult[]>(() => {
    if (query === '') return results;
    return fuzzySearch(results, query);
  }, [query, results]);

  return (
    <Dialog
      className="relative z-100"
      open={open}
      onClose={() => {
        setOpen(false);
        setRawQuery('');
      }}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/25 transition-opacity data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-100 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          transition
          className="mx-auto max-w-xl transform divide-y divide-gray-100 overflow-hidden bg-white gradient-frame shadow-lg transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        >
          <Combobox
            onChange={(item: SearchResult | null) => {
              if (item) {
                window.location.href = item.url;
              }
            }}
          >
            <div className="grid grid-cols-1">
              <ComboboxInput
                autoFocus
                className="col-start-1 row-start-1 h-12 w-full bg-white pr-4 pl-11 font-mono text-base text-ink-soft outline-hidden placeholder:text-ink-muted sm:text-sm"
                placeholder="Search projects..."
                onChange={(event) => setRawQuery(event.target.value)}
              />
              <MagnifyingGlassIcon
                className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-ink"
                aria-hidden="true"
              />
            </div>

            {loading && (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
                    <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredResults.length > 0 && (
              <ComboboxOptions
                static
                as="ul"
                className="max-h-80 transform-gpu scroll-py-10 scroll-pb-2 overflow-y-auto py-4 text-sm text-gray-700"
              >
                {filteredResults.map((item) => {
                  const partners = item.partnerNames ?? [];
                  const hasCredits =
                    Boolean(item.clientName) || partners.length > 0;
                  return (
                    <ComboboxOption
                      as="li"
                      key={item.id}
                      value={item}
                      className="group flex cursor-pointer items-center px-4 py-2 transition-colors select-none hover:gradient-phase-light data-focus:gradient-phase-light data-focus:outline-hidden"
                    >
                      <span className="flex min-w-0 flex-auto flex-col">
                        <span className="truncate font-serif text-ink">
                          {item.name}
                        </span>
                        {hasCredits && (
                          <span className="truncate text-xs text-ink-muted">
                            {item.clientName && <>for {item.clientName}</>}
                            {item.clientName && partners.length > 0 && '  '}
                            {partners.length > 0 && (
                              <>with {partners.join(', ')}</>
                            )}
                          </span>
                        )}
                      </span>
                    </ComboboxOption>
                  );
                })}
              </ComboboxOptions>
            )}

            {!loading && query !== '' && filteredResults.length === 0 && (
              <div className="px-6 py-14 text-center text-sm sm:px-14">
                <ExclamationTriangleIcon
                  className="mx-auto size-6 text-gray-400"
                  aria-hidden="true"
                />
                <p className="mt-4 font-bold text-gray-900">No results found</p>
                <p className="mt-2">
                  We couldn't find anything with that term. Please try again.
                </p>
              </div>
            )}
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
