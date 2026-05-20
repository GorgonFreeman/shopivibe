const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const customFetch = async (url, {
  method = 'get',
  headers = {},
  params,
  body,
  responseType = 'json',

  verbose,
  omitRequestId = false,
} = {}) => {

  if (!omitRequestId && !headers['x-request-id']) {
    headers['x-request-id'] = String(Date.now());
  }

  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (params) {
    const search = new URLSearchParams(params);
    url += (url.includes('?') ? '&' : '?') + search.toString();
  }

  let cooldown = 3000;
  let retryAttempt = 0;
  const maxRetries = 5;
  const retryStatuses = new Set([408, 429, 500, 502, 503, 504]);

  while (true) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        ...body ? { body: JSON.stringify(body) } : {},
      });

      if (response.ok) {
        return {
          success: true,
          result: await response[responseType](),
        };
      }

      const { status } = response;
      const data = await response[responseType]().catch(() => null);
      verbose && console.error(status, data);

      if (retryStatuses.has(status)) {
        if (retryAttempt >= maxRetries) {
          console.log('Ran out of retries');
          return { success: false, error: [{ status, data }] };
        }

        retryAttempt++;
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : cooldown;
        verbose && console.log(`Retry attempt #${ retryAttempt }, waiting ${ waitTime }`);
        await wait(waitTime);
        cooldown += cooldown;
        continue;
      }

      return { success: false, error: [{ status, data }] };

    } catch (error) {
      verbose && console.error(error);
      return { success: false, error: [error] };
    }
  }
};

const t = (path: string) =>
  path.split('.').reduce((obj, key) => obj?.[key], window.shopivibe?.translations) ?? path;

/** Format an integer-cents amount (as returned by Shopify's JSON endpoints)
 *  using the shop's currency and active locale exposed via js_settings.liquid. */
const formatMoney = (cents: number | string | null | undefined): string => {
  if (cents == null || cents === '') {
    return '';
  }
  const numeric = typeof cents === 'string' ? parseFloat(cents) : Number(cents);
  if (Number.isNaN(numeric)) {
    return '';
  }
  const shop = window.shopivibe?.settings?.shop || {};
  const currency = shop.currency || 'USD';
  const locale = shop.locale || 'en';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(numeric / 100);
  } catch {
    return `${ (numeric / 100).toFixed(2) } ${ currency }`;
  }
};

/** Same as Liquid `| escape` (HTML-safe for attributes and text). */
const liquidEscape = (value: unknown) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export {
  wait,
  customFetch,
  t,
  formatMoney,
  liquidEscape,
};
