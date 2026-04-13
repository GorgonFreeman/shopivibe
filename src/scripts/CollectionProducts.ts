import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customFetch } from './utils';

class CollectionProducts extends LitElement {
  createRenderRoot() { return this; }
 
  // TODO: Get page from url params and update it ongoing
  page = 1;

  @query('[data-ref="loadMoreButton"]') loadMoreButton;

  connectedCallback() {
    super.connectedCallback();

    this.loadMoreButton?.addEventListener('click', async () => {
      console.log('load more');

      const nextPageResponse = await customFetch(window.location.href, {
        method: 'get',
        params: {
          page: this.page + 1,
          view: 'nolayout.products_json',
        },
      });

      console.log({ nextPageResponse });

      const nextPageProducts = nextPageResponse?.result;
      
      const html = nextPageProducts.map(product => `<product-tile data-product="${ JSON.stringify(product) }"></product-tile>`).join('');
      const lastProductTile = this.renderRoot.querySelector('product-tile:last-of-type');
      lastProductTile?.insertAdjacentHTML('afterend', html);

      this.page++;
    });
  }
}

customElements.define('collection-products', CollectionProducts);
