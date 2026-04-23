import { LitElement } from 'lit';

class CartItems extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('cart-item:removed', (e) => {
      const itemEl = e.target;
      if (!(itemEl instanceof HTMLElement) || !itemEl.matches('cart-item')) {
        return;
      }
      let node = itemEl.nextElementSibling;
      while (node) {
        if (node.matches('cart-item')) {
          const nextCart = node;
          nextCart.classList.remove('_animate_in');
          nextCart.classList.add('_shift_up_pretend');
          nextCart.addEventListener('animationend', (ev) => {
            if (ev.animationName !== 'shift_up_pretend' || ev.target !== nextCart) {
              return;
            }
            nextCart.classList.remove('_shift_up_pretend');
          }, { once: true, });
        }
        node = node.nextElementSibling;
      }
    });
  }
}

customElements.get('cart-items') || customElements.define('cart-items', CartItems);