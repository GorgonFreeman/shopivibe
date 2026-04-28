import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { customFetch } from './utils';

class ProductTile extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: Object, attribute: 'data-product' })
  product?: Record<string, unknown>;

  @property({ type: String, attribute: 'data-handle' })
  handle?: string;

  shouldUpdate() {
    return !this.rendered;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.rendered && !this.product && this.handle) {
      void this.loadProduct();
    }
  }

  private async loadProduct() {
    const productResponse = await customFetch(`/products/${ this.handle }.json`, {
      method: 'get',
    });
    this.product = productResponse?.result?.product;
    if (!this.product) {
      console.error('Unable to fetch product');
      return;
    }
    this.requestUpdate();
  }

  render() {
    if (!this.product) {
      if (!this.rendered && !this.handle) {
        console.error('No product or handle provided');
      }
      return html``;
    }

    const {
      title,
      url,
      image: featuredImage,
      variants,
    } = this.product;

    const fi = featuredImage as { src?: string; alt?: string } | undefined;
    const featuredImageSrc = fi?.src;
    const featuredImageAlt = fi?.alt;

    const variantList = variants as { available?: boolean; id?: unknown }[] | undefined;
    const selectedOrFirstAvailableVariant = variantList?.find((v) => v.available) || variantList?.[0];

    return html`
      <img src="${ featuredImageSrc }" alt="${ featuredImageAlt }" class="_product_image_skelly" onload="(el => { el.classList.add('_loaded'); })(this)">
      <a href="${ url }">${ title }</a>
      <buy-button data-id="${ selectedOrFirstAvailableVariant.id }"></buy-button>
    `;
  }
}

customElements.get('product-tile') || customElements.define('product-tile', ProductTile);
