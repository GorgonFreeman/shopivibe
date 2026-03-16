import { LitElement, html } from 'lit';

class CartItem extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    // Listeners
  }
}

customElements.define('cart-item', CartItem);
