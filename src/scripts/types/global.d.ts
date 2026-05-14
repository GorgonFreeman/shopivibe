import type { Shopify } from './types';

declare global {
  interface Window {
    Shopify?: Shopify;
  }
}