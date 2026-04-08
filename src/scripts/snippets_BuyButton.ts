import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customAxios } from './utils';

class BuyButton extends LitElement {
  createRenderRoot() { return this; }

  @query('a') anchor;

  firstUpdated() {
    this.anchor?.addEventListener('click', e => this.addToCartHandler(e));
  }

  async addToCartHandler(e) {
    e.preventDefault();
    const variantId = new URL(this.anchor.href).searchParams.get('id');
    if (!variantId) return;

    await customAxios('/cart/add.js', {
      method: 'post',
      body: {
        items: [{ id: parseInt(variantId), quantity: 1 }],
      },
    });
  }
}

customElements.define('buy-button', BuyButton);
