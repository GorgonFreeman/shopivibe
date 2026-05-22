import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';

type Variant = {
  id: string | number;
  available?: boolean;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
};

type ProductLike = {
  options?: Array<string | { name: string; values?: string[] }>;
  variants?: Variant[];
  has_only_default_variant?: boolean;
};

const OPTION_KEYS = ['option1', 'option2', 'option3'] as const;

class VariantPicker extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  private product?: ProductLike;
  private selectedValues: Record<number, string> = {};

  // Server-rendered markup lives in light DOM — skip Lit re-renders that would wipe it.
  shouldUpdate() {
    return false;
  }

  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => this.setup());
  }

  setup() {
    this.loadProductData();
    this.buildOptions();
    this.initSelectedValues();
    this.syncPressedState();
    this.bindButtons();
    this.syncBuyButton();
  }

  loadProductData() {
    if (this.product?.variants?.length) return;

    const productJson = this.querySelector<HTMLScriptElement>('script[data-ref="product"]')?.textContent;
    if (!productJson) return;

    try {
      this.product = JSON.parse(productJson);
    } catch (error) {
      console.error('variantPicker', 'Failed to parse product JSON', error);
    }
  }

  setProduct(product: ProductLike | Record<string, unknown>) {
    this.product = product as ProductLike;

    const script = this.querySelector<HTMLScriptElement>('script[data-ref="product"]');
    if (script) {
      script.textContent = JSON.stringify(product);
    } else {
      const el = document.createElement('script');
      el.type = 'application/json';
      el.dataset.ref = 'product';
      el.textContent = JSON.stringify(product);
      this.prepend(el);
    }
  }

  getOptionNames(): string[] {
    const fromProduct = (this.product?.options ?? [])
      .map(o => typeof o === 'string' ? o : o.name)
      .filter(Boolean) as string[];

    if (fromProduct.length > 0) {
      return fromProduct;
    }

    const variants = this.product?.variants ?? [];
    return OPTION_KEYS
      .map((key, i) => (variants.some(v => v[key] != null) ? `Option ${ i + 1 }` : null))
      .filter((name): name is string => name != null);
  }

  buildOptions() {
    if (this.querySelector('.variant-picker__value')) {
      return;
    }

    if (!this.product?.variants?.length) {
      return;
    }

    if (this.product.has_only_default_variant) {
      return;
    }

    const optionNames = this.getOptionNames();
    if (!optionNames.length) {
      return;
    }

    const variants = this.product.variants;
    const initial = variants.find(v => v.available) ?? variants[0];
    const html = optionNames.map((name, i) => {
      const key = OPTION_KEYS[i];
      const values = [...new Set(variants.map(v => v[key]).filter((v): v is string => v != null))];

      return `
        <fieldset class="variant-picker__option">
          <legend class="variant-picker__option-name">${ name }</legend>
          <div class="variant-picker__values">
            ${ values.map(value => `
              <button
                type="button"
                class="variant-picker__value"
                data-option-index="${ i }"
                data-option-value="${ value }"
                aria-pressed="${ initial?.[key] === value ? 'true' : 'false' }"
              >${ value }</button>
            `).join('') }
          </div>
        </fieldset>
      `;
    }).join('');

    const script = this.querySelector('script[data-ref="product"]');
    if (script) {
      script.insertAdjacentHTML('afterend', html);
      return;
    }

    this.insertAdjacentHTML('beforeend', html);
  }

  initSelectedValues() {
    this.readSelectedValues();

    if (Object.keys(this.selectedValues).length > 0) {
      return;
    }

    const variants = this.product?.variants ?? [];
    const initial = variants.find(v => v.available) ?? variants[0];
    if (!initial) return;

    OPTION_KEYS.forEach((key, i) => {
      const val = initial[key];
      if (val != null) {
        this.selectedValues[i] = val;
      }
    });
  }

  syncPressedState() {
    this.querySelectorAll<HTMLButtonElement>('.variant-picker__value').forEach((btn) => {
      const index = Number(btn.dataset.optionIndex);
      const value = btn.dataset.optionValue;
      if (Number.isNaN(index) || !value) return;
      btn.setAttribute('aria-pressed', this.selectedValues[index] === value ? 'true' : 'false');
    });
  }

  readSelectedValues() {
    this.querySelectorAll<HTMLButtonElement>('.variant-picker__value[aria-pressed="true"]').forEach((btn) => {
      const index = Number(btn.dataset.optionIndex);
      const value = btn.dataset.optionValue;
      if (!Number.isNaN(index) && value) {
        this.selectedValues[index] = value;
      }
    });
  }

  bindButtons() {
    this.querySelectorAll<HTMLButtonElement>('.variant-picker__value:not([data-bound])').forEach((btn) => {
      btn.setAttribute('data-bound', '');
      btn.addEventListener('click', () => this.handleSelect(btn));
    });
  }

  handleSelect(button: HTMLButtonElement) {
    const optionIndex = Number(button.dataset.optionIndex);
    const value = button.dataset.optionValue;
    if (Number.isNaN(optionIndex) || !value) return;

    this.selectedValues[optionIndex] = value;
    this.syncPressedState();
    this.syncBuyButton();
  }

  getSelectedVariant(): Variant | undefined {
    return (this.product?.variants ?? []).find(v =>
      Object.entries(this.selectedValues).every(([idx, val]) => v[OPTION_KEYS[Number(idx)]] === val),
    );
  }

  syncBuyButton() {
    const variant = this.getSelectedVariant();
    if (!variant) return;

    const buyButton = this.parentElement?.querySelector('buy-button');
    if (buyButton) {
      buyButton.setAttribute('data-id', String(variant.id));
    }
  }
}

customElements.get('variant-picker') || customElements.define('variant-picker', VariantPicker);

export type VariantPickerEl = VariantPicker & HTMLElement;
