// Stable download URLs for the logos listed on /branding:
//   /brand/<slug>.svg — the source SVG, byte for byte
//   /brand/<slug>.png — transparent PNG rasterised from that SVG at build time
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { type BrandLogo, brandLogos } from '@utils/brandAssets';

type Format = 'svg' | 'png';

export const getStaticPaths = (() =>
  brandLogos.flatMap((logo) =>
    (['svg', 'png'] as const).map((format) => ({
      params: { file: `${logo.slug}.${format}` },
      props: { logo, format },
    }))
  )) satisfies GetStaticPaths;

export const GET: APIRoute<{ logo: BrandLogo; format: Format }> = async ({
  props,
}) => {
  const { logo, format } = props;
  const svg = await readFile(resolve(process.cwd(), logo.source));

  if (format === 'svg') {
    return new Response(new Uint8Array(svg), {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }

  // Render the vector at the target size (72 dpi = 1 SVG unit per pixel)
  // rather than upscaling a small bitmap.
  const density = (72 * logo.pngWidth) / logo.width;
  const png = await sharp(svg, { density })
    .resize({ width: logo.pngWidth })
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
