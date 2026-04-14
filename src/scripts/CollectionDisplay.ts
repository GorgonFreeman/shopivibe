import { LitElement } from 'lit';
import { customFetch } from './utils';

class CollectionDisplay extends LitElement {
  createRenderRoot() { return this; }

  page;

  connectedCallback() {
    super.connectedCallback();
    
    const pageFromUrl = new URLSearchParams(window.location.search).get('page');
    this.page = Number(pageFromUrl) || 1;

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
    const url = new URL(window.location.href);
    url.searchParams.set('page', this.page);
    history.replaceState(null, '', url);
  };
}

customElements.define('collection-display', CollectionDisplay);
