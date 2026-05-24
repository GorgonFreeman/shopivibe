import { LitElement, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

let openModalCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (openModalCount++ > 0) {
    return;
  }
  savedScrollY = window.scrollY;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockBodyScroll() {
  if (openModalCount <= 0 || --openModalCount > 0) {
    return;
  }
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, savedScrollY);
}

class CustomModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  @query('dialog', true)
  dialogEl!: HTMLDialogElement;

  @property({ type: Boolean, attribute: 'data-open', reflect: true })
  open = false;

  @property({ type: Boolean, attribute: 'data-product-sheet' })
  productSheet = false;

  private scrollLocked = false;
  private childObserver?: MutationObserver;

  connectedCallback() {
    super.connectedCallback();
    if (!this.productSheet && this.querySelector('product-modal-content')) {
      this.productSheet = true;
    }
  }

  firstUpdated() {
    this.adoptChildren();

    this.childObserver = new MutationObserver(() => {
      this.adoptChildren();
      if (!this.hasAttribute('data-product-sheet') && this.querySelector('product-modal-content')) {
        this.productSheet = true;
      }
    });

    this.childObserver.observe(this, { childList: true });

    this.dialogEl?.addEventListener('close', () => {
      this.open = false;
      if (this.scrollLocked) {
        unlockBodyScroll();
        this.scrollLocked = false;
      }

      if (this.hasAttribute('data-self-destruct')) {
        this.remove();
      }
    });

    this.dialogEl?.addEventListener('click', (e) => {
      if (e.target === this.dialogEl) {
        this.close();
      }
    });

    if (this.open && !this.dialogEl?.open) {
      this.showModal();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.childObserver?.disconnect();
    if (this.scrollLocked) {
      unlockBodyScroll();
      this.scrollLocked = false;
    }
  }

  updated(changed: Map<string, unknown>) {
    super.updated(changed);
    this.adoptChildren();

    if (!changed.has('open') || !this.dialogEl) {
      return;
    }

    if (this.open !== this.dialogEl.open) {
      this.open ? this.showModal() : this.close();
    }
  }

  adoptChildren() {
    const dialog = this.dialogEl;
    if (!dialog) {
      return;
    }

    for (const child of [...this.childNodes]) {
      if (child !== dialog) {
        dialog.appendChild(child);
      }
    }
  }

  showModal() {
    if (this.productSheet || this.querySelector('product-modal-content')) {
      this.productSheet = true;
      this.dialogEl?.classList.add('product-sheet');
    }

    this.adoptChildren();

    if (!this.dialogEl?.open) {
      lockBodyScroll();
      this.scrollLocked = true;
      this.dialogEl?.showModal();
    }
    this.open = true;
  }

  close() {
    if (this.dialogEl?.open) {
      this.dialogEl.close();
    }
    this.open = false;
  }

  render() {
    return html`
      <dialog class=${classMap({ 'product-sheet': this.productSheet })}></dialog>
    `;
  }
}

customElements.get('custom-modal') || customElements.define('custom-modal', CustomModal);
