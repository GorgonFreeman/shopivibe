# shopivibe
My ideal Shopify theme...but vibe-coded

## The Plan
- Vite build process
- Lit components
- Tailwind classes/styling
- Snippets can include their own JS, deduplicated overall
- Translations are automatically built into a big JS file to use in scripts
- Regional files and the ability to watch/deploy multiple themes simultaneously
- Hot reloading

## Regional Build Process
You have a .creds.yml.

Inside the shopify creds, each top-level node is a store.

When starting any build process, you will be asked which stores you want to include, unless you have a .env variable "STORES" already set.

As many stores as you select is as many dist directories as will be made. Each will use their own regionalised files from /regional, in addition to any files from src.

e.g. if you run npm run watch, you are asked which stores you want to develop on, and if you say "au, us and uk", you will get 3 dist directories, all watching.

Any terminal processes will be done in their own tabs so that you can answer questions. 

## Build Process

We use Lit, Tailwind and Vite.

src is built to dist/{store} for each store being built.

src/scripts are built to dist/{store}/assets.

src/styles are built to dist/{store}/assets.

Snippets and sections are paired with scripts, to enable deduplication and bundling. e.g. snippets/product_tile.liquid is paired with snippets_productTile.js, or snippets_ProductTile.js, or snippets_product_tile.js. 

The user just has to create a snippet, then the corresponding script, to enable this. If product_tile.liquid appears twice on a page, the scripts for it will only load once.

### Regional files

After build, regional files from regional/{store} are added to the built files.

### Translations

After regional files are added, all locales from dist/{store}/locales are indexed in a single snippet called js_translations.liquid. The snippet should include all translations by their locale name, and can be included for use by scripts.