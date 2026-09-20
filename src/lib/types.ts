export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface ProductTag {
  id: number;
  name: string;
  slug: string;
}

export interface ProductLabel {
  id: number;
  name: string;
  badge_color: string;
}

export interface ProductAttributeValue {
  id: number;
  attribute_name: string;
  value: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
}

export interface ProductSeo {
  meta_title: string;
  meta_description: string | null;
  og_image: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  seo?: ProductSeo;
  price: number;
  sale_price: number | null;
  effective_price: number;
  discount_percent: number | null;
  stock_quantity: number;
  sku: string;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  category: Category;
  brand: Brand | null;
  images: ProductImage[];
  variants?: ProductVariant[];
  tags?: ProductTag[];
  labels?: ProductLabel[];
  attribute_values?: ProductAttributeValue[];
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

export type ProductSort = "relevant" | "newest" | "price_asc" | "price_desc";

export interface ProductListParams {
  category?: string;
  brand?: string;
  tag?: string;
  search?: string;
  is_new?: boolean;
  is_featured?: boolean;
  on_sale?: boolean;
  min_price?: number;
  max_price?: number;
  sort?: ProductSort;
  page?: number;
  per_page?: number;
}

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket";

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  variant_id?: number | null;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_email?: string | null;
  customer_phone: string;
  customer_address: string;
  division: string;
  district: string;
  thana: string;
  payment_method: PaymentMethod;
  gift_note?: string | null;
  items: OrderItemPayload[];
}

export interface OrderCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  division: string;
  district: string;
  thana: string;
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

export interface SiteSetting {
  site_name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

export interface PaymentSetting {
  bkash_number: string | null;
  nagad_number: string | null;
  rocket_number: string | null;
  cod_enabled: boolean;
}

export interface ContactSubmissionPayload {
  name: string;
  phone: string;
  message: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface AuthResponse {
  customer: AuthCustomer;
  token: string;
}

export interface Testimonial {
  id: number;
  customer_name: string;
  photo_url: string | null;
  quote: string;
  rating: number;
  is_featured: boolean;
}
