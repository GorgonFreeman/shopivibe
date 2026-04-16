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

    console.log('handleTileClick', target);
    event.preventDefault();
    return;
  };
}

customElements.get('collection-products') || customElements.define('collection-products', CollectionProducts);
