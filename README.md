# shopivibe

My ideal Shopify theme...but vibe-coded

A Shopify theme built with Vite, Lit and Tailwind.

## Stack

- **Vite** — bundles scripts and styles from `src/scripts` and `src/styles` into assets
- **Lit** — web components for interactive UI
- **Tailwind v4** — utility CSS via `@tailwindcss/vite`

## Directory Structure

```
src/                  → Theme source (liquid, config, templates, locales)
src/scripts/          → JS entry points, bundled by Vite to assets
src/styles/           → CSS entry points, bundled by Vite to assets
regional/{store}/     → Per-store overrides, merged over src (created if missing)
staging/{store}/      → Intermediate build output (full theme)
dist/{store}/         → Final output, only receives changed files
```

## Store Selection

Stores are defined in `.creds.yml` (see `.creds.yml.sample`). Each top-level key under `shopify:` is a store ID.

When running build or watch, stores are selected by:

1. `STORES` environment variable (comma-separated), e.g. `STORES=au,us,uk`
2. Interactive prompt if `STORES` is not set — lists **every** store id under `shopify:` in `.creds.yml` (numbered options with highlighting). There is no “all stores” shortcut.

Store credentials and ids live in **`.creds.yml` only** (not `.env`).

## Build Process (`npm run build`)

The build runs in this order:

### 1. Vite build

All `src/scripts/*.js` files are entry points. Vite bundles them (with Tailwind processing `src/styles/`) and outputs to a temp build directory. `main.js` is the global entry. All other entries are component scripts.

### 2. Assemble to staging

For each selected store, `staging/{store}/` is assembled:

- Copy `src/` to `staging/{store}/`, skipping `scripts/`, `styles/`, and `assets/` dirs, and `.gitkeep` files
- Copy Vite-built assets into `staging/{store}/assets/`
- Merge `regional/{store}/` over `staging/{store}/` (regional files win)

### 3. Generate js_translations.liquid

Read all `staging/{store}/locales/*.json`. Generate `staging/{store}/snippets/js_translations.liquid` — a Liquid `{% case %}` on `request.locale.iso_code` that sets `window.shopivibe.translations` to only the current locale's data. The `{% else %}` branch uses the `.default.json` locale as fallback.

### 4. Inject vite renders

For each Vite-built asset matching `snippets_*.js` or `sections_*.js`, find the paired `.liquid` file in staging (e.g. `snippets_CartItem.js` → `snippets/cart_item.liquid`). Prepend `{% render 'vite' with 'snippets_CartItem.js' %}` to it (argument is the **full built asset filename**, e.g. including `.js`). Scripts load as ES modules (`type="module"`), so the browser deduplicates — if a snippet appears multiple times on a page, the script only loads once.

### 5. Sync staging to dist

Compare `staging/{store}/` against `dist/{store}/`. Only write files to dist that are new or have changed content. Delete files from dist that no longer exist in staging. This prevents unnecessary file writes, which matters because `shopify theme dev` watches dist and uploads every change.

## Commands

For all commands, first determine which stores to act on (**Store Selection** above — use `STORES` or the interactive prompt).

### npm run build

1. Run a full build per store

### npm run watch

1. Run a full build per store
1. Start watching `src/` and `regional/{store}/` for each selected store
1. On file change/add/remove, re-run the full build (staging→diff→dist means only actual changes reach dist)
1. Start `shopify theme dev` for each store in a **separate terminal tab** (e.g. `ttab` on macOS), each on an incrementing port from **9292**

### npm run deploy

1. Run a full build per store
1. Ask what to call the theme
1. Upload new themes to each store from `dist/{store}`

### npm run upload

1. Run a full build per store
1. For each store, ask which existing theme to target, and allow the user to choose with an interactive UI.
1. Upload the sections and config/settings_schema.json first, then, upload the entire theme, replacing the one targeted.

### npm run download

1. Run a full build per store
1. For each store, ask which existing theme to target, and allow the user to choose with an interactive UI.
1. Download the theme to `staging/{store}` - this allows the download process to benefit from checksum skipping.
1. Copy files into `regional/{store}/...` when the same **relative path** exists under **any** other store’s `regional/` tree (evaluate this set dynamically); otherwise into `src`. Skip `assets` folders. Strip auto-injected vite lines. **`snippets/js_translations.liquid` is gitignored** (generated); no separate skip list for it.
1. Pause to allow the user to commit diffs for that store before moving onto the next store.
1. Exit once all stores have been done.

### npm run sync

1. Same as `download`, but only download `config`, `locales` and `templates/*.json`, which are the user-configured settings.

| Command             | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `npm run build`     | Full build for selected stores                                      |
| `npm run watch`     | Build + watch + theme dev                                         |
| `npm run deploy`    | Build + ask for theme name + upload as new themes                   |
| `npm run upload`    | Build + pick themes + upload schema + replace entire target theme   |
| `npm run download`  | Build to staging + pick themes + download + move to src / regional |
| `npm run sync`      | Like download, but only `config`, `locales`, `templates/*.json`    |


## Script Pairing Convention

Snippets and sections are paired with scripts by naming convention:


| Liquid file                 | Script file (any of these work)                                                         |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `snippets/cart_item.liquid` | `src/scripts/snippets_cartItem.js` or `snippets_CartItem.js` or `snippets_cart_item.js` |
| `sections/product.liquid`   | `src/scripts/sections_product.js` or `sections_Product.js`                              |


The build injects the `{% render 'vite' %}` call automatically. You just create the snippet and the script.

## Translations

Locale files live in `src/locales/` (e.g. `en.default.json`, `fr.json`). The build generates `snippets/js_translations.liquid`, which uses Liquid to output only the active locale's translations to `window.shopivibe.translations`. That snippet is **generated** and **gitignored**.

Included in layout via `{% render 'js_translations' %}`.

## Credentials

Copy `.creds.yml.sample` to `.creds.yml` and fill in store details. Each store needs `STORE_URL` and optionally `SHOPIFY_API_KEY`.