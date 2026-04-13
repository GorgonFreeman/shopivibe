import { LitElement } from 'lit';
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

  firstUpdated() {
    if (this.rendered) {
      console.log('Already rendered');
      return;
    }

    this.hydrate();
  }

  async hydrate() {
    console.log('Not rendered, hydrating');

    if (!this.product) {
      if (!this.handle) {
        console.error('No product or handle provided');
        return;
      }

      // Fetch using handle
      const productResponse = await customFetch(`/products/${ this.handle }.json`, {
        method: 'get',
      });

      console.log({ productResponse });
      this.product = productResponse?.result?.product;
    }

    if (!this.product) {
      console.error('Unable to fetch product');
      return;
    }

    console.log({ product: this.product });

    const {
      title,
      url,
      image: featuredImage,
    } = this.product;

    const {
      src: featuredImageSrc,
      alt: featuredImageAlt,
    } = featuredImage || {};

    this.renderRoot.innerHTML = `
      <img src="${ featuredImageSrc }" alt="${ featuredImageAlt }">
      <a href="${ url }">${ title }</a>
      <buy-button product="${ this.product }"></buy-button>
    `;
  }
}

customElements.define('product-tile', ProductTile);
