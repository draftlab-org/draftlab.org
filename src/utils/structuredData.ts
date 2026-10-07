/**
 * schema.org JSON-LD builders. Pure functions: callers resolve collection
 * data and absolute URLs, these just shape the objects.
 *
 * Site-wide `Organization` + `WebSite` live in `Head.astro`; pages add their
 * own entity (`Person`, `CreativeWork`) through the `head` slot and point back
 * at the organisation via `@id`.
 */

const CONTEXT = 'https://schema.org';

export const organizationId = (siteUrl: string) =>
  `${new URL('/', siteUrl).href}#organization`;
export const websiteId = (siteUrl: string) =>
  `${new URL('/', siteUrl).href}#website`;

export interface OrganizationInput {
  siteUrl: string;
  name: string;
  description: string;
  logoUrl?: string;
  email?: string;
  sameAs?: Array<string | undefined>;
  knowsAbout?: string[];
}

export function buildSiteGraph(o: OrganizationInput) {
  const org = {
    '@type': 'Organization',
    '@id': organizationId(o.siteUrl),
    name: o.name,
    url: new URL('/', o.siteUrl).href,
    description: o.description,
    ...(o.logoUrl && {
      logo: { '@type': 'ImageObject', url: o.logoUrl },
      image: o.logoUrl,
    }),
    ...(o.email && { email: o.email }),
    sameAs: (o.sameAs ?? []).filter(Boolean),
    ...(o.knowsAbout?.length && { knowsAbout: o.knowsAbout }),
  };
  const site = {
    '@type': 'WebSite',
    '@id': websiteId(o.siteUrl),
    url: new URL('/', o.siteUrl).href,
    name: o.name,
    description: o.description,
    inLanguage: 'en',
    publisher: { '@id': organizationId(o.siteUrl) },
  };
  return { '@context': CONTEXT, '@graph': [org, site] };
}

export interface PersonInput {
  siteUrl: string;
  url: string;
  name: string;
  jobTitle?: string;
  description?: string;
  imageUrl?: string;
  sameAs?: Array<string | undefined>;
  knowsAbout?: string[];
}

export function buildPerson(p: PersonInput) {
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': `${p.url}#person`,
    name: p.name,
    url: p.url,
    ...(p.jobTitle && { jobTitle: p.jobTitle }),
    ...(p.description && { description: p.description }),
    ...(p.imageUrl && { image: p.imageUrl }),
    sameAs: (p.sameAs ?? []).filter(Boolean),
    worksFor: { '@id': organizationId(p.siteUrl) },
    memberOf: { '@id': organizationId(p.siteUrl) },
    ...(p.knowsAbout?.length && { knowsAbout: p.knowsAbout }),
  };
}

export interface OrgRef {
  name: string;
  url?: string;
}

export interface ProjectInput {
  siteUrl: string;
  url: string;
  name: string;
  description: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  client?: OrgRef;
  partners?: OrgRef[];
  keywords?: string[];
  status?: 'active' | 'complete';
}

const orgRef = (o: OrgRef) => ({
  '@type': 'Organization',
  name: o.name,
  ...(o.url && { url: o.url }),
});

export function buildProject(p: ProjectInput) {
  return {
    '@context': CONTEXT,
    '@type': 'CreativeWork',
    additionalType: 'https://schema.org/Project',
    '@id': `${p.url}#project`,
    name: p.name,
    headline: p.name,
    description: p.description,
    url: p.url,
    inLanguage: 'en',
    ...(p.imageUrl && { image: p.imageUrl }),
    ...(p.datePublished && { datePublished: p.datePublished }),
    ...(p.dateModified && { dateModified: p.dateModified }),
    creator: { '@id': organizationId(p.siteUrl) },
    provider: { '@id': organizationId(p.siteUrl) },
    publisher: { '@id': organizationId(p.siteUrl) },
    isPartOf: { '@id': websiteId(p.siteUrl) },
    // The organisation on whose behalf the work was done.
    ...(p.client && { sourceOrganization: orgRef(p.client) }),
    ...(p.partners?.length && { contributor: p.partners.map(orgRef) }),
    ...(p.keywords?.length && { keywords: p.keywords.join(', ') }),
    ...(p.status && {
      creativeWorkStatus: p.status === 'active' ? 'Active' : 'Complete',
    }),
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
  };
}
