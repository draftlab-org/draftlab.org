import { getEntry } from 'astro:content';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { siteConfig } from '@lib/config';
import {
  getArticleExcerpt,
  getArticleUrl,
  getPublishedArticles,
  sortArticlesByDate,
} from '@utils/articles';
import { getDocChapters, getDocUrl } from '@utils/docs';
import { getPages } from '@utils/pages';
import { getAllPartners, getPartnerUrl } from '@utils/partners';
import { getAllPeople, getPersonUrl } from '@utils/people';
import { getResources } from '@utils/resources';
import { stripMarkdown } from '@utils/search';
import { SOCIAL_LABELS, socialHref } from '@utils/social';
import type { APIRoute } from 'astro';

/**
 * Optional long-form companion (https://llmstxt.org/#format). Scaffold's demo
 * ships template documentation there; derived sites usually have no such file
 * (it lives in public/, which the update script strips), so link only if present.
 */
// Resolved from the project root: at build time this module runs from the
// compiled output, so a path relative to import.meta.url would miss.
const HAS_FULL = existsSync(resolve(process.cwd(), 'public/llms-full.txt'));

/** Newest articles listed; older ones remain reachable via the sitemap. */
const RECENT_ARTICLES = 50;
/** Per-entry summary cap, so the whole file stays small. */
const SUMMARY_LENGTH = 200;

const oneLine = (text = '') => stripMarkdown(text).replace(/\s+/g, ' ').trim();

const truncate = (text: string, max: number) =>
  text.length <= max
    ? text
    : `${text
        .slice(0, max)
        .replace(/\s+\S*$/, '')
        .replace(/[\s,.;:]+$/, '')}…`;

/**
 * /llms.txt (https://llmstxt.org) — a plain-text map of the site for AI
 * crawlers and assistants, generated from the content collections so it
 * never drifts from the pages. Drafts follow the usual visibility rules.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL(siteConfig.url);
  const abs = (path: string) => new URL(path, base).href;

  const entry = (title: string, path: string, summary?: string) => {
    const text = summary ? truncate(oneLine(summary), SUMMARY_LENGTH) : '';
    return `- [${title}](${abs(path)})${text ? `: ${text}` : ''}`;
  };

  const section = (heading: string, lines: string[]) =>
    lines.length ? `## ${heading}\n\n${lines.join('\n')}\n` : '';

  const [config, pages, articles, chapters, people, partners, resources] =
    await Promise.all([
      getEntry('site', 'config'),
      getPages(),
      getPublishedArticles(),
      getDocChapters(),
      getAllPeople(),
      getAllPartners(),
      getResources(),
    ]);
  if (!config) throw new Error('Site configuration not found');

  // The home page lives at '/', not '/home'
  const home = pages.find((page) => page.id === 'home');
  const pageLines = [
    ...(home ? [entry(home.data.title, '/', home.data.description)] : []),
    ...pages
      .filter((page) => page.id !== 'home')
      .map((page) => entry(page.data.title, `/${page.id}`, page.data.description)),
  ];

  const articleLines = sortArticlesByDate(articles)
    .slice(0, RECENT_ARTICLES)
    .map((article) =>
      entry(article.data.title, getArticleUrl(article), getArticleExcerpt(article))
    );

  // Docs are grouped by chapter, in reading order
  const docLines = chapters.flatMap((chapter) => [
    `### ${chapter.name}`,
    '',
    ...chapter.pages.map((doc) =>
      entry(doc.data.title, getDocUrl(doc), doc.data.description)
    ),
    '',
  ]);

  const peopleLines = people.map((person) =>
    entry(
      person.name,
      getPersonUrl(person),
      [person.title, person.affiliation].filter(Boolean).join(', ')
    )
  );

  const partnerLines = partners.map((partner) =>
    entry(partner.name, getPartnerUrl(partner), partner.affiliation)
  );

  const resourceLines = resources.map((resource) =>
    entry(
      resource.data.title,
      `/resources/${resource.data.id}`,
      resource.data.description
    )
  );

  const linkLines = [
    ...(config.data.email ? [`- Email: ${config.data.email}`] : []),
    ...(config.data.social ?? []).map(
      (link) => `- ${SOCIAL_LABELS[link.platform]}: ${socialHref(link)}`
    ),
    `- RSS feed: ${abs('/rss.xml')}`,
    `- Sitemap: ${abs('/sitemap-index.xml')}`,
    ...(HAS_FULL ? [`- Full documentation: ${abs('/llms-full.txt')}`] : []),
  ];

  const body = [
    `# ${config.data.title}`,
    '',
    `> ${oneLine(config.data.description)}`,
    '',
    section('Pages', pageLines),
    section('Articles', articleLines),
    docLines.length ? `## Docs\n\n${docLines.join('\n')}` : '',
    section('People', peopleLines),
    section('Partners', partnerLines),
    section('Resources', resourceLines),
    section('Links', linkLines),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  return new Response(`${body}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
