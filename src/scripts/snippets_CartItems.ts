import { LitElement } from 'lit';

class CartItems extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('cart-item:removed', (e: CustomEvent) => {
      console.log('cart-item:removed', e.detail);
    });
  }
}

customElements.define('cart-items', CartItems);