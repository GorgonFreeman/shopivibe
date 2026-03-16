import { LitElement, html } from 'lit';
import { customAxios } from './utils';

class CartItem extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    // Listeners
    const removeButton = this.querySelector('a');
    removeButton.addEventListener('click', e => this.removeItemHandler(e));
  }

  async removeItemHandler(e) {
    e.preventDefault();
    const itemId = e.target.href.split('=')[1];
    const itemEl = e.target.closest('cart-item');
    itemEl.classList.remove('_animate_in');
    itemEl.classList.add('_animate_out');
    const removeResponse = await this.removeItem(itemId);
    console.log({ removeResponse });

    if (removeResponse.success) {
      itemEl.remove();
    } else {
      itemEl.classList.remove('_animate_out');
      console.error(removeResponse.error);
    }

    // TODO: Inspect the cart to determine if there are any removed or new items
    // TODO: Consider decentralised cart assessment system - don't remove or add items until this assessor makes a decision?
  }

  async removeItem(itemId) {
    return customAxios(
      `/cart/change.js?idx=${ itemId }&quantity=0`,
      {
        method: 'post',
      },
    );
  }
}

customElements.define('cart-item', CartItem);
