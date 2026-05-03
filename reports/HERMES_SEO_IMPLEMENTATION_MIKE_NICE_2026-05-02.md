# Hermes SEO Implementation — Mike Nice Empanadas

Source reviewed: `/Users/rajatsingh/Downloads/S4 AI Agency/hermesseo.md` transcript from the linked YouTube video.

## What the video recommends

The useful pattern is an autonomous SEO production loop:

1. Set one durable SEO goal.
2. Generate keyword clusters and site architecture.
3. Create local markdown/content files.
4. Build landing pages/articles around clusters.
5. Add internal links, sitemap, llms.txt, and schema.
6. Repeat with agent/swarm tasks for new clusters, gap analysis, and link building.

## What was implemented first for Mike

Added a local SEO cluster layer to the static Mike Nice site:

- `raleigh-food-truck-catering.html`
- `durham-food-truck-catering.html`
- `knightdale-food-truck.html`
- `cary-food-truck-catering.html`
- `wedding-catering-raleigh.html`
- `corporate-catering-raleigh-durham.html`
- `college-food-truck-catering.html`
- `best-empanadas-triangle-nc.html`

Also added:

- Homepage internal-link block: `#seo-location-guides`
- `sitemap.xml`
- `robots.txt`
- `llms.txt` local SEO landing-page references
- LocalBusiness JSON-LD on each new landing page

## Why this first

Mike needs near-term local intent coverage, not generic blog volume. These pages target buyer/search intent such as:

- Raleigh food truck catering
- Durham food truck catering
- Knightdale food truck
- wedding catering Raleigh NC
- corporate catering Raleigh-Durham
- NC State / Duke / UNC food truck catering
- best empanadas in the Triangle

## Next SEO workstream

1. Make sure these files deploy with the live site.
2. Submit `https://mikeniceempanadas.com/sitemap.xml` in Google Search Console.
3. Add 3-5 real photo blocks per landing page after Mike assets are finalized.
4. Create weekly location/schedule posts from Instagram updates.
5. Build local backlink list: food truck directories, Raleigh/Durham/Cary event pages, campus event resources, wedding/vendor directories.
6. Add a real inquiry endpoint/form tracking before launch.

## Verification

- Local static server returned `200 OK` for `raleigh-food-truck-catering.html`.
- `sitemap.xml` generated and includes all existing + new pages.
- Link scan found no new missing SEO-page links. Existing `${KB.tracker}` template string in `index.html` is unrelated.
