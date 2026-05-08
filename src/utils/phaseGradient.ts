export const PHASE_ORDER = [
  'understand',
  'define',
  'deliver',
  'sustain',
] as const;

export type Phase = (typeof PHASE_ORDER)[number];

export type PhaseVariant = 'light' | 'main' | 'dark';

export function getOrderedActivePhases(slugs: readonly string[]): Phase[] {
  const set = new Set(slugs);
  return PHASE_ORDER.filter((p): p is Phase => set.has(p));
}

// FNV-1a + xorshift32. Deterministic, zero-alloc, ~10 lines.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

// Per-phase blob centred at a seed-derived random spot, fading to transparent
// over a seed-derived radius. Stacked with a white floor so transparent
// regions resolve to white rather than the parent background.
export function getRadialMeshGradient(
  seed: string,
  phases: readonly Phase[],
  variant: PhaseVariant = 'light',
): string {
  if (phases.length === 0) return 'white';
  const rand = makeRng(hashStr(seed));
  const layers: string[] = [];
  for (const phase of phases) {
    const x = Math.round(rand() * 100);
    const y = Math.round(rand() * 100);
    const fade = Math.round(45 + rand() * 30);
    layers.push(
      `radial-gradient(at ${x}% ${y}%, var(--color-phase-${phase}-${variant}), transparent ${fade}%)`,
    );
  }
  layers.push('white');
  return layers.join(', ');
}
