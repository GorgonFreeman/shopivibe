import { t } from './utils';
import { LitElement, html, nothing, PropertyValues } from 'lit';
import { map } from 'lit/directives/map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { property, state } from 'lit/decorators.js';
import type { ProductJSON } from './types/types';
import './snippets_ProductTile';
import './snippets_BuyButton';
type RecommendationsIntent = 'related' | 'complementary';

function parseRecommendationsFromResponse(text: string): Element | null {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const fromDoc = doc.querySelector('.product-recommendations');
  if (fromDoc) {
    return fromDoc;
  }
  const wrap = doc.querySelector('[id^="shopify-section-"]');
  const nested = wrap?.querySelector('.product-recommendations');
  if (nested) {
    return nested;
  }
  const fallback = document.createElement('div');
  fallback.innerHTML = text;
  return fallback.querySelector('.product-recommendations');
}

function bindRecommendationsCarousel(container: Element) {
  if (container.hasAttribute('data-carousel-nav-bound')) {
    return;
  }

  const track = container.querySelector<HTMLElement>('[data-carousel-track]');
  const prevBtn = container.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const nextBtn = container.querySelector<HTMLButtonElement>('[data-carousel-next]');
  if (!track || !prevBtn || !nextBtn) {
    return;
  }

  container.setAttribute('data-carousel-nav-bound', '');

  const step = () => Math.max(200, Math.floor(track.clientWidth * 0.85));

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
}

class ProductRecommendations extends LitElement {

  @property({ type: String, attribute: 'product-id' })
  productId?: string;

  @state()
  url?: string;

  @property({ type: Boolean, attribute: 'recommendations-init' })
  recommendationsInit = false;

  @property({ type: Number, attribute: 'limit' })
  limit = 10;

  @property({ type: String, attribute: 'intent' })
  intent: RecommendationsIntent = 'related';

  @state()
  recommendations?: ProductJSON[];

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();

    if (!this.productId) {
      return;
    }
    this.url = `${ window?.Shopify?.routes?.root }recommendations/products.json?product_id=${ this.productId }&limit=${ this.limit }&intent=${ this.intent }`;

    if (this.querySelector('[data-carousel-track]')) {
      bindRecommendationsCarousel(this);
    }

    try {
      const response = await fetch(this.url);
      const data = await response.json();
      console.log(data);
      this.recommendations = data.products as ProductJSON[];
    } catch (error) {
      console.error('productRecommendations', error);
    }

  }

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('recommendations') && this.recommendations) {
      bindRecommendationsCarousel(this);
    }
  }

  render() {
    if (!this.recommendations || this.recommendations.length === 0) {
      return nothing;
    }
    return html`
      ${ this.intent == 'complementary' ? html`
        <h2 class="recommendations-section__heading" id="recommendations-heading-${ this.id }">
          ${ t('sections.recommendations.heading_complementary') }
        </h2>
      ` : html`
        <h2 class="recommendations-section__heading" id="recommendations-heading-${ this.id }">
          ${ t('sections.recommendations.heading_related') }
        </h2>
      ` }
      <div
        class="recommendations-carousel"
        data-carousel
      >
        <div
          class="recommendations-carousel__track"
          data-carousel-track
          role="list"
        >
          ${ map(this.recommendations, (product: ProductJSON) => {
            if (!product) {
              return nothing;
            }
            const mediaList = Array.isArray(product.media) ? product.media : [];
            const imageMedia = mediaList.filter(
              (m: { media_type?: string }) => !m?.media_type || m.media_type === 'image',
            );
            const hoverMedia = imageMedia[1] as
              | { src?: string; alt?: string; preview_image?: { src?: string; alt?: string } }
              | undefined;
            const hoverSrc = hoverMedia?.src ?? hoverMedia?.preview_image?.src;
            const hoverAlt = hoverMedia?.alt ?? hoverMedia?.preview_image?.alt ?? '';
            return html`
              <div class="recommendations-carousel__slide" role="listitem">
                <product-tile
                  data-rendered
                  .data-product=${ product }
                  data-handle=${ product.handle }
                >
                  ${ product.featured_image ? html`
                    <div class="_product_tile_media">
                      <img
                        src="${ product.featured_image }"
                        width="300"
                        alt="${ product.media[0].alt ?? '' }"
                        class="_product_image_skelly"
                        onload="(el => { el.classList.add('_loaded'); })(this)"
                      >
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
                  ` : nothing }
                  <a href="${ product.url }">
                    ${ product.title }
                  </a>
                  <buy-button data-id="${ product.variants[0].id ?? '' }"></buy-button>
                </product-tile>
              </div>
            `;
          }) }
        </div>

        <div class="recommendations-carousel__nav">
          <button
            type="button"
            class="recommendations-carousel__btn"
            aria-label="${ t('sections.recommendations.previous') }"
            data-carousel-prev
          >
            ‹
          </button>
          <button
            type="button"
            class="recommendations-carousel__btn"
            aria-label="${ t('sections.recommendations.next') }"
            data-carousel-next
          >
            ›
          </button>
        </div>
      </div>
    `;
  }
}

customElements.get('product-recommendations') ||
  customElements.define('product-recommendations', ProductRecommendations);
