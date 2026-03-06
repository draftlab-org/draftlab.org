import { defineCollection, type ImageFunction, z } from 'astro:content';
import peopleCategories from './categories/people.json';

// Shared status field for content visibility across all collections
const statusSchema = z
  .enum(['draft', 'published', 'archived'])
  .default('draft');

// Shared color palette enum matching the site's design tokens
const colorPaletteSchema = z.enum([
  'primary',
  'secondary',
  'highlight',
  'neutral',
]);

// Phase slug enum — used across collections for referencing phases
const phaseSlugSchema = z.enum([
  'understand',
  'define',
  'build',
  'sustain',
]);

// Modality slug enum — used across collections for referencing modalities
const modalitySlugSchema = z.enum([
  'clinic',
  'studio',
  'council',
]);

// Helper to create schemas with image support
const createSchemas = (image: ImageFunction) => {
  // Atoms
  const buttonSchema = z.object({
    variant: z.string(),
    size: z.string(),
    href: z.string(),
    text: z.string(),
  });

  // Card
  const cardSchema = z.object({
    title: z.string(),
    content: z.string().optional(),
    image: image().optional(),
    button: buttonSchema.optional(),
    color: colorPaletteSchema.optional(),
  });

  //  Person
  const personSchema = z.object({
    id: z.string(),
    name: z.string(),
    headshot: image(),
    title: z.string().optional(),
    affiliation: z.string().optional(),
    role: z.string().optional(),
    bio: z.string().optional(),
    extraInfo: z.string().optional(),
    url: z.string().optional(),
    sections: z.array(
      z.enum(peopleCategories.categories as [string, ...string[]])
    ),
    status: statusSchema,
  });

  return {
    buttonSchema,
    cardSchema,
    personSchema,
  };
};

// ── Pages collection ──

const pagesCollection = defineCollection({
  type: 'data',
  schema: ({ image }) => {
    const { buttonSchema, cardSchema } = createSchemas(image);

    const SectionCommonSchema = z.object({
      background: z
        .object({
          bgColor: z.string().optional(),
          bgType: z.string().optional(),
        })
        .optional(),
    });

    // Sections defined as a union type so they can be used as variable components
    const sectionsSchema = z.discriminatedUnion('type', [
      SectionCommonSchema.extend({
        type: z.literal('hero'),
        title: z.string(),
        subtitle: z.string().optional(),
        backgroundImage: image().optional(),
      }),
      SectionCommonSchema.extend({
        type: z.literal('richText'),
        content: z.string(),
        withTOC: z.boolean().optional().default(false),
      }),
      SectionCommonSchema.extend({
        type: z.literal('button'),
        title: z.string().optional(),
        buttons: z.array(buttonSchema).optional(),
      }),
      SectionCommonSchema.extend({
        type: z.literal('card'),
        title: z.string(),
        description: z.string().optional(),
        cards: z.array(cardSchema).optional(),
        buttons: z.array(buttonSchema).optional(),
      }),
      SectionCommonSchema.extend({
        type: z.literal('people'),
        category: z.string().optional(),
      }),
      // New Draftlab section types
      SectionCommonSchema.extend({
        type: z.literal('framework'),
        title: z.string().optional(),
        description: z.string().optional(),
        showProjects: z.boolean().optional().default(true),
      }),
      SectionCommonSchema.extend({
        type: z.literal('projectsRoll'),
        title: z.string().optional(),
        description: z.string().optional(),
        limit: z.number().optional(),
        filterPhase: phaseSlugSchema.optional(),
        filterModality: modalitySlugSchema.optional(),
        featuredOnly: z.boolean().optional().default(false),
      }),
      SectionCommonSchema.extend({
        type: z.literal('phasesOverview'),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
      SectionCommonSchema.extend({
        type: z.literal('modalitiesOverview'),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
      SectionCommonSchema.extend({
        type: z.literal('organisationsRoll'),
        title: z.string().optional(),
        description: z.string().optional(),
        filterType: z.enum(['client', 'partner', 'funder']).optional(),
        limit: z.number().optional(),
      }),
    ]);

    const flexiSectionSchema = SectionCommonSchema.extend({
      type: z.literal('flexi'),
      title: z.string(),
      description: z.string().optional(),
      sections: z.array(sectionsSchema),
    });

    return z.object({
      title: z.string(),
      description: z.string().optional(),
      heroImage: image().optional(),
      background: z
        .enum(['white', 'gray', 'gradient', 'highlight'])
        .default('white')
        .optional(),
      permalink: z.string().optional(),
      status: statusSchema,
      sections: z
        .union([...sectionsSchema.options, flexiSectionSchema])
        .array()
        .optional(),
    });
  },
});

// ── People collection ──

const peopleCollection = defineCollection({
  type: 'data',
  schema: ({ image }) => createSchemas(image).personSchema,
});

// ── Phases collection ──

const phasesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    number: z.number(),
    slug: phaseSlugSchema,
    tagline: z.string(),
    subtitle: z.string(),
    description: z.string(),
    color: z.string(),
    order: z.number(),
    status: statusSchema,
  }),
});

