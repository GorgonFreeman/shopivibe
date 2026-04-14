import { LitElement } from 'lit';
import { customFetch, liquidEscape } from './utils';

const collectionProductToExpectedShape = (product) => {

  const {
    media,
  } = product;

  const image = media.find((m) => m.media_type === 'image');

  return {
    ...product,
    image,
  };
};

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
      params: {
        page: this.page + 1,
        view: 'nolayout.products_json',
      },
    });

    console.log('nextPageResponse', nextPageResponse);

    const nextPageProducts = nextPageResponse?.result;

    const html = nextPageProducts
      .map((product) => {
        const productJson = JSON.stringify(collectionProductToExpectedShape(product));
        return `<product-tile data-product="${ liquidEscape(productJson) }"></product-tile>`;
      })
      .join('');

    const productsEl = this.querySelector('collection-products');
    const lastProductTile = productsEl?.querySelector('product-tile:last-of-type');
    lastProductTile?.insertAdjacentHTML('afterend', html);

    this.page++;
  };
}

customElements.define('collection-display', CollectionDisplay);
