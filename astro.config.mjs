// @ts-check

import fs from 'node:fs';
import path from 'node:path';
import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import Icons from 'unplugin-icons/vite';
import YAML from 'yaml';
import { fonts } from './fonts.config.mjs';
import { siteConfig } from './src/lib/config.ts';
import {
  autolinkHeadingsOptions,
  expressiveCodeOptions,
  externalLinksOptions,
} from './src/lib/markdown-plugins.ts';
import { buildRedirects } from './src/lib/redirects.ts';
import remarkEmbedLink from './src/lib/remark-embed-link.ts';
import { getProjectModified, latestOf } from './src/utils/projectDates.ts';

// Absolute-URL base for canonical, og:*, sitemap and RSS links.
//
// Production (Netlify CONTEXT=production) must always use the real domain from
// siteConfig.url. Do NOT use DEPLOY_PRIME_URL here: on Netlify it is the branch
// subdomain (https://main--<site>.netlify.app) even for production builds, which
// made every live page declare a canonical on the wrong host and deindexed the
// site from Google (fixed 2026-10-07).
//
// Branch deploys / Deploy Previews use DEPLOY_PRIME_URL so OG images and other
// absolute URLs resolve on the preview host. Local dev falls back to siteConfig.url.
const siteUrl =
  process.env.CONTEXT === 'production'
    ? siteConfig.url
    : process.env.DEPLOY_PRIME_URL || siteConfig.url;

// Sitemap <lastmod>: projects carry real dates (start/end/updates), so expose
// them per project page; the home and projects listing take the newest of all.
// Read straight from the YAML because the content layer isn't available here.
const projectLastmod = (() => {
  const dir = path.resolve('src/content/projects');
  const bySlug = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.yaml')) continue;
    const data = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!data || data.status !== 'published') continue;
    const modified = getProjectModified(data);
    if (modified) bySlug.set(data.slug, modified);
  }
  return { bySlug, latest: latestOf([...bySlug.values()]) };
})();

// https://astro.build/config
export default defineConfig({
  // Managed in Pages CMS (Settings → Redirects): src/content/site/_redirects.json
  redirects: buildRedirects(),
  site: siteUrl,
  devToolbar: {
    enabled: false,
  },
  fonts,

  image: {
    // Markdown images carry no width, so without a layout Astro emits them at
    // their original size (often 4000px+) into a ~700px prose column.
    layout: 'constrained',
  },

  markdown: {
    // Astro 7 defaults to its own processor; unified keeps remark/rehype
    // plugins working for .md content collections.
    processor: unified({
      remarkPlugins: [remarkEmbedLink],
      rehypePlugins: [
        // Astro assigns heading ids after user plugins; do it first so the
        // anchors below have ids to link to (it's idempotent)
        rehypeHeadingIds,
        [rehypeAutolinkHeadings, autolinkHeadingsOptions],
        [rehypeExternalLinks, externalLinksOptions],
      ],
    }),
  },

  vite: {
    plugins: [
      tailwindcss(),
      Icons({
        compiler: 'jsx',
        jsx: 'react',
      }),
    ],
  },

  integrations: [
    react(),
    sitemap({
      // Endpoints (OG images, JSON API, feeds, text files) are not pages
      filter: (page) => {
        const { pathname } = new URL(page);
        return (
          !/^\/(api|og)\//.test(pathname) &&
          !/\.(json|png|xml|txt)$/.test(pathname)
        );
      },
      serialize(item) {
        const { pathname } = new URL(item.url);
        const match = pathname.match(/^\/projects\/([^/]+)\/?$/);
        const lastmod = match
          ? projectLastmod.bySlug.get(match[1])
          : pathname === '/' || pathname === '/projects/'
            ? projectLastmod.latest
            : undefined;
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
    expressiveCode(expressiveCodeOptions),
    mdx(),
  ],
  adapter: netlify({
    // Edge-function emulation in `astro dev` conflicts with recent Deno
    // releases. Scaffold ships no edge functions, so switch it off.
    devFeatures: {
      environmentVariables: false,
      images: true,
      edgeFunctions: false,
    },
  }),
});
