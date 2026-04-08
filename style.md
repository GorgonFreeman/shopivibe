# JavaScript style and syntax

Observed conventions from a personal codebase, abstracted as **pure style** (no project-specific APIs or architecture).

---

## Modules

- **CommonJS:** `require(...)` and `module.exports = { ... }`.
- **Imports:** relative paths only; depth via `../` as needed.

---

## Naming

- **Bindings:** `camelCase` for functions, methods, variables, and file names when the file is named after its main export.
- **Classes / constructors:** `PascalCase`.
- **Fixed configuration** exported from a module: `SCREAMING_SNAKE` keys are easy to spot and imply “do not treat as a variable.”

---

## Formatting

- **Strings:** single quotes by default.
- **Statements:** semicolons at the end of statements.
- **Multiline** objects and arrays: trailing commas where they improve diff hygiene.
- **Options arguments:** last parameter is often an object with defaults, using empty-object fallback:

  ```js
  const fn = async (a, b, { limit = 250, cursor } = {}) => { /* ... */ };
  ```

- **Template literals:** spaces inside `${ expression }` so the expression does not visually merge with surrounding text.
- **Optional chaining** (`?.`) and **nullish coalescing** (`??`) when they replace repetitive null/undefined checks.
- **Conditional properties** via spread instead of long imperative branches:

  ```js
  return {
    ...base,
    ...condition && { key: value },
  };
  ```

---

## Control flow and effects

- **Early return** when preconditions fail; keep the “happy path” unindented where possible.
- **Exceptions** for states that should not occur if the program is correct (broken invariants, misuse of an API).
- **Returned values** (e.g. `{ ok: false, reason }`) for expected failure modes that callers should handle in bulk—*if* you adopt that distinction, apply it consistently at module boundaries.

---

## Logging

- **`const { env } = process`** and a boolean **`debug`** derived from env when interactive or noisy logging is optional.
- **Short-circuit logging:** `debug && console.log(...)` or `verbose && console.log(...)` so quiet runs need no structural change.
- **Label first:** `console.log('nameOfThing', thing)` so logs are searchable and unambiguous in multi-argument output.

---

## Comments

- Prefer comments for **why**, **invariants**, or **external references**—not for restating the next line.
- Use **`TODO` / `TO DO`** for deliberate deferrals.

---

## Spelling and consistency

- Pick **one spelling tradition** for public names (e.g. British vs American) and stick to it across the codebase so search and muscle memory stay aligned.

---

## Critical analysis

### Minimalism

**What helps:** A small, repeatable set of rules (quotes, semicolons, trailing commas, one options-object shape) reduces decision fatigue. `const` + arrow functions for most logic keeps visual noise low. Optional chaining removes whole columns of guard code.

**What works against it:** Conditional spreads (`...flag && { a: 1 }`) are *syntactically* minimal but *conceptually* dense—one line can hide a type shape change. Relying on “match the file next to yours” instead of automated formatting is minimal in tooling but shifts cost to every review.

**Verdict:** Strong on **syntactic** minimalism; **cognitive** minimalism depends on team tolerance for spread tricks and on consistency without a formatter.

---

### Readability

**What helps:** `SCREAMING_SNAKE` constants read as “important and stable.” Early returns preserve a straight-line happy path. Labelled logs age well in production debugging. Spaces inside `${ }` make boundaries obvious in dense URLs and messages.

**What works against it:** Heavy `?.` chains can obscure *which* step failed. Conditional spreads force the reader to mentally evaluate truthiness and object merges. Mixing “return a failure object” and “throw” without a clear rule blurs skimmability.

**Verdict:** Readability is **high for linear imperative code** and **mixed for compressed expression-heavy code** unless conventions cap complexity (e.g. “no more than one conditional spread per object literal”).

---

### Elegance

**What helps:** Destructured defaults on an options object are a standard, pleasing idiom. A single template-literal rule avoids bikeshedding. Consistent naming tiers (camel / Pascal / SCREAMING) give a quiet rhythm.

**What works against it:** “Elegance” is subjective: some developers find semicolons and single quotes fussy; others find them anchoring. Conditional spreads feel elegant to writers and occasionally clever to readers. British spelling in a US-tooling ecosystem is coherent internally but slightly discordant with most third-party docs.

**Verdict:** The style **rewards writers who value uniform idioms**; **elegance for readers** tracks how aggressively you use shorthand (spread, chaining) versus explicit `if` blocks.

---

## Bottom line

This is a **coherent, low-ceremony** style: imperative, explicit module boundaries, and a few strong formatting habits. It aligns well with **minimalism** at the file level and **readability** when expressions stay short. **Elegance** holds up if you treat dense patterns as a budget—use them where they remove real clutter, not where they save a line at the cost of a second read.
