import { LitElement } from 'lit';
import { property, query } from 'lit/decorators.js';
import { customFetch, wait, t } from './utils';

class BuyButton extends LitElement {
  createRenderRoot() { return this; }

  @query('[data-ref="anchor"]') anchor;

  revertId = 0;
  busy = false;

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: String, attribute: 'data-id' })
  variantId?: string;

  firstUpdated() {
    this.hydrate();
    this.anchor?.addEventListener('click', e => this.addToCartHandler(e));
  }

  hydrate() {
    if (this.rendered) {
      return;
    }

    if (!this.variantId) {
      console.error('No variant ID provided');
      return;
    }

    this.innerHTML = `<a data-ref="anchor" href="/cart/add?id=${ this.variantId }">${ t('products.add_to_cart') }</a>`;
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
      customFetch('/cart/add.js', {
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
    }, 3000);
  }
}

customElements.get('buy-button') || customElements.define('buy-button', BuyButton);
