import { LitElement, html } from 'lit';

class LitExample extends LitElement {
  render() {
    return html`populated`;
  }
}

customElements.get('lit-example') || customElements.define('lit-example', LitExample);
