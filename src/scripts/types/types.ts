export interface Shopify {
  shop: string;
  routes: {
    root: string;
  };
}

export type ProductJSON = {
  available: boolean;
  compare_at_price: number;
  compare_at_price_max: number;
  compare_at_price_min: number;
  compare_at_price_varies: boolean;
  content: string;
  created_at: string;
  description: string;
  featured_image: string;
  handle: string;
  id: number;
  images: string[];
  media: ProductMediaJSON[];
  options: string[];
  price: number;
  price_max: number;
  price_min: number;
  price_varies: boolean;
  published_at: string;
  requires_selling_plan: boolean;
  selling_plan_groups: string[];
  tags: string[];
  title: string;
  type: string;
  url: string;
  variants: VariantJSON[];
  vendor: string;
  has_only_default_variant: boolean;
};

export interface VariantJSON {
  id: number;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  sku: string;
  requires_shipping: boolean;
  taxable: boolean;
  featured_image: null | ProductImage;
  available: boolean;
  name: string;
  public_title: string;
  options: string[];
  price: number;
  weight: number;
  compare_at_price: number;
  inventory_management: string;
  barcode: string;
  quantity_rule: QuantityRule;
}

export interface QuantityRule {
  min: number;
  max: null;
  increment: number;
}

export type ProductImage = {
  alt: string | null;
  created_at: string;
  height: number;
  id: number;
  position: number;
  product_id: number;
  src: string;
  updated_at: string;
  variant_ids: number[];
  width: number;
};

export type ProductMediaJSON = {
  alt: string | null;
  id: number;
  position: number;
  preview_image: {
    aspect_ratio: number;
    height: number;
    width: number;
    src: string;
  };
  aspect_ratio: number;
  height: number;
  media_type: 'image' | 'model' | 'video' | 'external_video';
  src: string;
  width: number;
  host?: 'youtube' | 'vimeo';
  external_id?: string;
  sources?: {
    format: string;
    height: number;
    mime_type: string;
    url: string;
    width: number;
  }[];
};