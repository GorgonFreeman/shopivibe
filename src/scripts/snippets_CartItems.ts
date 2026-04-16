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
          const current = parseFloat(sibling.style.getPropertyValue('--offset')) || 0;
          sibling.style.setProperty('--offset', `${ current - height }px`);
        }
        sibling = sibling.nextElementSibling;
      }
    });
  }
}

customElements.get('cart-items') || customElements.define('cart-items', CartItems);