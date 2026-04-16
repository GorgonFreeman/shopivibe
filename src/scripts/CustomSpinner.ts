class CustomSpinner extends HTMLElement {
  constructor() {
    super();
  }
}

customElements.get('custom-spinner') || customElements.define('custom-spinner', CustomSpinner);
