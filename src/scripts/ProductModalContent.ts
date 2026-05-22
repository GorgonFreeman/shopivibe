import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { customFetch } from './utils';
import type { VariantPickerEl } from './snippets_VariantPicker';
import './snippets_BuyButton';
import './snippets_ProductPrice';
import './snippets_VariantPicker';
import './ProductRecommendations';

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
    const handle = this.handle || (this.product?.handle as string | undefined);

    if (!handle) {
      console.error('productModalContent', 'No product or handle provided');
      return;
    }

    const productResponse = await customFetch(`/products/${ handle }.json`, {
      method: 'get',
    });

    this.product = productResponse?.result?.product;

    if (!this.product) {
      console.error('productModalContent', 'Unable to fetch product');
      return;
    }

    const {
      id: productId,
      title,
      url,
      featured_image: featuredImageSrc,
      variants,
      has_only_default_variant: hasOnlyDefaultVariant,
    } = this.product as {
      id?: string | number;
      title?: string;
      url?: string;
      featured_image?: string;
      variants?: Array<{ available?: boolean; id: string | number }>;
      has_only_default_variant?: boolean;
    };

    const variantList = variants ?? [];
    const selectedOrFirstAvailableVariant = variantList.find((v) => v.available) || variantList[0];

    if (!selectedOrFirstAvailableVariant?.id) {
      console.error('productModalContent', 'No variant for product');
      return;
    }

    const showVariantPicker = hasOnlyDefaultVariant !== true && variantList.length > 0;

    this.innerHTML = `
      <img 
        src="${ featuredImageSrc }" 
        class="_product_image_skelly"
        onload="(el => { el.classList.add('_loaded'); })(this)"
      ">
      <a href="${ url }">${ title }</a>
      <product-price></product-price>
      <div class="product-form">
        <buy-button data-id="${ selectedOrFirstAvailableVariant.id }"></buy-button>
      </div>
      <product-recommendations product-id=${ productId } intent="related" limit="10"></product-recommendations>
    `;

    const priceEl = this.querySelector('product-price') as (HTMLElement & { product?: Record<string, unknown> }) | null;
    if (priceEl) priceEl.product = this.product;

    if (showVariantPicker) {
      const form = this.querySelector('.product-form');
      const buyButton = form?.querySelector('buy-button');
      const picker = document.createElement('variant-picker') as VariantPickerEl;

      picker.setProduct(this.product);
      if (buyButton) {
        form?.insertBefore(picker, buyButton);
      } else {
        form?.prepend(picker);
      }

      picker.setup();
    }
  }
}

customElements.get('product-modal-content') || customElements.define('product-modal-content', ProductModalContent);
