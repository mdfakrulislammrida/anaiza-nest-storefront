export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string;
  is_new: boolean;
  is_active: boolean;
  category: Category;
  images: ProductImage[];
  variants?: ProductVariant[];
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ProductListResponse {
  data: Product[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

export interface ProductListParams {
  category?: string;
  search?: string;
  is_new?: boolean;
  page?: number;
  per_page?: number;
}

export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  variant_id?: number | null;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_postal_code: string;
  payment_method: PaymentMethod;
  shipping_zone_id: number;
  gift_note?: string | null;
  items: OrderItemPayload[];
}

export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  variant_name: string | null;
  variant_value: string | null;
}

export interface OrderShippingZone {
  id: number;
  name: string;
  estimated_days: string | null;
}

export interface Order {
  id: number;
  status: string;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  gift_note: string | null;
  created_at: string;
  customer: OrderCustomer;
  items: OrderItem[];
  shipping_zone?: OrderShippingZone | null;
}

export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string | null;
}

export interface Banner {
  id: number;
  image_url: string;
  headline: string | null;
  subtext: string | null;
  link: string | null;
  sort_order: number;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
}

export interface ShippingZone {
  id: number;
  name: string;
  delivery_fee: number;
  estimated_days: string | null;
}

export interface SiteSetting {
  site_name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

export interface PaymentSetting {
  bkash_number: string | null;
  nagad_number: string | null;
  cod_enabled: boolean;
}
