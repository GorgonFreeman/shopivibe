import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';

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

    console.log('Not rendered, hydrating');

    if (!this.product) {
      if (!this.handle) {
        console.error('No product or handle provided');
        return;
      }

      // Fetch using handle
    }

    console.log({ product: this.product });

    const {
      title,
      url,
      featured_image: featuredImage,
    } = this.product;

    this.renderRoot.innerHTML = `
      <img src="${ featuredImage }" alt="${ title }">
      <a href="${ url }">${ title }</a>
      <buy-button product="${ this.product }"></buy-button>
    `;
  }
}

customElements.define('product-tile', ProductTile);
