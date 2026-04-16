import { LitElement } from 'lit';

class CollectionProducts extends LitElement {
  createRenderRoot() { return this; }
}

customElements.get('collection-products') || customElements.define('collection-products', CollectionProducts);
