# Regional files

Each subdirectory (e.g. `au`, `us`, `uk`) contains store-specific overrides.

When building for a store, files from `regional/<store>/` are merged over `src/`, with regional files taking precedence.

Example: to customize the index section for the AU store only, add:

```
regional/au/sections/index.liquid
```
