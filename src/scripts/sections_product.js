// Product section script – Lit components, etc.
import { LitElement, html } from 'lit';

class ProductSection extends LitElement {
  static get properties() {
    return {};
  }

  render() {
    return html`<div>Product section</div>`;
  }
}

customElements.define('product-section', ProductSection);
