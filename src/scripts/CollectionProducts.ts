import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';

class CollectionProducts extends LitElement {
  createRenderRoot() { return this; }

  @query('[data-ref="loadMoreButton"]') loadMoreButton;

  connectedCallback() {
    super.connectedCallback();

    this.loadMoreButton?.addEventListener('click', async () => {
      console.log('load more');
    });
  }
}

customElements.define('collection-products', CollectionProducts);
