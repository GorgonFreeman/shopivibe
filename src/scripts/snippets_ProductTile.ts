import { LitElement } from 'lit';

class ProductTile extends LitElement {
  createRenderRoot() { return this; }
}

customElements.define('product-tile', ProductTile);
