import { siteConfig } from '@lib/config';
import { absoluteUrl, toIsoDate, toPlainText, truncate } from '@utils/seo';
import { type SocialLink, socialHref } from '@utils/social';

/**
 * schema.org node builders. Head.astro always emits an Organization and a
 * WebSite node; detail pages add their own (Article, Person, CreativeWork)
 * through the `jsonLd` layout prop. Builders drop empty values so optional
 * content fields never produce null properties.
 */

export type JsonLd = Record<string, unknown>;

const SITE_URL = siteConfig.url.replace(/\/$/, '');
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const orgRef = { '@id': ORG_ID };

function compact(node: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(node).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
    )
  );
}

const plain = (text?: string, max = 300) =>
  text ? truncate(toPlainText(text), max) : undefined;

export interface LinkedEntity {
  name: string;
  url?: string;
}

const personRefs = (people: LinkedEntity[]) =>
  people.map((person) =>
    compact({ '@type': 'Person', name: person.name, url: person.url })
  );

/** Profile URLs for `sameAs`: http(s) links only (handles like Matrix ids are skipped). */
export function socialSameAs(links?: SocialLink[]): string[] | undefined {
  const urls = links
    ?.map((link) => socialHref(link))
    .filter((href) => /^https?:\/\//i.test(href));
  return urls?.length ? urls : undefined;
}

export interface SiteData {
  title: string;
  description: string;
  url: string;
  email?: string;
  defaultLogoLight?: ImageMetadata;
  defaultLogoSquare?: ImageMetadata;
  social?: SocialLink[];
}

export function organizationNode(site: SiteData): JsonLd {
  const logo = site.defaultLogoSquare ?? site.defaultLogoLight;
  const sameAs = socialSameAs(site.social);
  return compact({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.title,
    url: `${SITE_URL}/`,
    logo: logo ? absoluteUrl(logo.src) : undefined,
    description: plain(site.description),
    email: site.email,
    sameAs,
  });
}

export function websiteNode(site: SiteData): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: site.title,
    publisher: orgRef,
  };
}

export function breadcrumbNode(items: LinkedEntity[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })
    ),
  };
}

export interface ArticleInput {
  url: string;
  title: string;
  description?: string;
  image?: string;
  datePublished: Date;
  dateModified?: Date;
  authors: LinkedEntity[];
  categories?: string[];
}

export function articleNode(input: ArticleInput): JsonLd {
  return compact({
    '@type': 'Article',
    '@id': `${input.url}#article`,
    headline: input.title,
    description: plain(input.description),
    image: input.image,
    datePublished: toIsoDate(input.datePublished),
    dateModified: input.dateModified
      ? toIsoDate(input.dateModified)
      : undefined,
    author: personRefs(input.authors),
    publisher: orgRef,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: input.url,
    keywords: input.categories,
  });
}

export interface PersonInput {
  url: string;
  name: string;
  jobTitle?: string;
  affiliation?: string;
  image?: string;
  sameAs?: string[];
}

export function personNode(input: PersonInput): JsonLd {
  return compact({
    '@type': 'Person',
    '@id': `${input.url}#person`,
    name: input.name,
    url: input.url,
    jobTitle: input.jobTitle,
    image: input.image,
    affiliation: input.affiliation
      ? { '@type': 'Organization', name: input.affiliation }
      : undefined,
    worksFor: input.affiliation ? undefined : orgRef,
    sameAs: input.sameAs,
  });
}

export interface CreativeWorkInput {
  url: string;
  title: string;
  description?: string;
  image?: string;
  datePublished?: Date;
  year?: number;
  authors: LinkedEntity[];
  keywords?: string[];
  genre?: string;
}

export function creativeWorkNode(input: CreativeWorkInput): JsonLd {
  return compact({
    '@type': 'CreativeWork',
    '@id': `${input.url}#work`,
    name: input.title,
    url: input.url,
    description: plain(input.description),
    image: input.image,
    datePublished: input.datePublished
      ? toIsoDate(input.datePublished)
      : input.year?.toString(),
    author: personRefs(input.authors),
    publisher: orgRef,
    keywords: input.keywords,
    genre: input.genre,
  });
}

/** Wrap nodes in a `@graph` document and serialise for a `<script>` body. */
export function serializeGraph(nodes: JsonLd[]): string {
  // `<` escaped so content can never close the script tag
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes,
  }).replace(/</g, '\\u003c');
}
