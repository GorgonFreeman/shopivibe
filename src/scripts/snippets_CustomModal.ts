import { LitElement, html, css, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
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
  static styles = css`
    dialog {
      position: relative;
      margin: 0;
      border: none;
      padding: 1rem;
      box-sizing: border-box;
    }

    dialog.dialog--product-sheet {
      width: 100vw;
      max-width: 100vw;
      min-height: 100dvh;
      max-height: 100dvh;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .dialog__close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 1;
      margin: 0;
    }

    .dialog__close button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.5rem;
      min-height: 2.5rem;
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.375rem;
      background: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #222;
    }

    .dialog__close button:focus-visible {
      outline: 2px solid #222;
      outline-offset: 2px;
    }
  `;

  @query('dialog', true)
  dialogEl!: HTMLDialogElement;

  @property({ type: Boolean, attribute: 'data-open', reflect: true })
  open = false;

  @state()
  private productSheet = false;

  connectedCallback() {
    super.connectedCallback();
    this.syncProductSheetFlag();
  }

  private syncProductSheetFlag() {
    const next = Boolean(this.querySelector('product-modal-content'));
    if (next !== this.productSheet) {
      this.productSheet = next;
    }
  }

  firstUpdated() {
    this.shadowRoot?.querySelector('slot')?.addEventListener('slotchange', () => {
      this.syncProductSheetFlag();
    });

    this.dialogEl?.addEventListener('close', () => {
      this.open = false;
      unlockBodyScroll();

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
    if (this.dialogEl?.open) {
      unlockBodyScroll();
    }
  }

  updated(changed: Map<string, unknown>) {
    super.updated(changed);

    if (!changed.has('open') || !this.dialogEl) {
      return;
    }

    if (this.open !== this.dialogEl.open) {
      this.open ? this.showModal() : this.close();
    }
  }

  showModal() {
    if (!this.dialogEl?.open) {
      lockBodyScroll();
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
      <dialog class=${classMap({ 'dialog--product-sheet': this.productSheet })}>
        ${this.productSheet
          ? html`
              <form method="dialog" class="dialog__close">
                <button type="submit" aria-label="Close">×</button>
              </form>
            `
          : nothing}
        <slot></slot>
      </dialog>
    `;
  }
}

customElements.get('custom-modal') || customElements.define('custom-modal', CustomModal);
