# Build process — clarifications

Questions and **decided answers** for the shopivibe build pipeline.

---

## Store selection and config

1. **`.env` vs `.creds.yml`**  
   **Q:** Should `STORES` (and related vars) live only in `.env`, only in `.creds.yml`, or both—and if both, which wins?  
   **A:** The README reference to `.env` was a mistake. **Use `.creds.yml` for project store configuration** (not `.env`). `README.md` is updated accordingly.

2. **Interactive prompt**  
   **Q:** List every key under `shopify:`? Multi-select? “All stores” option?  
   **A:** **List all keys under `shopify:`.** There is **no “all stores”** option. **Interactive UI** for any choice uses **numbered options and highlighting.**

3. **Missing `regional/{store}/`**  
   **Q:** Normal empty merge, warn, or error?  
   **A:** **Create the directory automatically** if it does not exist.

---

## Layout and sync semantics

4. **`staging/{store}/` vs a single staging dir**  
   **Q:** Literal per-store `staging/{store}/` or ephemeral staging?  
   **A:** **Does not matter** — ephemeral staging is fine (e.g. under `dist/` or a temp dir) as long as behaviour matches the pipeline.

5. **Dist diff**  
   **Q:** Byte compare vs normalisation?  
   **A:** **Byte-for-byte** is enough for now; can refine later.

---

## Vite and assets

6. **CSS entries**  
   **Q:** Only via `main.js` or multiple CSS entry points?  
   **A:** **Multiple CSS entry points** — may live in JS (imports) or as **standalone CSS files** in `src/styles/`.

7. **Hashed chunks vs stable names**  
   **Q:** How should `{% render 'vite' with '…' %}` relate to hashed chunks?  
   **A:** **Implementer discretion** — resolve in whatever way keeps the pipeline correct and maintainable.

---

## Liquid / `vite` snippet contract

8. **Exact `render` API**  
   **Q:** Stem, filename, or URL?  
   **A:** **`render` should take the full filename** (e.g. including `.js`).

9. **Prepend vs idempotent inject**  
   **Q:** Skip if already present, or rewrite every time?  
   **A:** **Rewrite every time.** Staging avoids mass redundant uploads to `dist` when paired with the diff step.

---

## Download / sync behaviour

10. **“Mentioned in regional” rule**  
    **Q:** Same path under any `regional/*/`?  
    **A:** **Assess dynamically** when needed. Example: if `regional/us/config/settings_data.json` exists, then when acting on store `uk`, the path `config/settings_data.json` is treated as a **regional** file (same relative path under another store’s `regional/` counts).

11. **Auto-generated skip list**  
    **Q:** What to skip on download besides translations / vite lines?  
    **A:** **Ignore `js_translations.liquid`** — **gitignore it**; no separate skip list. On download, **remove auto-injected vite lines** only.

12. **`sync` scope**  
    **Q:** Confirm globs?  
    **A:** **Only as stated in README:** `config`, `locales`, and `templates/*.json` (user-configured settings). Nothing beyond that scope.

---

## Shopify CLI / deploy / watch

13. **`upload` / `deploy`**  
    **Q:** `theme push` flags? Hard rules?  
    **A:** **Upload** should **replace the theme entirely** (no orphaned old files). **Deploy** is a **new theme**, so full replacement is not the same concern. **Implementer discretion** on exact CLI invocations.

14. **`theme dev` path and ports**  
    **Q:** `dist/{store}`, ports 9292+? Configurable base port?  
    **A:** **Yes** — `dist/{store}`, **9292, 9293, …** Do **not** make the base port configurable.

15. **macOS `ttab` vs `concurrently`**  
    **Q:** Tabs or single terminal?  
    **A:** **New tabs are required** so each store can use a **separate UI**.

---

## npm scripts / aliases

16. **README aliases (`b`, `w`, `dep`, …)**  
    **Q:** Duplicate scripts, skip, or runner?  
    **A:** **Skip aliases for the moment.**

---

## Anything else

17. **Free field**  
    **Q:** Extra constraints?  
    **A:** **None** — implement as appropriate.
