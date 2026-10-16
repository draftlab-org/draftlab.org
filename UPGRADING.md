# Upgrading

Notes for sites built from Scaffold when pulling a new version with `npm run update-from-scaffold`.

## 0.6 → 0.7

A second round of improvements brought back from sites built on Scaffold (draftlab.org, superbloom.design, measurementlab.net, gdpnext). Nothing changes the shape of your content; the items marked **action needed** are small clean-ups on your side.

### Before you merge

- **Node 24 required.** `engines.node` is now `>=24.0.0` and `netlify.toml` pins `NODE_VERSION = "24"`. Node 22 reached end of active support; Netlify builds switch over with the pin. Update your local Node (`nvm install 24`) before running `npm install`.
- **Dependencies bumped** to current minors: Astro 7.4, the Netlify adapter 8.2, React 19.3, Tailwind 4.3, plus `@astrojs/rss` as a new dependency. Run `npm install` after merging. If the first build fails with `Cannot find package '@netlify/blobs'`, run `npm dedupe` — npm occasionally nests that package under the adapter where Astro's session storage can't resolve it.
- **`.pages.yml` conflicts are likely** if you customised it. New in this version: a `settings:` block (content merge + commit message templates), `seoTitle`/`seoDescription` on every content collection, a `email` field in Site Settings, a stricter slug pattern, and the `extraInfo` person field is gone. Take Scaffold's version as the base and re-apply yours; the update script re-syncs your category lists afterwards.

### Action needed

- **Delete `public/robots.txt` and `public/llms.txt` if you have them.** Both are now generated routes (`src/pages/robots.txt.ts`, `src/pages/llms.txt.ts`). A static file in `public/` shadows the route, so you'd keep serving the old content. `public/**` is protected, so the update script does not remove them for you.
- **Slugs must be lowercase and non-empty in the CMS.** The permalink/ID pattern changed from `^[a-zA-Z0-9_-]*$` to `^[a-z0-9_-]+$`. Existing content with uppercase permalinks still builds, but Pages CMS will refuse to save that entry until the permalink is lowercased (and the auto-permalink workflow then renames the file). Grep your content for `permalink: .*[A-Z]` to find them.
- **`FormField.astro` and `PageSection.astro` are removed** (they were unused in Scaffold). If you imported either in your own components, copy the old file from your git history into your site — they were never wired to anything in the template.
- **People `extraInfo` is gone** from the schema and the CMS. It was never rendered anywhere. Values left in your JSON are ignored (not an error); move anything you want to keep into `affiliation` or `title`.
- **Card images in `CardSection` now have `alt=""`** because the card title follows as a heading (screen readers were reading the title twice). If you put meaningful, non-title imagery in cards, override in your own CardSection.

### Behaviour changes (no edits required, but check your site)

- **Page titles get the site name appended** (`About | Your Site`) unless the title already ends with it. If you were adding the site name yourself in a page component, drop it to avoid `About - Your Site | Your Site`.
- **Preview builds (`PUBLIC_PREVIEW=true`)** now render `noindex,nofollow`, `robots.txt` disallows everything, draft content gets a DRAFT label, and an orange frame with a "Preview" badge is drawn around the page. Set the variable only on your preview Netlify site — see the comment in `netlify.toml`.
- **Whole cards are clickable** (Card, ArticleCard, article index): the title link stretches over the card. Nested links inside a card need `relative z-10` to stay clickable; Scaffold's own cards already have it. `Card.astro` is now `position: relative`, and CardSection's grid uses `.cards-grid` from `scaffold.css` (equal row heights; a lone card or pair is centred — `center={false}` to opt out).
- **Logo wall** centres a short last row (flex-wrap instead of an auto-fill grid).
- **Table of contents** picks the active heading from scroll position instead of an intersection band, and a long TOC scrolls inside the sticky sidebar. TOCs are capped at two levels (h2 + h3); rich-text section TOCs that showed h4+ before lose those entries.
- **Rich search** caps results at 10 per category, no longer flashes its skeleton when opened, and the nav search button shows a ⌘ K / Ctrl K hint from `md` up.
- **Sitemap** excludes `/api/*`, `/og/*` and non-HTML endpoints, and article URLs carry `<lastmod>` from `publishedDate`.

### New, nothing to do

- **SEO pass.** `Head.astro` emits `og:type` (`website` / `article` / `profile`), `og:site_name`, `og:locale`, image type/width/height/alt, `article:published_time` / `article:author` / `article:section` / `article:tag` on articles, and correct `name="twitter:*"` tags. Every page carries a schema.org JSON-LD graph (Organization + WebSite) and detail pages add Article, Person or CreativeWork nodes (`@utils/jsonld`, `atoms/JsonLd.astro`). Layouts accept `ogType`, `noindex`, `jsonLd` and `article` props.
- **`seoTitle` / `seoDescription`** on pages, articles, docs, people, partners and resources override the browser-tab title and meta description; `email` in Site Settings feeds structured data and `llms.txt`.
- **Fixes:** `Heading` styles follow `level` even when `as` renders a different tag; the fallback OG image URL is absolute on the site URL (not the request URL); auto-excerpts skip a leading `[EmbedLink](…)`; docs prev/next and sidebar use `getDocUrl`; the search index uses `getArticleUrl` / `getDocUrl`; the search legend punctuation.
- **Feeds:** `/rss.xml` (published articles), `/robots.txt`, `/llms.txt` generated from your content; `<link rel="alternate">` and `<link rel="sitemap">` in Head.
- **Navigation:** dropdown chevron rotates when open; top-level active links carry `aria-current="page"`.
- **`SectionHeader` `compact` prop**; `CallToActionSection` accepts a default slot (rendered only when used).
- **Pages CMS:** `settings.content.merge` keeps keys the CMS doesn't manage; commits are stamped "(via Pages CMS)"; the pages list shows the permalink column.

