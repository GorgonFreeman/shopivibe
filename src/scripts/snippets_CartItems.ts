import { LitElement } from 'lit';

class CartItems extends LitElement {
  createRenderRoot() { return this; }
}

customElements.define('cart-items', CartItems);