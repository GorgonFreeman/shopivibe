import { LitElement } from 'lit';

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
  const track = container.querySelector<HTMLElement>('[data-carousel-track]');
  const prevBtn = container.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const nextBtn = container.querySelector<HTMLButtonElement>('[data-carousel-next]');
  if (!track || !prevBtn || !nextBtn) {
    return;
  }

  const step = () => Math.max(200, Math.floor(track.clientWidth * 0.85));

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
}

class ProductRecommendations extends LitElement {
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.dataset.recommendationsInit === 'true') {
      return;
    }

    const url = this.getAttribute('data-url');
    if (!url) {
      return;
    }

    this.dataset.recommendationsInit = 'true';

    if (this.querySelector('[data-carousel-track]')) {
      bindRecommendationsCarousel(this);
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }
        obs.disconnect();

        fetch(url)
          .then((response) => response.text())
          .then((text) => {
            const fragment = parseRecommendationsFromResponse(text);
            if (fragment?.innerHTML.trim()) {
              this.innerHTML = fragment.innerHTML;
              requestAnimationFrame(() => {
                requestAnimationFrame(() => bindRecommendationsCarousel(this));
              });
            } else {
              this.innerHTML = '';
            }
          })
          .catch((error) => {
            console.error('productRecommendations', error);
          });
      },
      { rootMargin: '0px 0px 200px 0px' },
    );

    observer.observe(this);
  }
}

customElements.get('product-recommendations') ||
  customElements.define('product-recommendations', ProductRecommendations);
