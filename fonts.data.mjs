// fonts.data.mjs
//
// Draftlab's font families as plain data: which font fills each slot, and in
// which weights and styles. To swap a font, change it here.
//
// Kept free of Astro imports so pages can read it too (/branding lists the
// fonts from this file). fonts.config.mjs adds the provider and hands the
// result to astro.config.mjs.

// @ts-check

/**
 * @typedef {object} FontFamily
 * @property {string} name
 * @property {[number, ...number[]]} weights
 * @property {['normal' | 'italic', ...('normal' | 'italic')[]]} styles
 * @property {'--font-serif-family' | '--font-sans-family' | '--font-mono-family'} cssVariable
 */

/** @type {FontFamily[]} */
export const fontFamilies = [
  {
    name: 'Fraunces',
    weights: [300, 400, 500, 700],
    styles: ['normal'],
    cssVariable: '--font-serif-family',
  },
  {
    name: 'JetBrains Mono',
    weights: [400, 500],
    styles: ['normal'],
    cssVariable: '--font-mono-family',
  },
  {
    name: 'Nunito',
    weights: [300, 400],
    styles: ['normal', 'italic'],
    cssVariable: '--font-sans-family',
  },
];
