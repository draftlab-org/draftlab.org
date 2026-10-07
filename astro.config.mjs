// @ts-check

import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, fontProviders } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import Icons from 'unplugin-icons/vite';
import YAML from 'yaml';
import { siteConfig } from './src/lib/config.ts';
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
  site: siteUrl,
  devToolbar: {
    enabled: false,
  },
  experimental: {
    contentIntellisense: true,
  },
  // No italic styles are used on the site, so we restrict each family to
  // `normal` only — halves the @font-face count and the on-demand byte
  // payload. If you ever introduce <em> or italic classes, add 'italic'
  // back to the relevant family.
  fonts: [
    {
      provider: fontProviders.bunny(),
      name: 'Fraunces',
      weights: [300, 400, 500, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      cssVariable: '--font-serif-family',
    },
    {
      provider: fontProviders.bunny(),
      name: 'JetBrains Mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      cssVariable: '--font-mono-family',
    },
    {
      provider: fontProviders.bunny(),
      name: 'Nunito',
      weights: [300, 400],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      cssVariable: '--font-sans-family',
    },
  ],

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
    expressiveCode({
      themes: ['catppuccin-frappe'],
      defaultProps: {
        // Enable word wrap by default
        wrap: true,
        // Disable wrapped line indentation for terminal languages
        overridesByLang: {
          'bash,ps,sh': { preserveIndent: false },
        },
      },
    }),
    mdx(),
  ],
  adapter: netlify(),
});
