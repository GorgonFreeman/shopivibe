# Build process — clarifications

Answer inline (or below each section). These unblock a single coherent build pipeline that matches `README.md`.

---

## Store selection and config

1. **`.env` vs `.creds.yml`**  
   The README says commands should use stores from **`.env`** if set, but **Credentials** only documents **`.creds.yml`**. Should **`STORES`** (and related vars) live only in `.env`, only in `.creds.yml`, or both—and if both, which wins?

2. **Interactive prompt**  
   When `STORES` is unset, should the prompt list **every key under `shopify:`** in `.creds.yml`, support **multi-select**, and is **“all stores”** a default or an explicit choice?

3. **Missing `regional/{store}/`**  
   If a store id has no `regional/{store}/` folder, is that **normal** (treat as empty), or should the build **warn** or **error**?

---

## Layout and sync semantics

4. **`staging/{store}/` vs a single staging dir**  
   The README specifies **`staging/{store}/` per store**. An alternative is a single ephemeral staging directory (e.g. under `dist/`) cleared between stores. Do you want **literal `staging/{store}/` in the repo** (likely gitignored), or is **any** ephemeral “full theme before dist” directory acceptable as long as behaviour matches?

5. **Dist diff**  
   For “only write changed files to `dist`,” is **byte-for-byte compare** enough, or do you need **normalisation** (e.g. line endings) to avoid false churn for Shopify / `theme dev`?

---

## Vite and assets

6. **CSS entries**  
   Should **CSS** be pulled in only via **`main.js`** (and `@import` / Tailwind), or are there **multiple CSS entry points** under `src/styles/` that must be separate Rollup inputs?

7. **Hashed chunks vs stable names**  
   Entries use stable `[name].js`, but shared chunks may be hashed. For **`{% render 'vite' with '…' %}`**, is the argument always the **logical entry name** (e.g. `snippets_CartItem`) resolved by a **snippet**, or must **every** script asset have a **stable, predictable filename** on disk after build?

---

## Liquid / `vite` snippet contract

8. **Exact `render` API**  
   Please confirm what **`vite.liquid`** (or equivalent) expects: **stem** of the JS entry, **full filename**, **asset URL**, etc.—whatever the build must emit.

9. **Prepend vs idempotent inject**  
   Should vite inject lines **prepend once** and **skip** if already present (safe on rebuild), or **always rewrite** the top of the file?

---

## Download / sync behaviour

10. **“Mentioned in regional” rule**  
    For moving downloaded files into `regional/{store}` vs `src`: does “mentioned anywhere in the total list of all files in all regional directories” mean **same relative path exists under any `regional/*/`**, a **maintained list**, or another rule?

11. **Auto-generated skip list**  
    Besides **`snippets/js_translations.liquid`** and **vite inject lines**, what must **download** never overwrite or merge into `src` / `regional` (exact paths or naming rules)?

12. **`sync` scope**  
    README says **`config`**, **`locales`**, and **`templates/*.json`**. Confirm that excludes e.g. **`sections/*.json`**, **`templates/customers/*.json`**, or list every glob you want included.

---

## Shopify CLI / deploy / watch

13. **`upload` / `deploy`**  
    Preferred mechanism: **`shopify theme push`** (with which flags), **`theme package`**, or other? Any **hard rule** (e.g. never `--nodelete`, always `--nodelete`)?

14. **`theme dev` path and ports**  
    Confirm **`shopify theme dev`** uses **`dist/{store}`** as the theme root, **first port 9292**, then **9293, 9294, …** per store. Should the **base port** be configurable (env)?

15. **macOS `ttab` vs `concurrently`**  
    Is **new Terminal/iTerm tabs** required on macOS, or is **concurrently in one terminal** acceptable?

---

## npm scripts / aliases

16. **README aliases (`b`, `w`, `dep`, …)**  
    Should we add **duplicate `package.json` script entries** for each alias, skip aliases, or use a **small runner**—your preference?

---

## Anything else

17. **Free field**  
    Constraints, “do not do X”, or dependencies on other tools not in `README.md`.
