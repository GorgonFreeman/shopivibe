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
  variants?: Variant[];
};

const OPTION_KEYS = ['option1', 'option2', 'option3'] as const;

class VariantPicker extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  private product?: ProductLike;
  private selectedValues: Record<number, string> = {};
  private initialized = false;

  // Server-rendered markup lives in light DOM — skip Lit re-renders that would wipe it.
  shouldUpdate() {
    return false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.initialized) return;
    this.initialized = true;

    this.loadProductData();
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
    this.querySelectorAll<HTMLButtonElement>('.variant-picker__value').forEach((btn) => {
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
