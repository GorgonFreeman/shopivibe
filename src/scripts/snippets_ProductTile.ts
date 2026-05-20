import { html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { customFetch } from './utils';

type ProductMediaItem = {
  media_type?: string;
  src?: string;
  alt?: string;
  preview_image?: { src?: string; alt?: string };
};

class ProductTile extends LitElement {
  createRenderRoot() { return this; }

  @property({ type: Boolean, attribute: 'data-rendered' })
  rendered = false;

  @property({ type: Object, attribute: 'data-product' })
  product?: Record<string, unknown>;

  @property({ type: String, attribute: 'data-handle' })
  handle?: string;

  shouldUpdate() {
    console.log('rendered', this.rendered);
    return !this.rendered;
  }

  async render() {

    console.log('render');

    if (!this.product) {
      if (!this.handle) {
        console.error('No product or handle provided');
        return;
      }

      // Fetch using handle
      const productResponse = await customFetch(`/products/${ this.handle }.json`, {
        method: 'get',
      });

      this.product = productResponse?.result?.product;
    }

    if (!this.product) {
      console.error('Unable to fetch product');
      return;
    }

    // console.log({ product: this.product });

    const {
      title,
      url,
      image: featuredImage,
      media,
      variants,
    } = this.product;

    const {
      src: featuredImageSrc,
      alt: featuredImageAlt,
    } = featuredImage || {};

    const mediaList = (Array.isArray(media) ? media : []) as ProductMediaItem[];
    const imageMedia = mediaList.filter((m) => !m?.media_type || m.media_type === 'image');
    const hoverMedia = imageMedia[1];
    const hoverSrc = hoverMedia?.src || hoverMedia?.preview_image?.src;
    const hoverAlt = hoverMedia?.alt || hoverMedia?.preview_image?.alt || '';

    console.log({ variants });
    const selectedOrFirstAvailableVariant = variants.find((v) => v.available) || variants[0];

    return html`
      <div class="_product_tile_media">
        <img src="${ featuredImageSrc }" alt="${ featuredImageAlt }" class="_product_image_skelly" onload="(el => { el.classList.add('_loaded'); })(this)">
        ${ hoverSrc ? html`
          <img
            src="${ hoverSrc }"
            alt="${ hoverAlt }"
            class="_product_image_hover"
            loading="lazy"
            aria-hidden="true"
          >
        ` : nothing }
      </div>
      <a href="${ url }">${ title }</a>
      <buy-button data-id="${ selectedOrFirstAvailableVariant.id }"></buy-button>
    `;
  }
}

customElements.get('product-tile') || customElements.define('product-tile', ProductTile);
