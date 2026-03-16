import { LitElement, html } from 'lit';

class CartItem extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    // Listeners
    const removeButton = this.querySelector('a');
    removeButton.addEventListener('click', e => this.removeItem(e));
  }

  async removeItem(e) {
    e.preventDefault();
    const itemId = e.target.href.split('=')[1];
    const fetchResponse = await fetch(
      `/cart/change?id=${ itemId }&quantity=0`, 
      {
        method: 'POST',
      },
    );
    console.log(fetchResponse);
  }
}

customElements.define('cart-item', CartItem);
