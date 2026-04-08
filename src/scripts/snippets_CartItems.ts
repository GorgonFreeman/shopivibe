import { LitElement } from 'lit';

class CartItems extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('cart-item:removed', (e: CustomEvent) => {
      const { height, itemEl } = e.detail;
      let sibling = itemEl.nextElementSibling;
      while (sibling) {
        if (sibling.matches('cart-item')) {
          sibling.classList.remove('_animate_in');
          sibling.style.transform = `translateY(-${ height }px)`;
        }
        sibling = sibling.nextElementSibling;
      }
    });
  }
}

customElements.define('cart-items', CartItems);