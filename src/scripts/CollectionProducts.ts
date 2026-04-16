import { LitElement } from 'lit';
import './snippets_CustomModal';
import './ProductModalContent';

type CustomModalEl = HTMLElement & LitElement;

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

  handleTileClick = async (event: MouseEvent) => {
    const target = event.target as Element;

    if (target.closest('buy-button')) {
      return;
    }

    const parentTile = target.closest('product-tile');

    if (!parentTile || !this.contains(parentTile)) {
      return;
    }

    event.preventDefault();

    const productJson = parentTile.getAttribute('data-product');
    const handle = parentTile.getAttribute('data-handle');

    if (!productJson && !handle) {
      console.error('collectionProducts', 'product-tile missing data-product and data-handle');
      return;
    }

    const modal = document.createElement('custom-modal') as CustomModalEl;

    modal.setAttribute('data-self-destruct', '');
    modal.setAttribute('data-open', '');

    const modalContent = document.createElement('product-modal-content');

    if (productJson) {
      modalContent.setAttribute('data-product', productJson);
    } else if (handle) {
      modalContent.setAttribute('data-handle', handle);
    }

    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    await modal.updateComplete;
  };
}

customElements.get('collection-products') || customElements.define('collection-products', CollectionProducts);
