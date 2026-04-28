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
    console.log('rendered', this.rendered);
    return !this.rendered;
  }

  async render() {

    console.log('render');

    if (!this.product) {
      if (!this.handle) {
        console.error('No product or handle provided');
        return;
      }

      // Fetch using handle
      const productResponse = await customFetch(`/products/${ this.handle }.json`, {
        method: 'get',
      });

      this.product = productResponse?.result?.product;
    }

    if (!this.product) {
      console.error('Unable to fetch product');
      return;
    }

    // console.log({ product: this.product });

    const {
      title,
      url,
      image: featuredImage,
      variants,
    } = this.product;

    const {
      src: featuredImageSrc,
      alt: featuredImageAlt,
    } = featuredImage || {};
    
    console.log({ variants });
    const selectedOrFirstAvailableVariant = variants.find((v) => v.available) || variants[0];

    return html`
      <img src="${ featuredImageSrc }" alt="${ featuredImageAlt }" class="_product_image_skelly" onload="(el => { el.classList.add('_loaded'); })(this)">
      <a href="${ url }">${ title }</a>
      <buy-button data-id="${ selectedOrFirstAvailableVariant.id }"></buy-button>
    `;
  }
}

customElements.get('product-tile') || customElements.define('product-tile', ProductTile);
