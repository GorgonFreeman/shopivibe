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

      
    });
  }
}

customElements.define('collection-products', CollectionProducts);
