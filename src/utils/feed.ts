import { type CollectionEntry, getCollection } from 'astro:content';
import { getOrganisations } from '@utils/organisations';
import { getProjects } from '@utils/projects';
import type { ImageMetadata } from 'astro';

// Registry of feed item kinds. Adding a new content type to the feed:
//   1. Add an entry here
//   2. Add a fetcher branch in `getFeedItems()` that maps to FeedItem
//   3. Add a render branch in FeedGridSection.astro for its card component
export type FeedItemKindSlug = 'project' | 'quote';

export interface FeedItemKind {
  slug: FeedItemKindSlug;
  name: string;
}

export const FEED_ITEM_KINDS: FeedItemKind[] = [
  { slug: 'project', name: 'Project' },
  { slug: 'quote', name: 'Quote' },
];

// Resolved data shape for a project feed item — everything the card needs
// pre-resolved so the section template doesn't need its own dereferencing.
export interface ProjectFeedData {
  name: string;
  description: string;
  client?: string;
  clientLogo?: ImageMetadata;
  projectStatus: 'active' | 'complete';
  featured: boolean;
  image?: ImageMetadata;
}

export interface QuoteFeedData {
  quote: string;
  name: string;
  date: string;
  orgName?: string;
  orgLogo?: ImageMetadata;
}

export type FeedItem =
  | {
      kind: 'project';
      slug: string;
      sortMs: number;
      phases: string[];
      modalities: string[];
      skills: string[];
      data: ProjectFeedData;
    }
  | {
      kind: 'quote';
      slug: string;
      sortMs: number;
      phases: string[];
      modalities: string[];
      skills: string[];
      data: QuoteFeedData;
    };

const yearToMs = (year: number) => Date.UTC(year, 11, 31);

// Quotes inherit phases/modalities/skills from their linked project. If no
// project is set, derive from the union of all projects where the quote's
// organisation appears as `client` or in `partners`. Returns deduped arrays.
const inheritDimensions = (
  projectSlug: string | undefined,
  orgId: string,
  projectBySlug: Map<string, CollectionEntry<'projects'>>,
  projectsByOrg: Map<string, CollectionEntry<'projects'>[]>
): { phases: string[]; modalities: string[]; skills: string[] } => {
  if (projectSlug) {
    const p = projectBySlug.get(projectSlug);
    if (p) {
      return {
        phases: p.data.phases ?? [],
        modalities: p.data.modalities ?? [],
        skills: p.data.skills ?? [],
      };
    }
  }
  const orgProjects = projectsByOrg.get(orgId) ?? [];
  const phases = new Set<string>();
  const modalities = new Set<string>();
  const skills = new Set<string>();
  orgProjects.forEach((p) => {
    (p.data.phases ?? []).forEach((s) => {
      phases.add(s);
    });
    (p.data.modalities ?? []).forEach((s) => {
      modalities.add(s);
    });
    (p.data.skills ?? []).forEach((s) => {
      skills.add(s);
    });
  });
  return {
    phases: [...phases],
    modalities: [...modalities],
    skills: [...skills],
  };
};

export async function getFeedItems(): Promise<FeedItem[]> {
  const [projects, quotes, organisations] = await Promise.all([
    getProjects(),
    getCollection('quotes'),
    getOrganisations(),
  ]);

  // Quotes have no `status` field, so they're always visible. Add `status` to
  // the schema later if drafts need filtering.
  const orgById = new Map(organisations.map((o) => [o.data.id, o.data]));
  const projectBySlug = new Map(projects.map((p) => [p.data.slug, p]));

  const projectsByOrg = new Map<string, CollectionEntry<'projects'>[]>();
  projects.forEach((p) => {
    const ids = new Set<string>();
    if (p.data.client) ids.add(p.data.client);
    (p.data.partners ?? []).forEach((id) => {
      ids.add(id);
    });
    ids.forEach((id) => {
      const list = projectsByOrg.get(id) ?? [];
      list.push(p);
      projectsByOrg.set(id, list);
    });
  });

  const currentYear = new Date().getUTCFullYear();

  const projectItems: FeedItem[] = projects.map((p) => {
    const year = p.data.yearEnd ?? p.data.yearStart ?? currentYear;
    const sortMs =
      p.data.projectStatus === 'active' && !p.data.yearEnd
        ? yearToMs(currentYear)
        : yearToMs(year);
    return {
      kind: 'project',
      slug: p.data.slug,
      sortMs,
      phases: p.data.phases ?? [],
      modalities: p.data.modalities ?? [],
      skills: p.data.skills ?? [],
      data: {
        name: p.data.name,
        description: p.data.description,
        client: p.data.client ? orgById.get(p.data.client)?.name : undefined,
        clientLogo: p.data.client ? orgById.get(p.data.client)?.image : undefined,
        projectStatus: p.data.projectStatus,
        featured: p.data.featured,
        image: p.data.image,
      },
    };
  });

  const quoteItems: FeedItem[] = quotes.map((q) => {
    // The schema uses `reference()`, but at runtime values come back as either
    // a plain string (the id/slug) or `{collection, id|slug}`. Normalize.
    const orgRef = q.data.organisation as unknown;
    const orgId =
      typeof orgRef === 'string'
        ? orgRef
        : (orgRef as { id?: string; slug?: string })?.id ??
          (orgRef as { slug?: string })?.slug ??
          '';
    const projectRef = q.data.project as unknown;
    const projectSlug = projectRef
      ? typeof projectRef === 'string'
        ? projectRef
        : (projectRef as { id?: string; slug?: string })?.id ??
          (projectRef as { slug?: string })?.slug
      : undefined;

    const dims = inheritDimensions(
      projectSlug,
      orgId,
      projectBySlug,
      projectsByOrg
    );
    const org = orgById.get(orgId);
    return {
      kind: 'quote',
      slug: q.id,
      sortMs: Date.parse(q.data.date),
      phases: dims.phases,
      modalities: dims.modalities,
      skills: dims.skills,
      data: {
        quote: q.data.quote,
        name: q.data.name,
        date: q.data.date,
        orgName: org?.name,
        orgLogo: org?.image,
      },
    };
  });

  return [...projectItems, ...quoteItems].sort((a, b) => b.sortMs - a.sortMs);
}
