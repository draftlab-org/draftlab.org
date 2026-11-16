// fonts.config.mjs
//
// Draftlab's fonts. This file is protected on merge — changes survive
// `npm run update-from-scaffold`.
//
// The families themselves (name, weights, styles) live in fonts.data.mjs —
// edit them there. This file only adds the provider and subsets.
//
// NOTE: the cssVariable names carry a `-family` suffix on purpose. Draftlab's
// src/styles/typography.css maps them onto Tailwind's tokens via
// `@theme inline { --font-sans: var(--font-sans-family); … }`. Naming the
// injected variable `--font-sans` directly would make Tailwind emit
// `--font-sans: var(--font-sans)` → CSS cycle → fonts silently fall back.
// (See memory font_system.md / session 2026-06-01.) Scaffold's default uses
// bare `--font-sans` etc. because its own typography.css does not alias them.
//
// Preloads (which files are fetched before first paint) are set in
// src/components/organisms/Head.astro.

// @ts-check
import { fontProviders } from 'astro/config';
import { fontFamilies } from './fonts.data.mjs';

/** @type {import('astro').AstroUserConfig['fonts']} */
export const fonts = fontFamilies.map((family) => ({
  ...family,
  provider: fontProviders.bunny(),
  subsets: ['latin', 'latin-ext'],
}));
