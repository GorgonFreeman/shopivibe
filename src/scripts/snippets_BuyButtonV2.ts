import { html, nothing, TemplateResult } from 'lit';
import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { VariantJSON } from './types/types';
import { t } from './utils';

class BuyButtonV2 extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: String, attribute: 'data-id' })
  variantId?: string;

  connectedCallback() {
    super.connectedCallback();
    if (this.rendered) {
      return;
    }

    if (!this.variantId) {
      console.error('No variant ID provided');
      return;
    }
  }

  render() : TemplateResult | typeof nothing {
    return html`
      <a
        data-ref="anchor"
        href="/cart/add?id=${ this.variantId }"
        class="button"
      >
        ${ t('products.add_to_cart') }
      </a>
    `;
  }
}

customElements.get('buy-button-v2') || customElements.define('buy-button-v2', BuyButtonV2);