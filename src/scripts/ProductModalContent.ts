import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { customFetch } from './utils';
import './snippets_BuyButton';

class ProductModalContent extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: Object, attribute: 'data-product' })
  product?: Record<string, unknown>;

  @property({ type: String, attribute: 'data-handle' })
  handle?: string;

  firstUpdated() {
    if (this.rendered) {
      return;
    }

    this.hydrate();
  }

  async hydrate() {

    if (!this.product) {
      if (!this.handle) {
        console.error('productModalContent', 'No product or handle provided');
        return;
      }

      const productResponse = await customFetch(`/products/${ this.handle }.json`, {
        method: 'get',
      });

      this.product = productResponse?.result?.product;
    }

    if (!this.product) {
      console.error('productModalContent', 'Unable to fetch product');
      return;
    }

    const {
      title,
      url,
      featured_image: featuredImageSrc,
      variants,
    } = this.product;

    const variantList = variants as Array<{ available?: boolean; id: string | number }> | undefined;
    const selectedOrFirstAvailableVariant = variantList?.find((v) => v.available) || variantList?.[0];

    if (!selectedOrFirstAvailableVariant?.id) {
      console.error('productModalContent', 'No variant for product');
      return;
    }

    this.innerHTML = `
      <img 
        src="${ featuredImageSrc }" 
        class="_product_image_skelly"
        onload="(el => { el.classList.add('_loaded'); })(this)"
      ">
      <a href="${ url }">${ title }</a>
      <buy-button data-id="${ selectedOrFirstAvailableVariant.id }"></buy-button>
    `;
  }
}

customElements.get('product-modal-content') || customElements.define('product-modal-content', ProductModalContent);
