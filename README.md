# draftlab.org

The website for **Draftlab** — a creative project design studio for social good. Built on the [Scaffold](https://github.com/draftlab-org/scaffold) template (Astro 6 + Tailwind CSS v4 + React 19), deployed to Netlify.

[![Netlify Status](https://api.netlify.com/api/v1/badges/9a10e2af-511b-48c6-8ed2-e450ae007148/deploy-status)](https://app.netlify.com/projects/draftlab-scaffold/deploys)

This README is the onboarding doc — it explains what's where and why so a new contributor can get productive quickly. Deeper notes for AI-assisted work live in `.localconfig/CLAUDE.md`.

## Getting started

```sh
git clone https://github.com/draftlab-org/draftlab.org.git
cd draftlab.org
npm install
npm run dev
```

Dev server at `http://localhost:4321`. Drafts (status `draft`) are visible in dev and in any preview build with `PUBLIC_PREVIEW=true`; production hides them.

```sh
npm run dev       # Dev server (drafts visible)
npm run build     # Production build (drafts hidden)
npm run preview   # Preview the production build locally
```

There's no test runner. Biome is configured (`biome.json`) but isn't wired to an npm script — run `npx biome check .` if you want lint/import-organisation feedback.

## The framework

Almost everything on the site is organised around a two-axis framework. Internalising it makes the content schemas and component names obvious.

- **Phases** (project timeline): `understand` → `define` → `deliver` → `sustain`
- **Modalities** (engagement style): `clinic` ◎, `studio` ◈, `community` ◉

These slugs are load-bearing. They appear as Zod enums in `src/content.config.ts`, as CSS custom properties (`--color-phase-{slug}-{light|dark}`), and as Tailwind classes (`tag-{slug}`). If you rename one, search the whole codebase. There's a historical rename worth knowing about: `build` → `deliver` and `council` → `community` (April 2026) — old branches and notes may still reference the old names.

## Stack

| Concern | Choice |
| --- | --- |
| SSG / framework | [Astro 6](https://docs.astro.build) with the Netlify adapter |
| UI framework (interactive islands) | React 19 |
| Styling | Tailwind CSS v4 (`@theme` block in CSS, no `tailwind.config.*`) |
| Content | Astro content collections + Zod schemas |
| CMS | [Pages CMS](https://pagescms.org) (config in `.pages.yml`) |
| Forms | Brevo (transactional email) + [Altcha](https://altcha.org) (proof-of-work captcha) |
| Search | [Fuse.js](https://fusejs.io) (in-browser fuzzy search) |
| Markdown | MDX, expressive-code, remark-gfm, rehype-slug, custom rehype plugins |
| Icons | [unplugin-icons](https://github.com/unplugin/unplugin-icons) + [Iconify](https://iconify.design) |

## Content collections

All content lives in `src/content/` and is validated by Zod schemas in `src/content.config.ts`. Adding a new collection means defining it there, then optionally filtering by status with `isVisible()` from `@utils/content`.

| Collection | Format | What it is |
| --- | --- | --- |
| `pages` | YAML | One file per route. Carries a `sections` array — see "Page building". `home`, `about`, `projects`, `get-in-touch` live here today. |
| `projects` | YAML + markdown body | Case studies. Reference `phases[]`, `modalities[]`, `skills[]` (by slug). Optional `updates[]` array for the per-project timeline. |
| `people` | JSON | Team profiles. Carry headshot, social links, optional `skills[]`. |
| `phases` | JSON | The four timeline phases. |
| `modalities` | JSON | The three engagement modalities. |
| `skills` | JSON | Skill cards with name, description, and an Iconify icon id (e.g. `"hugeicons:test-tube-01"`). Projects and people reference these by slug. |
| `organisations` | JSON | Clients, partners, and funders. `type` is one of `client | partner | funder`. |
| `quotes` | JSON | Testimonial pull-quotes. References `organisations` and (optionally) `projects`. |
| `navigation` | JSON | Header / footer / mobile menus. Items can be internal (`pageRef`) or external (`url`), and can nest into dropdowns. |
| `site` | JSON | Single `config.json` with global title, description, social links, OG images, optional cookie-consent + archived-banner config. |

### Status workflow

Most collections share a unified `status` field with three values:

- `draft` — only visible in dev (`npm run dev`) or `PUBLIC_PREVIEW=true` previews
- `published` — visible everywhere
- `archived` — visible everywhere; pages with this status surface the archived banner if configured

Use `isVisible(entry)` from `@utils/content` to filter, or the per-collection helpers in `@utils/{pages,projects,people,...}` which already apply it.

`projects` carries a second, orthogonal `contentStatus` field (`placeholder | polish | ready`) tracking internal editorial readiness. It's informational — no rendering logic gates on it today.

### Images in content

Images are referenced by absolute path from the project root (e.g. `/src/assets/projects/foo.png`). The `image()` helper in collection schemas resolves and optimises them at build time.

## Page building

Pages are assembled from a typed list of section blocks. The dynamic route `src/pages/[...path].astro` matches every page entry except `home`, which has its own `src/pages/index.astro`. There are also two hand-rolled detail routes: `src/pages/projects/[slug].astro` and `src/pages/people/[id].astro`.

Each page YAML looks like:

```yaml
title: Home
status: published
sections:
  - type: skillsCloud
    background:
      bgColor: phase-gradient
      bgType: full
  - type: callout
    content: Draftlab is a design and technology studio…
  - type: projectsRoll
    title: Featured projects
    featuredOnly: true
    limit: 4
```

Section types are a discriminated union in `src/content.config.ts`. Adding a new one is a three-step change:

1. Add a `z.literal('newType')` branch to the `sectionsSchema` discriminated union.
2. Create `src/components/sections/NewTypeSection.astro` (or `.tsx`).
3. Add a `case 'newType'` to the switch in `src/components/sections/Sections.astro`.

If it should also be editable in Pages CMS, add a matching block under `components:` in `.pages.yml`.

### Existing section types

`hero`, `richText`, `callout`, `button`, `card`, `flexi` (nested sections), `people`, `feedGrid`, `projectsRoll`, `latestUpdates`, `howWeWork`, `phasesOverview`, `modalitiesOverview`, `skills`, `skillsCloud`, `organisationsRoll`, `calEmbed`, `applyForUxd`, `uxdCta`.

Vertical rhythm is centralised in `src/layouts/SectionLayout.astro` via three tiers (`narrow`, `normal`, `wide`); `Sections.astro` maps each section type to a tier. Don't sprinkle `py-*` utilities on individual section components — tune the tier instead.

## Component hierarchy (atomic design)

`src/components/` follows atoms → molecules → organisms → sections.

- **atoms** — primitives like `Button`, `Heading`, `Text`, `Tag`, `Eyebrow`, `SectionTitle`, `SkillIcon`, `ModalityIcon`, `GradientLink`, `DevOnly`.
- **molecules** — small compositions: `Card`, `ProjectCard`, `QuoteCard`, `NavItem`, `NavItemDropdown`, `FormField`, `FilterBar`, `FilterDropdown`, `SocialLinks`, `PhaseTag`, `Accordion`, `UxdApplicationForm`.
- **organisms** — standalone complex components: `Head`, `Header` (in `sections/`), `Footer`, `Navigation`, `MobileMenu`, `Hero`, `RichSearch`, `SkillsCloud`, `FeedFilter`, `FilterableContent`, `CookieBanner`, `Person`, `TOC`.
- **sections** — full-width page blocks (see list above). These are what page YAML composes.

`DevOnly` and `devClass()` (from `@utils/dev`) hide UI in production — useful for scaffolding labels and debug borders. `Sections.astro` already labels every section in dev so you can see structure at a glance.

## Styling

### Tokens and gradients

Tailwind v4's `@theme` block lives in `src/styles/colors.css`. The site identity centres on a four-stop **phase gradient** (`understand → define → deliver → sustain`). Every gradient utility on the site — nav bottom bar, hero band, full-bleed section backgrounds, dividers (`gradient-rule`), input underlines (`gradient-underline`), card frames (`gradient-frame`), and per-project card backgrounds — pulls from a single source of truth:

```css
--phase-gradient-method: in oklch longer hue;
--phase-gradient-angle: 100deg;
--phase-gradient-stops:        var(--color-phase-understand), …, var(--color-phase-sustain);
--phase-gradient-stops-light:  /* light tints */
--phase-gradient-stops-dark:   /* dark tints */
```

Change the method or angle once and every gradient updates. The vertical-rule utility (`gradient-rule-vertical`) keeps `to bottom` since tilting a 2px-wide line doesn't read.

Useful interpolation methods: `in oklch longer hue` (vibrant rainbow), `in oklch shorter hue` (perceptually uniform, no grey midpoints), `in oklab` (CSS Color 4 default — passes through grey on complements). Edit the value in `src/styles/colors.css` and hard-refresh to preview.

### Type

- `--font-serif` and `--font-sans` both map to **Fraunces** (variable; weights 300/400/500/700)
- `--font-mono` maps to **JetBrains Mono**

Fonts are configured in `astro.config.mjs` via Astro's font integration (Bunny Fonts provider) and declared in `src/components/organisms/Head.astro`. Fraunces 400 + 700 (latin) are preloaded for above-the-fold paint; everything else loads on demand.

### Other style entry points

- `src/styles/global.css` — base imports
- `src/styles/typography.css` — heading/body/link defaults
- `src/styles/components.css` — button, card, tag variants
- `src/styles/utilities.css` — site-specific utilities (brackets, corner brackets, gradient utilities)
- `src/styles/breakpoints.css` — responsive breakpoint overrides

## Icons

unplugin-icons is configured in `astro.config.mjs` for **JSX/React** output (compiler: `'jsx'`). Use `class` (not `className`) in both Astro and React components.

```tsx
import IconGithub from '~icons/simple-icons/github';

<IconGithub class="h-5 w-5 text-primary-500" />
```

Browse icons at [Icônes](https://icones.js.org) or [icon-sets.iconify.design](https://icon-sets.iconify.design).

For **dynamic icons** driven by content data (e.g. a skill JSON storing `"icon": "hugeicons:test-tube-01"`), unplugin-icons can't resolve a runtime path. Use the helpers instead:

- `SkillIcon.astro` — pass a skill `slug`; resolves the iconify id via `@utils/skills` and renders SVG at build time using `@iconify/utils`.
- `ModalityIcon.astro` — for `clinic | studio | community`. Source SVGs in `src/assets/icons/` use `currentColor` and are imported as `?raw` strings via `@utils/modalityIcons`.

## API endpoints

`src/pages/api/[collection].json.ts` exposes every content collection as JSON automatically — `/api/pages.json`, `/api/projects.json`, `/api/people.json`, `/api/skills.json`, etc. Add a new collection to `src/content.config.ts` and the endpoint appears with no extra wiring. CORS is open (`Access-Control-Allow-Origin: *`) per `netlify.toml`.

There are also two hand-built endpoints:

- `src/pages/api/altcha/challenge.ts` — issues Altcha challenges for the UXD application form
- `src/pages/api/apply.ts` — verifies the Altcha solution and sends the application via Brevo. Requires server env vars (Brevo API key + recipient address); see the file for the exact names.

`src/pages/rss.xml.ts` generates an RSS feed of project updates.

## Pages CMS

The site is wired up to [Pages CMS](https://pagescms.org). Configuration lives in `.pages.yml` and lets editors manage pages, projects, people, organisations, skills, navigation, quotes, and site settings without touching code. Log in at https://app.pagescms.org with the GitHub account that has repo access.

### Auto-fix permalinks

`.github/workflows/auto-fix-permalinks.yml` keeps page filenames and `permalink` fields in sync bidirectionally. Renaming `src/content/pages/foo.yaml` → `bar.yaml` rewrites the permalink; changing the permalink renames the file. The Python script lives at `.github/scripts/auto_fix_permalinks.py` and the workflow commits any fixes back to the branch.

## Project structure

```
src/
├── assets/                # Images and SVGs (referenced by absolute path)
├── components/
│   ├── atoms/             # Button, Heading, Text, Tag, SkillIcon, ModalityIcon, …
│   ├── molecules/         # Card, ProjectCard, QuoteCard, FilterBar, NavItem, …
│   ├── organisms/         # Head, Footer, Navigation, MobileMenu, RichSearch, SkillsCloud, …
│   └── sections/          # Page section blocks composed in YAML (and Sections.astro switch)
├── content/
│   ├── pages/             # YAML pages (one file = one route)
│   ├── projects/          # YAML case studies
│   ├── people/            # JSON team profiles
│   ├── phases/            # JSON phase definitions
│   ├── modalities/        # JSON modality definitions
│   ├── skills/            # JSON skill definitions
│   ├── organisations/     # JSON clients / partners / funders
│   ├── quotes/            # JSON testimonials
│   ├── navigation/        # JSON menu structures
│   └── site/config.json   # Global site config
├── content.config.ts      # Collection schemas (Zod)
├── layouts/
│   ├── BaseLayout.astro     # Document shell (<html>, <Head>)
│   ├── PageLayout.astro     # Header + footer wrapper
│   └── SectionLayout.astro  # Section wrapper with vertical-rhythm tiers
├── lib/
│   ├── config.ts                # Re-exports site config as a typed const
│   └── rehype-table-align.ts    # Custom rehype plugin
├── pages/
│   ├── index.astro              # Homepage (renders home.yaml)
│   ├── [...path].astro          # All other YAML pages
│   ├── projects/[slug].astro    # Project detail pages
│   ├── people/[id].astro        # Person detail pages
│   ├── 404.astro
│   ├── rss.xml.ts               # Project-updates RSS
│   └── api/
│       ├── [collection].json.ts # Auto-generated JSON for every collection
│       ├── altcha/challenge.ts  # Altcha challenge issuer
│       └── apply.ts             # UXD application submission (Brevo)
├── styles/
│   ├── global.css           # Base imports
│   ├── colors.css           # @theme tokens, phase gradient SoT
│   ├── typography.css       # Heading/body/link defaults
│   ├── components.css       # Button/card/tag variants
│   ├── utilities.css        # Site-specific utilities
│   └── breakpoints.css
└── utils/                   # content.ts, dev.ts, projects.ts, people.ts, skills.ts, …
```

## Deployment

`@astrojs/netlify` adapter; build runs on push to `main` via Netlify's GitHub integration. The site URL is set from `DEPLOY_PRIME_URL` / `URL` (Netlify-provided) at build time and falls back to `siteConfig.url` for local dev — see `astro.config.mjs`.

## Further reading

- [Astro Docs](https://docs.astro.build) — content collections, image optimisation, view transitions
- [Tailwind CSS v4](https://tailwindcss.com) — the `@theme` block model
- [Pages CMS Docs](https://pagescms.org/docs)
- [Atomic Design](https://atomicdesign.bradfrost.com/chapter-2/) — the component-hierarchy rationale
- `.localconfig/CLAUDE.md` — extended notes on conventions and gotchas (also consumed by AI tooling)
