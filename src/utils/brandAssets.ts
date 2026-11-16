// Logos published on /branding and served as stable files under /brand/.
//
// Each entry points at the SVG the site itself renders, so the downloads can
// never drift from what is live. `src/pages/brand/[file].ts` serves the SVG
// as-is and rasterises a PNG from it at build time.

export interface BrandLogo {
  /** File name without extension, e.g. /brand/<slug>.svg */
  slug: string;
  name: string;
  /** When to use it */
  use: string;
  /** Source SVG, relative to the project root */
  source: string;
  /** Surface the logo is drawn for; picks the preview tile background */
  surface: 'light' | 'dark';
  /** Intrinsic SVG size, for the preview <img> */
  width: number;
  height: number;
  /** Width of the generated PNG in pixels (height follows the aspect ratio) */
  pngWidth: number;
}

export const brandLogos: BrandLogo[] = [
  {
    slug: 'draftlab-logo',
    name: 'Wordmark',
    use: 'For light backgrounds.',
    source: 'src/assets/draftlab-logo.svg',
    surface: 'light',
    width: 159,
    height: 44,
    pngWidth: 1600,
  },
  {
    slug: 'draftlab-logo-white',
    name: 'Wordmark, white',
    use: 'For dark backgrounds.',
    source: 'src/assets/draftlab-logo-white.svg',
    surface: 'dark',
    width: 159,
    height: 44,
    pngWidth: 1600,
  },
  {
    slug: 'draftlab-logo-gradient',
    name: 'Wordmark, gradient',
    use: 'For light backgrounds, where colour is welcome.',
    source: 'src/assets/draftlab-logo-gradient.svg',
    surface: 'light',
    width: 159,
    height: 44,
    pngWidth: 1600,
  },
  {
    slug: 'draftlab-icon',
    name: 'Icon',
    use: 'For avatars, favicons and other square spaces.',
    source: 'public/favicon.svg',
    surface: 'light',
    width: 44,
    height: 44,
    pngWidth: 1024,
  },
];

export const pngHeight = (logo: BrandLogo) =>
  Math.round((logo.pngWidth * logo.height) / logo.width);
