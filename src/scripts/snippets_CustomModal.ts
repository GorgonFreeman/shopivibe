import { LitElement, html } from 'lit';
import { property, query } from 'lit/decorators.js';

class CustomModal extends LitElement {
  @query('dialog', true)
  dialogEl!: HTMLDialogElement;

  @property({ type: Boolean, reflect: true })
  open = false;

  firstUpdated() {

    this.dialogEl?.addEventListener('close', () => {
      this.open = false;
    });

    this.dialogEl?.addEventListener('click', e => {
      if (e.target === this.dialogEl) {
        this.close();
      }
    });

    if (this.open && !this.dialogEl?.open) {
      this.dialogEl?.showModal();
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
    this.dialogEl?.showModal();
    this.open = true;
  }

  close() {
    this.dialogEl?.close();
    this.open = false;
  }

  render() {
    return html`
      <dialog>
        <slot></slot>
      </dialog>
    `;
  }
}

customElements.define('custom-modal', CustomModal);
