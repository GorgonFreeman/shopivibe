import { LitElement } from 'lit';
import './snippets_CustomModal';

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

    console.log('handleTileClick', target);
    const parentTile = target.closest('product-tile');

    if (!parentTile || !this.contains(parentTile)) {
      return;
    }

    event.preventDefault();

    const modal = document.createElement('custom-modal') as CustomModalEl;

    modal.setAttribute('data-self-destruct', '');
    modal.setAttribute('data-open', '');
    modal.textContent = 'banana split';

    document.body.appendChild(modal);
    await modal.updateComplete;
  };
}

customElements.get('collection-products') || customElements.define('collection-products', CollectionProducts);
