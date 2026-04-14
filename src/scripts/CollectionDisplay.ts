import { LitElement } from 'lit';
import { customFetch } from './utils';

class CollectionDisplay extends LitElement {
  createRenderRoot() { return this; }

  // TODO: Get page from url params and update it ongoing
  page = 1;

  connectedCallback() {
    super.connectedCallback();

    const loadMoreButton = this.querySelector('[data-ref="loadMoreButton"]');
    loadMoreButton?.addEventListener('click', this.handleLoadMore);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    const loadMoreButton = this.querySelector('[data-ref="loadMoreButton"]');
    loadMoreButton?.removeEventListener('click', this.handleLoadMore);
  }

  handleLoadMore = async () => {

    const nextPageResponse = await customFetch(window.location.href, {
      method: 'get',
      responseType: 'text',
      params: {
        page: this.page + 1,
        view: 'nolayout.products_html',
      },
    });

    console.log('nextPageResponse', nextPageResponse);

    const html = nextPageResponse?.result;

    if (typeof html !== 'string' || !html.trim()) {
      return;
    }

    const productsEl = this.querySelector('collection-products');
    const lastProductTile = productsEl?.querySelector('product-tile:last-of-type');
    lastProductTile?.insertAdjacentHTML('afterend', html);

    this.page++;
  };
}

customElements.define('collection-display', CollectionDisplay);
