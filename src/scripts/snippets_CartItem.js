import { LitElement, html } from 'lit';
import { customAxios } from './utils';

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
    const removeResponse = await customAxios(
      `/cart/change.js?id=${ itemId }&quantity=0`,
      {
        method: 'post',
      },
    );
    console.log(removeResponse);
  }
}

customElements.define('cart-item', CartItem);