// ── Modalities collection ──

const modalitiesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    slug: modalitySlugSchema,
    symbol: z.string(),
    tagline: z.string(),
    description: z.string(),
    distinguishingFeature: z.string(),
    order: z.number(),
    status: statusSchema,
  }),
});

// ── Framework cells collection (12 cells: 4 phases x 3 modalities) ──

const frameworkCellsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    phase: phaseSlugSchema,
    modality: modalitySlugSchema,
    description: z.string(),
    order: z.number(),
    status: statusSchema,
  }),
});

// ── Projects collection ──

const projectsCollection = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      slug: z.string(),
      status: statusSchema,
      description: z.string(),
      longDescription: z.string().optional(),
      organisation: z.string().optional(),
      phases: z.array(phaseSlugSchema),
      modalities: z.array(modalitySlugSchema),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      active: z.boolean().default(false),
      featured: z.boolean().default(false),
      image: image().optional(),
      url: z.string().optional(),
      order: z.number().optional().default(999),
    }),
});

// ── Organisations collection (replaces partners) ──

const organisationsCollection = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['client', 'partner', 'funder']),
      url: z.string().optional(),
      description: z.string().optional(),
      image: image().optional(),
      projects: z.array(z.string()).optional(),
      order: z.number().optional().default(999),
      status: statusSchema,
    }),
});

// ── Site collection ──

const siteCollection = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      url: z.string().url(),
      favicon: z.string().default('/favicon.svg'),
      defaultOgImage: image().optional(),
      defaultLogoLight: image().optional(),
      defaultLogoDark: image().optional(),
      social: z
        .object({
          bluesky: z.string().optional(),
          github: z.string().optional(),
          mastodon: z.string().optional(),
          linkedin: z.string().optional(),
          x: z.string().optional(),
          facebook: z.string().optional(),
          instagram: z.string().optional(),
          youtube: z.string().optional(),
        })
        .optional(),
      footer: z.object({
        description: z.string().optional(),
        bottom: z.string(),
      }),
      archivedBanner: z
        .object({
          message: z.string(),
          color: colorPaletteSchema,
        })
        .optional(),
      cookieConsent: z
        .object({
          message: z.string(),
          googleAnalyticsId: z.string().optional(),
        })
        .optional(),
    }),
});

// ── Navigation collection ──

// Flexible link schema - supports internal page refs and external URLs
const flexibleLinkSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('internal'),
    pageRef: z.string(),
  }),
  z.object({
    type: z.literal('external'),
    url: z.string().url(),
  }),
]);

// Navigation item schema - supports single links and dropdowns
const navItemLinkSchema = z.object({
  type: z.literal('link'),
  label: z.string(),
  link: flexibleLinkSchema,
  description: z.string().optional(),
});

const navItemDropdownSchema = z.object({
  type: z.literal('dropdown'),
  label: z.string(),
  children: z.array(
    z.object({
      label: z.string(),
      link: flexibleLinkSchema,
      description: z.string().optional(),
    })
  ),
});

const navigationItemSchema = z.discriminatedUnion('type', [
  navItemLinkSchema,
  navItemDropdownSchema,
]);

const navigationCollection = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    items: z.array(navigationItemSchema),
  }),
});

// ── Categories collection ──

const categoriesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    categories: z.array(z.string()),
  }),
});

// ── Export all collections ──

export const collections = {
  people: peopleCollection,
  pages: pagesCollection,
  site: siteCollection,
  navigation: navigationCollection,
  categories: categoriesCollection,
  phases: phasesCollection,
  modalities: modalitiesCollection,
  frameworkCells: frameworkCellsCollection,
  projects: projectsCollection,
  organisations: organisationsCollection,
};
