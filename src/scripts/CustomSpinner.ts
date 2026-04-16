class CustomSpinner extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = 'spinner';
  }
}

customElements.define('custom-spinner', CustomSpinner);
