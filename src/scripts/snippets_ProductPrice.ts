import { html, nothing } from 'lit';
import { LitElement } from 'lit';
import { TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { VariantJSON } from './types/types';
import { formatPrice } from './utils';

class ProductPrice extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Object, attribute: 'data-variant' })
  variant?: VariantJSON;

  async connectedCallback() {
    super.connectedCallback();
  }

  render(): TemplateResult | typeof nothing {

    const currency = window.Shopify.currency.active;
    
    if (!this.variant) {
      return nothing;
    }

    return html`
      ${ this.variant.compare_at_price && this.variant.compare_at_price > this.variant.price
        ? html`
          <s>${ formatPrice(this.variant.compare_at_price) }</s>`
        : nothing
      }
      <span>${ formatPrice(this.variant.price) } ${ currency }</span>`
    };
}

customElements.get('product-price') || customElements.define('product-price', ProductPrice);