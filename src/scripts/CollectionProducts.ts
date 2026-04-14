import { LitElement } from 'lit';

class CollectionProducts extends LitElement {
  createRenderRoot() { return this; }
}

customElements.define('collection-products', CollectionProducts);
