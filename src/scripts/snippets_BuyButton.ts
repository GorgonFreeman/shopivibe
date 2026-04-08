import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customAxios, wait, t } from './utils';

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

    const [, response] = await Promise.all([
      wait(500),
      customAxios('/cart/add.js', {
        method: 'post',
        body: {
          items: [{ id: parseInt(variantId), quantity: 1 }],
        },
      }),
    ]);

    this.anchor.textContent = response.success
      ? t('products.added')
      : t('products.add_to_cart_error');
  }
}

customElements.define('buy-button', BuyButton);
