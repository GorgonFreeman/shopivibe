import { LitElement } from 'lit';
import { query } from 'lit/decorators.js';
import { customAxios, wait, t } from './utils';

class BuyButton extends LitElement {
  createRenderRoot() { return this; }

  @query('a') anchor;
  revertId = 0;
  busy = false;

  firstUpdated() {
    this.anchor?.addEventListener('click', e => this.addToCartHandler(e));
  }

  async addToCartHandler(e) {
    e.preventDefault();
    if (this.busy) return;
    const variantId = new URL(this.anchor.href).searchParams.get('id');
    if (!variantId) return;

    this.busy = true;
    clearTimeout(this.revertId);
    this.anchor.setAttribute('disabled', '');
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

    this.busy = false;
    this.anchor.removeAttribute('disabled');
    this.anchor.textContent = response.success
      ? t('products.added')
      : t('products.add_to_cart_error');

    this.revertId = setTimeout(() => {
      this.anchor.textContent = t('products.add_to_cart');
    }, 1000);
  }
}

customElements.define('buy-button', BuyButton);
