import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { t, formatMoney } from './utils';

class ProductPrice extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: Object, attribute: 'data-product' })
  product?: Record<string, unknown>;

  firstUpdated() {
    this.hydrate();
  }

  hydrate() {
    if (this.rendered) {
      return;
    }

    if (!this.product) {
      console.error('No product provided');
      return;
    }

    const { price, compare_at_price: compareAtPrice, variants } = this.product as {
      price?: number | string;
      compare_at_price?: number | string | null;
      variants?: Array<{ price?: number | string }>;
    };

    const variantPrices = (variants ?? [])
      .map(v => Number(v?.price))
      .filter(n => !Number.isNaN(n));
    const priceVaries = variantPrices.length > 1
      && Math.min(...variantPrices) !== Math.max(...variantPrices);
    const onSale = compareAtPrice != null && Number(compareAtPrice) > Number(price);

    this.innerHTML = `
      ${ priceVaries ? `<span class="_product_price__from">${ t('products.price_from') }</span>` : '' }
      ${ onSale ? `<s class="_product_price__compare">${ formatMoney(compareAtPrice) }</s>` : '' }
      <span class="_product_price__current">${ formatMoney(price) }</span>
    `;
  }
}

customElements.get('product-price') || customElements.define('product-price', ProductPrice);
