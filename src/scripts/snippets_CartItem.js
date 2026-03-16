import { LitElement, html } from 'lit';
import { customAxios, wait } from './utils';

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

    // Start removing visually
    itemEl.classList.remove('_animate_in');
    itemEl.classList.add('_animate_out');

    // Use Promise.all to ensure this takes as long as the animation
    const [, removeResponse] = await Promise.all([
      wait(200),
      this.removeItem(itemId),
    ]);
    console.log({ removeResponse });

    if (removeResponse.success) {
      // If it worked, actually remove the element from the DOM
      itemEl.remove();
    } else {
      // Otherwise, restore the element visually
      itemEl.classList.remove('_animate_out');
      console.error(removeResponse.error);
    }

    // TODO: Inspect the cart to determine if there are any removed or new items
    // TODO: Consider decentralised cart assessment system - don't remove or add items until this assessor makes a decision?
  }

  async removeItem(itemId) {
    return customAxios(
      `/cart/change.js?id=${ itemId }&quantity=0`,
      {
        method: 'post',
      },
    );
  }
}

customElements.define('cart-item', CartItem);
