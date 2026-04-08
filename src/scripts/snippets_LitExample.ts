import { LitElement, html } from 'lit';

class LitExample extends LitElement {
  render() {
    return html`populated`;
  }
}

customElements.define('lit-example', LitExample);
