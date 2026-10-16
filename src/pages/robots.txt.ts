import { siteConfig } from '@lib/config';
import { isPreview } from '@utils/dev';
import type { APIRoute } from 'astro';

/**
 * /robots.txt — allow everything and point crawlers at the sitemap. Preview
 * builds (PUBLIC_PREVIEW) render drafts, so they are kept out of search
 * indexes entirely.
 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(siteConfig.url);
  const lines = isPreview
    ? ['User-agent: *', 'Disallow: /']
    : [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', base).href}`,
      ];

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
