import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customFetch } from './utils';
import './CustomSpinner';

class CollectionDisplay extends LitElement {
  createRenderRoot() { return this; }

  @query('[data-ref="loadMoreButton"]') loadMoreButton?: HTMLButtonElement;

  page;
  busy = false;

  private loadMoreObserver?: IntersectionObserver;

  private observeForLoadMore() {
    this.loadMoreObserver?.disconnect();

    const productsEl = this.querySelector('collection-products');
    const tiles = productsEl?.querySelectorAll('product-tile');
    if (!tiles?.length) {
      return;
    }

    const index = tiles.length >= 5 ? tiles.length - 5 : tiles.length - 1;
    const target = tiles[index]!;

    this.loadMoreObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !this.busy) {
        void this.handleLoadMore();
      }
    });
    this.loadMoreObserver.observe(target);
  }

  connectedCallback() {
    super.connectedCallback();
    
    const pageFromUrl = new URLSearchParams(window.location.search).get('page');
    this.page = Number(pageFromUrl) || 1;

    this.loadMoreButton?.addEventListener('click', this.handleLoadMore);
    queueMicrotask(() => this.observeForLoadMore());
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.loadMoreObserver?.disconnect();
    this.loadMoreButton?.removeEventListener('click', this.handleLoadMore);
  }

  handleLoadMore = async () => {
    if (this.busy) {
      return;
    }

    const loadMoreButton = this.loadMoreButton!;
    this.busy = true;
    loadMoreButton.disabled = true;
    const initialHtml = loadMoreButton.innerHTML;
    loadMoreButton.innerHTML = '<custom-spinner></custom-spinner>';

    try {
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

      this.observeForLoadMore();
    } finally {
      this.busy = false;
      loadMoreButton.disabled = false;
      loadMoreButton.innerHTML = initialHtml;
    }
  };
}

customElements.get('collection-display') || customElements.define('collection-display', CollectionDisplay);
