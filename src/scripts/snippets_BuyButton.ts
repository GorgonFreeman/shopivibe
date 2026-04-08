import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customAxios, t } from './utils';

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

    this.anchor.textContent = t('products.adding');

    await customAxios('/cart/add.js', {
      method: 'post',
      body: {
        items: [{ id: parseInt(variantId), quantity: 1 }],
      },
    });

    this.anchor.textContent = t('products.added');
    setTimeout(() => this.anchor.textContent = t('products.add_to_cart'), 1500);
  }
}

customElements.define('buy-button', BuyButton);
