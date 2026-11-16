// Brand colours shown on /branding. Values are read from src/styles/colors.css
// at build time, so the swatches and hex codes follow the stylesheet.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface BrandColorDef {
  /** Token name in colors.css, without the `--color-` prefix */
  token: string;
  name: string;
  use: string;
}

export interface BrandColor extends BrandColorDef {
  hex: string;
}

const brandColorDefs: BrandColorDef[] = [
  { token: 'ink', name: 'Ink', use: 'Text and the logo' },
  { token: 'white', name: 'White', use: 'Page background' },
  { token: 'phase-understand', name: 'Terracotta', use: 'Understand phase' },
  { token: 'phase-define', name: 'Sage green', use: 'Define phase' },
  { token: 'phase-deliver', name: 'Slate blue', use: 'Deliver phase' },
  { token: 'phase-sustain', name: 'Purple', use: 'Sustain phase' },
];

const toHex = (channels: number[]) =>
  `#${channels
    .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

// OKLCH → sRGB (CSS Color 4 reference maths), clamped to the sRGB gamut
function oklchToHex(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ];
  return toHex(
    linear.map((v) => {
      const x = Math.min(1, Math.max(0, v));
      return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    })
  );
}

function cssColorToHex(value: string): string {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return `#${hex[1].toUpperCase()}`;
  const oklch = value.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (oklch) {
    return oklchToHex(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]));
  }
  throw new Error(`brandColors: cannot convert "${value}" to hex`);
}

export async function getBrandColors(): Promise<BrandColor[]> {
  const css = await readFile(
    resolve(process.cwd(), 'src/styles/colors.css'),
    'utf8'
  );
  return brandColorDefs.map((def) => {
    const match = css.match(new RegExp(`--color-${def.token}:\\s*([^;]+);`));
    if (!match) {
      throw new Error(`brandColors: --color-${def.token} not in colors.css`);
    }
    return { ...def, hex: cssColorToHex(match[1].trim()) };
  });
}
