import { LitElement, html } from 'lit';
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
  @query('dialog', true)
  dialogEl!: HTMLDialogElement;

  @property({ type: Boolean, attribute: 'data-open', reflect: true })
  open = false;

  @state()
  private productSheet = false;

  private scrollLocked = false;

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
    if (this.scrollLocked) {
      unlockBodyScroll();
      this.scrollLocked = false;
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
      <dialog
        class=${classMap({
          'm-0 box-border border-0 p-4': true,
          'm-auto max-h-[min(92dvh,52rem)] w-[min(98vw,48rem)] max-w-[98vw] overflow-y-auto overscroll-contain rounded-lg shadow-[0_12px_40px_rgb(0_0_0/0.18)] backdrop:bg-black/35':
            this.productSheet,
        })}
      >
        <slot></slot>
      </dialog>
    `;
  }
}

customElements.get('custom-modal') || customElements.define('custom-modal', CustomModal);
