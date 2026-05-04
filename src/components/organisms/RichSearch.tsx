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
import DocumentIcon from '~icons/heroicons/document-text';
import ExclamationTriangleIcon from '~icons/heroicons/exclamation-triangle';
import FolderIcon from '~icons/heroicons/folder';
import LifebuoyIcon from '~icons/heroicons/lifebuoy';
import MagnifyingGlassIcon from '~icons/heroicons/magnifying-glass-20-solid';
import UserIcon from '~icons/heroicons/user';

type SearchResult = {
  id: string;
  name: string;
  url: string;
  category: string;
  imageUrl?: string;
};

type IconComponent = React.ComponentType<{
  className?: string;
  'aria-hidden'?: 'true' | 'false';
}>;

type CategoryConfig = {
  name: string;
  apiEndpoint: string;
  urlPrefix: string;
  icon: IconComponent;
  modifier: string;
  transform: (item: any) => Omit<SearchResult, 'category'>;
};

// Configuration for search categories
const SEARCH_CATEGORIES: CategoryConfig[] = [
  {
    name: 'Pages',
    apiEndpoint: '/api/pages.json',
    urlPrefix: '/',
    icon: FolderIcon,
    modifier: '#',
    transform: (page: any) => ({
      id: page.id,
      name: page.title,
      url: `/${page.id}`,
      imageUrl: page.heroImage?.src,
    }),
  },
  {
    name: 'People',
    apiEndpoint: '/api/people.json',
    urlPrefix: '/people/',
    icon: UserIcon,
    modifier: '>',
    transform: (person: any) => ({
      id: person.id,
      name: person.name,
      url: `/people/${person.id}`,
      imageUrl: person.headshot?.src,
    }),
  },
  {
    name: 'Projects',
    apiEndpoint: '/api/projects.json',
    urlPrefix: '/projects',
    icon: DocumentIcon,
    modifier: '@',
    transform: (project: any) => ({
      id: project.id,
      name: project.name,
      url: '/projects',
    }),
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper function to create fuzzy search results
function fuzzySearch(
  items: SearchResult[],
  query: string,
  threshold: number = 0.4
): SearchResult[] {
  const fuse = new Fuse(items, {
    keys: ['name'],
    threshold,
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
  const query = rawQuery.toLowerCase().replace(/^[#>@]/, '');

  // Fetch data lazily when search opens for the first time
  useEffect(() => {
    async function fetchSearchData() {
      setLoading(true);
      try {
        // Fetch site config for default image and all category endpoints
        const responses = await Promise.all([
          fetch('/api/site.json'),
          ...SEARCH_CATEGORIES.map((category) => fetch(category.apiEndpoint)),
        ]);

        const [siteData, ...categoryDataArrays] = await Promise.all(
          responses.map((res) => res.json())
        );

        // Extract default OG image from site config
        const siteConfig = siteData[0]; // site collection returns array with single item
        const defaultImageUrl = siteConfig?.defaultOgImage?.src;

        // Transform and combine results from all categories
        const searchResults: SearchResult[] = [];

        categoryDataArrays.forEach((data, index) => {
          const category = SEARCH_CATEGORIES[index];
          const items = data
            // Filter out unpublished items
            .filter(
              (item: any) =>
                item.status === 'published' ||
                item.status === 'archived' ||
                item.data?.status === 'published' ||
                item.data?.status === 'archived' ||
                !item.status
            )
            .map((item: any) => {
              const transformed = category.transform(item);
              // Use hero image if available, otherwise use default
              const imageUrl = transformed.imageUrl || defaultImageUrl;
              return {
                ...transformed,
                imageUrl,
                category: category.name,
              };
            });

          searchResults.push(...items);
        });

        setResults(searchResults);
      } catch (error) {
        console.error('Failed to fetch search data:', error);
      } finally {
        setLoading(false);
      }
    }

    // Only fetch when search opens and we haven't fetched yet
    if (open && !hasFetched.current) {
      hasFetched.current = true;
      fetchSearchData();
    }
  }, [open]);

  // Open/close event listener
  useEffect(() => {
    const handleOpenSearch = () => {
      setOpen(true);
    };

    window.addEventListener('open-search', handleOpenSearch);

    return () => {
      window.removeEventListener('open-search', handleOpenSearch);
    };
  }, []);

  // Dynamically filter results for each category
  const filteredResultsByCategory = useMemo(() => {
    const filtered: Record<string, SearchResult[]> = {};

    SEARCH_CATEGORIES.forEach((category) => {
      const categoryResults = results.filter(
        (r) => r.category === category.name
      );

      // If modifier is used, show all items from that category
      if (rawQuery === category.modifier) {
        filtered[category.name] = categoryResults;
        return;
      }

      // If query is empty or another modifier is active, show nothing
      const otherModifiers = SEARCH_CATEGORIES.filter(
        (c) => c.modifier !== category.modifier
      ).map((c) => c.modifier);

      if (
        query === '' ||
        otherModifiers.some((mod) => rawQuery.startsWith(mod))
      ) {
        filtered[category.name] = [];
        return;
      }

      // Otherwise, use fuzzy search
      filtered[category.name] = fuzzySearch(categoryResults, query);
    });

    return filtered;
  }, [rawQuery, query, results]);

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
            onChange={(item: any) => {
              if (item) {
                window.location = item.url;
              }
            }}
          >
            <div className="grid grid-cols-1">
              <ComboboxInput
                autoFocus
                className="col-start-1 row-start-1 h-12 w-full bg-white pr-4 pl-11 font-mono text-base text-ink-soft outline-hidden placeholder:text-ink-muted sm:text-sm"
                placeholder="Search..."
                onChange={(event) => setRawQuery(event.target.value)}
                onBlur={() => setRawQuery('')}
              />
              <MagnifyingGlassIcon
                className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-ink"
                aria-hidden="true"
              />
            </div>

            {loading && query === '' && (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-primary-100" />
                    <div className="space-y-2">
                      {[1, 2].map((j) => (
                        <div
                          key={j}
                          className="flex items-center gap-3 px-4 py-2"
                        >
                          <div className="size-6 animate-pulse rounded bg-primary-100" />
                          <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading &&
              Object.values(filteredResultsByCategory).some(
                (arr) => arr.length > 0
              ) && (
                <ComboboxOptions
                  static
                  as="ul"
                  className="max-h-80 transform-gpu scroll-py-10 scroll-pb-2 space-y-4 overflow-y-auto p-4 pb-2"
                >
                  {SEARCH_CATEGORIES.map((category) => {
                    const items =
                      filteredResultsByCategory[category.name] || [];
                    if (items.length === 0) return null;

                    const Icon = category.icon;

                    return (
                      <li key={category.name}>
                        <h2 className="is-active brackets-text text-sm font-semibold tracking-wide text-ink">
                          {category.name}
                        </h2>
                        <ul className="-mx-4 mt-2 text-sm text-gray-700">
                          {items.map((item) => (
                            <ComboboxOption
                              as="li"
                              key={item.id}
                              value={item}
                              className="group flex cursor-pointer items-center px-4 py-2 transition-colors select-none hover:gradient-phase-light data-focus:gradient-phase-light data-focus:outline-hidden"
                            >
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className={
                                    category.name === 'People'
                                      ? 'size-6 flex-none rounded-full border-2 border-gray-200 bg-gray-100'
                                      : 'aspect-video h-6 flex-none rounded border-2 border-gray-200 bg-gray-100 object-cover'
                                  }
                                />
                              ) : (
                                <Icon
                                  className="size-6 flex-none text-gray-500 group-data-focus:text-gray-700"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="ml-3 flex-auto truncate">
                                {item.name}
                              </span>
                            </ComboboxOption>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ComboboxOptions>
              )}

            {!loading && rawQuery === '?' && (
              <div className="px-6 py-14 text-center text-sm sm:px-14">
                <LifebuoyIcon
                  className="mx-auto size-6 text-gray-400"
                  aria-hidden="true"
                />
                <p className="mt-4 font-semibold text-gray-900">
                  Help with searching
                </p>
                <p className="mt-2">
                  Quickly search through site content and get results divided by
                  category. You can also use search modifiers in the footer to
                  search and show all results from a single category.
                </p>
              </div>
            )}

            {!loading &&
              query !== '' &&
              rawQuery !== '?' &&
              Object.values(filteredResultsByCategory).every(
                (arr) => arr.length === 0
              ) && (
                <div className="px-6 py-14 text-center text-sm sm:px-14">
                  <ExclamationTriangleIcon
                    className="mx-auto size-6 text-gray-400"
                    aria-hidden="true"
                  />
                  <p className="mt-4 font-semibold text-gray-900">
                    No results found
                  </p>
                  <p className="mt-2">
                    We couldn't find anything with that term. Please try again.
                  </p>
                </div>
              )}

            <div className="flex flex-wrap items-center gradient-phase px-4 py-2.5 font-mono text-xs text-white">
              Type{' '}
              {SEARCH_CATEGORIES.map((category) => (
                <span key={category.name} className="inline-flex items-center">
                  <kbd
                    className={classNames(
                      'mx-1 flex size-5 items-center justify-center border bg-white font-semibold sm:mx-2',
                      rawQuery.startsWith(category.modifier)
                        ? 'border-ink-soft text-ink'
                        : 'border-ink-muted text-ink-muted'
                    )}
                  >
                    {category.modifier}
                  </kbd>{' '}
                  <span className="">
                    {`for ${category.name.toLowerCase()}, `}
                  </span>
                </span>
              ))}
              <kbd
                className={classNames(
                  'mx-1 flex size-5 items-center justify-center border bg-white font-semibold sm:mx-2',
                  rawQuery === '?'
                    ? 'border-ink-soft text-ink'
                    : 'border-ink-muted text-ink-muted'
                )}
              >
                ?
              </kbd>{' '}
              for help.
            </div>
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
