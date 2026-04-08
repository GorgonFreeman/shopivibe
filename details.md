# Cart item removal animation

## Problem

When a cart item is removed, subsequent items need to slide up smoothly to fill the gap — including when multiple items are removed in quick succession.

## Gotchas

- **`getBoundingClientRect` excludes margin.** The slide offset must include `marginTop` + `marginBottom` via `getComputedStyle`, otherwise a gap remains.
- **`animation: forwards` overrides inline transforms.** The `_animate_in` class pins `transform: translateY(0)` via a filled animation, which takes precedence over any inline `style.transform`. Must remove `_animate_in` from siblings before applying the offset.
- **DOM removal causes reflow.** When `itemEl.remove()` runs, siblings reflow upward naturally. If they still have a negative `translateY`, they double-shift. Before removing the element, reset the offset (with `transition: none`) so reflow and offset cancel out.
- **Multiple removals need additive offsets.** A flat `translateY(-Npx)` gets overwritten by the next removal. Use a CSS custom property (`--offset`) that accumulates: each removal reads the current value and subtracts the removed item's height.

## Implementation

1. **CSS:** `cart-item` has `transform: translateY(var(--offset, 0px))` with a `transition`.
2. **On click** (`cart-item:removed` event bubbles to `cart-items`): subtract height from each subsequent sibling's `--offset`.
3. **On DOM remove** (after API confirms): add height back to `--offset` with `transition: none`, then `itemEl.remove()`. The reflow shift and offset correction cancel out — no visible jump.
