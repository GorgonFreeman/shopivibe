import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customFetch, wait } from './utils';

class CartItem extends LitElement {
  createRenderRoot() { return this; }

  @query('[data-ref="remove"]') removeButton;

  connectedCallback() {
    super.connectedCallback();
    this.removeButton?.addEventListener('click', e => this.removeItemHandler(e));
  }

  async removeItemHandler(e) {
    e.preventDefault();
    const itemId = new URL(e.target.href).searchParams.get('id');
    const itemEl = e.target.closest('cart-item');

    // Start removing visually
    itemEl.classList.remove('_animate_in');
    itemEl.classList.add('_animate_out');

    const { height } = itemEl.getBoundingClientRect();
    itemEl.dispatchEvent(new CustomEvent('cart-item:removed', {
      bubbles: true,
      detail: { height, itemEl },
    }));

    // Use Promise.all to ensure this takes as long as the animation
    const [, removeResponse] = await Promise.all([
      wait(200),
      this.removeItem(itemId),
    ]);
    console.log({ removeResponse });

    let sibling = itemEl.nextElementSibling;
    while (sibling) {
      if (sibling.matches('cart-item')) {
        sibling.style.transition = 'none';
        const current = parseFloat(sibling.style.getPropertyValue('--offset')) || 0;
        sibling.style.setProperty('--offset', `${ current + height }px`);
        sibling.style.removeProperty('transition');
      }
      sibling = sibling.nextElementSibling;
    }

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
    return customFetch(
      `/cart/change.js?id=${ itemId }&quantity=0`,
      {
        method: 'post',
      },
    );
  }
}

customElements.define('cart-item', CartItem);
