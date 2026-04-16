import { LitElement } from 'lit';
import './snippets_CustomModal';

class CollectionProducts extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleTileClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleTileClick);
  }

  handleTileClick = (event: MouseEvent) => {
    const target = event.target as Element;

    if (target.closest('buy-button')) {
      return;
    }

    console.log('handleTileClick', target);
    const parentTile = target.closest('product-tile');

    if (!parentTile || !this.contains(parentTile)) {
      return;
    }

    event.preventDefault();
    // Open a modal with the product display inside
    return;
  };
}

customElements.get('collection-products') || customElements.define('collection-products', CollectionProducts);
