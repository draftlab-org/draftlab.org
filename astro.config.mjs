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
import { fonts } from './fonts.config.mjs';
import { siteConfig } from './src/lib/config.ts';
import {
  autolinkHeadingsOptions,
  expressiveCodeOptions,
  externalLinksOptions,
} from './src/lib/markdown-plugins.ts';
import { buildRedirects } from './src/lib/redirects.ts';
import remarkEmbedLink from './src/lib/remark-embed-link.ts';

// Sitemap <lastmod> for article pages. Articles carry a single
// `publishedDate` (there is no updated date in the schema), so that is the
// last modification. Read straight from the markdown frontmatter because the
// content layer isn't available in the config; a missing or unparseable date
// simply means no <lastmod> for that URL.
const articleLastmod = (() => {
  const dir = path.resolve('src/content/articles');
  const byId = new Map();
  if (!fs.existsSync(dir)) return byId;
  for (const file of fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.md')) continue;
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const raw = frontmatter.match(/^publishedDate:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
    const date = raw ? new Date(raw) : undefined;
    if (!date || Number.isNaN(date.getTime())) continue;
    // Entry id = slugified path without extension, matching the glob loader
    // (lowercase, spaces → hyphens)
    const id = file
      .slice(0, -3)
      .split(path.sep)
      .map((segment) => segment.trim().toLowerCase().replace(/\s+/g, '-'))
      .join('/');
    byId.set(id, date.toISOString().slice(0, 10));
  }
  return byId;
})();

// https://astro.build/config
export default defineConfig({
  // Managed in Pages CMS (Settings → Redirects): src/content/site/_redirects.json
  redirects: buildRedirects(),
  site: siteConfig.url,
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
        const match = pathname.match(/^\/articles\/(.+?)\/?$/);
        const lastmod = match
          ? articleLastmod.get(decodeURIComponent(match[1]))
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
