import { siteConfig } from '@lib/config';

/**
 * Helpers for `<head>` metadata: plain-text descriptions, title formatting
 * and absolute URLs. Used by Head.astro and the JSON-LD builders.
 */

export const META_DESCRIPTION_LENGTH = 160;

/** Strip markdown and HTML so a content field can be used as meta text. */
export function toPlainText(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shorten to `max` characters on a word boundary, ending with an ellipsis. */
export function truncate(text: string, max = META_DESCRIPTION_LENGTH): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max - 1).trimEnd()}…`;
}

/** First non-empty candidate, cleaned and shortened for a description meta tag. */
export function metaDescription(
  ...candidates: (string | undefined | null)[]
): string | undefined {
  for (const candidate of candidates) {
    const plain = candidate ? toPlainText(candidate) : '';
    if (plain) return truncate(plain);
  }
  return undefined;
}

/**
 * Browser-tab / search-result title: the page title followed by the site
 * name, unless the title already is (or already ends with) the site name.
 */
export function pageTitle(title: string, siteName = siteConfig.title): string {
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();
  const site = siteName.toLowerCase();
  if (lower === site || lower.endsWith(` ${site}`) || lower.endsWith(`| ${site}`)) {
    return trimmed;
  }
  return `${trimmed} | ${siteName}`;
}

/** Absolute URL on the configured site origin. */
export function absoluteUrl(path: string, base: URL | string = siteConfig.url): string {
  return new URL(path, base).href;
}

/**
 * URL of the generated 1200×630 Open Graph card for a page, or undefined when
 * the site has no square logo (the OG route then builds nothing). Callers fall
 * back to the page's own image or the site default.
 */
export function ogCardUrl(pathname: string): string | undefined {
  if (!siteConfig.hasOgCards) return undefined;
  const clean = pathname.replace(/\/$/, '') || '/';
  return absoluteUrl(clean === '/' ? '/og/index.png' : `/og${clean}.png`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `en` → `en_US`, `pt-BR` → `pt_BR`; anything else is left to the caller. */
export function ogLocale(lang: string): string | undefined {
  if (lang.includes('-')) return lang.replace('-', '_');
  if (lang === 'en') return 'en_US';
  return undefined;
}
