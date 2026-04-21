import clinicRaw from '@assets/icons/clinic.svg?raw';
import communityRaw from '@assets/icons/community.svg?raw';
import studioRaw from '@assets/icons/studio.svg?raw';

export type ModalitySlug = 'clinic' | 'studio' | 'community';

// SVGs are authored as plain stroke/fill paths using currentColor + width="100%",
// so they inherit their parent's text color and fill whatever wrapper sizes them.
// If you re-export these from a design tool, re-clean: drop any <mask>, change
// white strokes/fills to currentColor, and set root width/height to "100%".
export const modalityIconSvgs: Record<ModalitySlug, string> = {
  clinic: clinicRaw,
  studio: studioRaw,
  community: communityRaw,
};
