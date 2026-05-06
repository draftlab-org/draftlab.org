// @ts-check

import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import Icons from 'unplugin-icons/vite';
import { siteConfig } from './src/lib/config.ts';

// On Netlify, DEPLOY_PRIME_URL is the canonical URL for the current deploy
// (custom domain on production, branch URL on previews). Fall back to siteConfig.url
// for local dev so absolute URLs in built HTML always match where the site actually lives.
const siteUrl =
  process.env.DEPLOY_PRIME_URL || process.env.URL || siteConfig.url;

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
      cssVariable: '--font-fraunces',
    },
    {
      provider: fontProviders.bunny(),
      name: 'Source Serif 4',
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      cssVariable: '--font-source-serif-4',
    },
    {
      provider: fontProviders.bunny(),
      name: 'JetBrains Mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      cssVariable: '--font-jetbrains-mono',
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
    sitemap(),
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
