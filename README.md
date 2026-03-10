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

When starting any build process, you will be asked which stores you want to include, unless you have the STORES environment variable already set (e.g. `STORES=au,us,uk`).

As many stores as you select is as many dist directories as will be made. Each will use their own regionalised files from /regional, in addition to any files from src.

e.g. if you run `npm run watch`, you are asked which stores you want to develop on, and if you say "au, us and uk", you will get 3 dist directories, all watching.

**Commands:** `watch` (dev + file watcher), `download` (pull from Shopify, same as down), `upload` (select theme per store, push over it), `deploy` (create new theme per store with given name).

Any terminal processes will be done in their own tabs so that you can answer questions. 

## Vite build process

We use Tailwind and Lit. Scripts build from `src/scripts`, styles from `src/styles`. Any top-level files in these directories are built as entry points.

A `vite_scripts.liquid` snippet is created and maintained by the build process, containing a switch statement that includes the correct JS for each entry. Injection into source files happens **only when both** exist: a matching section/snippet **and** a corresponding script in `src/scripts`. For example, `snippets/product_tile.liquid` + `src/scripts/snippets_product_tile.js` → inject at top of the liquid file. Same for sections: `sections/product.liquid` + `src/scripts/sections_product.js` → inject.

The snippet can also be manually used for other cases.

JS is bundled and deduplicated so that if two `product_tile.liquid` snippets are included on the same page, their common scripts are not loaded twice.

This is similar to `vite-plugin-shopify`.

