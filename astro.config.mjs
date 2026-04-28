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

// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,
  devToolbar: {
    enabled: false,
  },
  experimental: {
    contentIntellisense: true,
  },
  fonts: [
    {
      provider: fontProviders.bunny(),
      name: 'Fraunces',
      weights: [300, 400, 500],
      cssVariable: '--font-fraunces',
    },
    {
      provider: fontProviders.bunny(),
      name: 'Source Serif 4',
      weights: [300, 400],
      cssVariable: '--font-source-serif-4',
    },
    {
      provider: fontProviders.bunny(),
      name: 'JetBrains Mono',
      weights: [300, 400],
      cssVariable: '--font-jetbrains-mono',
    },
  ],

  vite: {
    plugins: [
      tailwindcss(),
      // React components (MobileMenu, RichSearch, etc.)
      Icons({
        compiler: 'jsx',
        jsx: 'react',
      }),
      // Astro components (static ~icons/ imports in .astro files)
      Icons({
        compiler: 'astro',
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
