import { html, nothing } from 'lit';
import { LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { customFetch } from './utils';
import './snippets_BuyButton';
import './snippets_BuyButtonV2';
import './snippets_ProductPrice';
import { ProductJSON, VariantJSON } from './types/types';

class ProductModalContent extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: Object, attribute: 'data-product' })
  product?: ProductJSON;

  @property({ type: String, attribute: 'data-handle' })
  handle?: string;

  firstUpdated() {
    if (this.rendered) {
      return;
    }
  }

  async connectedCallback() {
    super.connectedCallback();
  }

  renderImage (product: ProductJSON) : TemplateResult | typeof nothing {
    return html`
      <img
        src="${ product.featured_image }"
        class="_product_image_skelly"
        onload="(el => { el.classList.add('_loaded'); })(this)">
    `;
  }

  renderTitle (product: ProductJSON) : TemplateResult | typeof nothing {
    return html`
      <a href="${ product.url }">${ product.title }</a>
    `;
  }

  renderProductPrice (variant: VariantJSON) : TemplateResult | typeof nothing {
    return html`
      <product-price .variant=${ variant }></product-price>
    `;
  }

  renderBuyButton (variant: VariantJSON) : TemplateResult | typeof nothing {
    return html`
      <buy-button-v2 data-id="${ variant.id }"></buy-button-v2>
    `;
  }

  render() : TemplateResult | typeof nothing {

    if (!this.product) {
      return nothing;
    }

    const variantList = this.product.variants as Array<{ available?: boolean; id: string | number }> | undefined;
    const selectedOrFirstAvailableVariant = variantList?.find((v) => v.available) || variantList?.[0];

    return html`
      ${ this.renderImage(this.product as ProductJSON) }
      ${ this.renderTitle(this.product as ProductJSON) }
      ${ this.renderProductPrice(selectedOrFirstAvailableVariant as VariantJSON) }
      ${ this.renderBuyButton(selectedOrFirstAvailableVariant as VariantJSON) }
    `;
  }
}

customElements.get('product-modal-content') || customElements.define('product-modal-content', ProductModalContent);