## 0.5 → 0.6

This release brings back features and fixes developed on sites built from Scaffold. Most schema changes still accept the old content shape, so an existing site keeps building. The items marked **action needed** need a change on your side.

### Before you merge

- **Node 22.12+ required.** `package.json` now has `"engines": { "node": ">=22.12.0" }` and `netlify.toml` pins `NODE_VERSION = "22"`.
- **Astro is bumped to `^7.3.3`**, and several markdown packages that were previously only transitive are now declared (`@astrojs/markdown-remark`, `unified`, `remark-parse`, `remark-rehype`, `rehype-raw`, `rehype-expressive-code`, `rehype-autolink-headings`). Run `npm install` after merging.
- **`.pages.yml` will likely conflict** if you've customised it — it changed substantially (category sync markers, new sections, buttons, social links, nested navigation, redirects, body images). Take Scaffold's version as the base and re-apply your changes.

### Action needed

- **Article `tags` are gone — use `categories`.** Articles have a single taxonomy now. Old `tags:` in frontmatter are ignored (not an error), so move any values you still want into `categories:` and add them to `src/content/categories/articles.json`. `getArticlesByTag` and `getAllTags` were removed from `@utils/articles`; related articles are now scored by shared categories.
- **FlexiSection is removed.** Pages using `type: flexi` (nested sections) won't build. Move the nested sections up to the page's top-level `sections:` list.
- **Button, Link and Tag are `.tsx` only.** `Button.astro`, `Link.astro` and `Tag.astro` are deleted. Update imports in your own components:
  ```diff
  - import Button from '@components/atoms/Button.astro';
  + import Button from '@components/atoms/Button.tsx';
  ```
  The `.tsx` atoms accept `class` as an alias for `className`, so existing Astro call sites keep working. `<Button href>` now renders an `<a>`.
- **Category dropdowns in the CMS are now synced, not fetched.** The old `options.fetch` pointing at `scaffold.draftlab.org/api/categories.json` never worked in Pages CMS (and pointed at Scaffold's categories, not yours). The update script re-syncs `.pages.yml` from your `src/content/categories/*.json` automatically; if it warns, run `npm run sync:pages-categories` and fix what it reports. If you added your own category dropdowns, wrap their `values:` in `# pages-cms:category-sync start <id>` / `# pages-cms:category-sync end` markers.
- **Umami moved to the site config and is off by default.** `Head.astro` no longer hardcodes Scaffold's Umami instance (which meant derived sites were reporting to it). To keep analytics, set `analytics.umami.src` and `analytics.umami.websiteId` in `src/content/site/config.json` (or in Site Settings in the CMS). It only loads on production builds.
- **Section `bgColor` must be in the palette.** Allowed values: `white`, `gray`, `gradient`, `primary-light`, `secondary-light`, `highlight-light`, `dark`, `highlight-dark` (see `src/utils/backgrounds.ts`). Anything else fails the build — add your own colour to the palette instead of using a raw class. The `gradient` background previously rendered nothing; it now draws primary → highlight.
- **Navigation children need `type: link` for CMS editing.** Menus now nest three levels (links and groups inside dropdowns). Old two-level menus still build — children without a `type` default to links — but Pages CMS won't recognise them until you add `"type": "link"` to each child.
- **Styles for new components live in `src/styles/scaffold.css`.** `src/styles/**` is `merge=ours`, so this file arrives on your first update and is imported by `BaseLayout`. Leave it unedited so future updates reach it; override its rules in your own stylesheets.

### Still accepted (migrate when convenient)

- **Social links are now a list.** `site.social` is `[{ platform, url }]` (see `src/utils/social.ts`); the old `{ github: "...", ... }` object still works. People gain optional `socialLinks`.
- **Partner `category` is now a list** of one or more categories. A single string is still accepted.
- **Buttons take a `link`** (page picker or external URL) instead of a free-text `href`. `href` is still accepted and shown as "Custom URL" in the CMS; when both are set, `link` wins.
- **Page `sections` may be empty** (`sections:` with no items no longer fails the build).

### New, nothing to do

- Section types: `callToAction`, `miniCta`, `testimonials`, `logoWall`, `featuredArticles`; `hero` gains an optional side image and alignment.
- Breadcrumbs (site-wide `showBreadcrumbs`, per-page `breadcrumbs`), share links (`share` in site config), article table of contents and related content (`relatedResources` on articles and resources).
- Filter bars on landing pages gain text search, sort and multi-select, synced to the URL.
- Full-text site search backed by a new `/api/search.json` index. Drafts no longer leak through any `/api/*.json` endpoint.
- CMS-managed redirects in `src/content/site/_redirects.json` (Scaffold's demo file is removed from your site by the update script; a missing file just means no redirects).
- Images in article and doc bodies uploaded through the CMS (`body-images` media entry).
- `#` anchors on markdown headings; TOC entries are real links.
- Scripts: `typecheck`, `lint`, `lint:fix`, `sync:pages-categories`. GitHub Actions: `sync-pages-categories.yml`, `linkcheck.yml` (see README).
- Performance: lighter hydration (`client:idle` / `client:visible` / `client:media`), resized webp card images, fewer preloaded fonts. Font preloads live in `fonts.config.mjs`, which is yours — trim your own preloads the same way if you like.
