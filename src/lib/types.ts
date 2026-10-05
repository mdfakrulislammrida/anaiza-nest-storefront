export interface ImageMeta {
  url: string | null;
  width: number | null;
  height: number | null;
}

// The lightweight shape returned by the /categories list endpoint and
// nested inside a Product -- see CategoryDetail for the full category page.
export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  // Whether the admin lists it in the header's Categories menu (absent on an older API = yes).
  show_in_menu?: boolean;
  menu_order?: number;
  thumbnail: ImageMeta;
}

export interface CategoryFaq {
  id: number;
  question: string;
  answer: string;
}

export interface CategoryDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  intro_text: string | null;
  seo_description: string | null;
  banner_desktop: ImageMeta;
  banner_mobile: ImageMeta & { auto_generated: boolean };
  thumbnail: ImageMeta;
  seo: {
    meta_title: string;
    meta_description: string | null;
  };
  faqs?: CategoryFaq[];
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
  url_400: string | null;
  url_800: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
  price: number | null;
  sale_price: number | null;
  effective_price: number;
  discount_percent: number | null;
  stock_quantity: number;
  sku: string;
  image: Pick<ProductImage, "id" | "url" | "url_400" | "url_800" | "width" | "height" | "alt_text"> | null;
}

export interface ProductFaq {
  id: number;
  question: string;
  answer: string;
}

export interface ProductVideo {
  url: string | null;
  file: string | null;
  poster: string | null;
}

export interface ProductSpec {
  label: string;
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
  short_description: string | null;
  summary: string | null;
  specifications: ProductSpec[];
  gtin: string | null;
  mpn: string | null;
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
  category: CategorySummary;
  brand: Brand | null;
  images: ProductImage[];
  video?: ProductVideo;
  variants?: ProductVariant[];
  tags?: ProductTag[];
  labels?: ProductLabel[];
  attribute_values?: ProductAttributeValue[];
  faqs?: ProductFaq[];
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
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
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
  sku: string | null;
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
  seo?: ProductSeo;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  featured_image: string | null;
  author: { name: string | null; bio: string | null };
  published_at: string | null;
  updated_at: string;
  seo?: ProductSeo;
}

export interface ArticleListResponse {
  data: Article[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

export interface Banner {
  id: number;
  image_url: string;
  headline: string | null;
  subtext: string | null;
  link: string | null;
  sort_order: number;
}

export type HomepageSectionType =
  | "hero_banner"
  | "hot_deals"
  | "bestsellers"
  | "new_arrivals"
  | "newsletter"
  | "custom_html";

export interface HomepageSection {
  id: number;
  type: HomepageSectionType;
  position: number;
  custom_title: string | null;
  custom_html: string | null;
  // Hot Deals only: when the offer really ends. Null/absent means no countdown.
  deal_ends_at?: string | null;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
}

export interface NavLink {
  label: string;
  url: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface DayRange {
  min: number;
  max: number;
}

// Editable in the admin (Site Settings > Delivery & returns); drives the
// checkout fee, every place that quotes delivery/returns, and the product schema.
export interface StorePolicy {
  free_delivery_threshold: number;
  delivery_fee_dhaka: number;
  delivery_fee_outside_dhaka: number;
  delivery_days_dhaka: DayRange;
  delivery_days_outside_dhaka: DayRange;
  return_window_days: number;
}

// Admin-written homepage wording (Site Settings > Homepage wording); each field is null when blank.
export interface HomepageWording {
  hero_badge: string | null;
  hero_title: string | null;
  hero_text: string | null;
  hot_deals_tile_text: string | null;
  new_arrivals_tile_text: string | null;
  newsletter_headline: string | null;
  newsletter_text: string | null;
}

export interface SiteSetting {
  site_name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  promo_text: string;
  // Master switch for the header's Categories menu (absent on an older API = on).
  show_categories_menu?: boolean;
  nav_links: NavLink[];
  footer_about: string;
  footer_links: NavLink[];
  social_links: SocialLink[];
  footer_copyright_text: string;
  brand_description: string | null;
  // Absent on an older API, in which case the neutral defaults apply.
  homepage?: HomepageWording;
  policy: StorePolicy;
}

export interface MarketingSetting {
  gtm_container_id: string | null;
  meta_pixel_id: string | null;
  ga4_id: string | null;
  tiktok_pixel_id: string | null;
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

export type PopupTrigger = "delay" | "scroll" | "exit_intent";

export type PopupPage = "all" | "home" | "shop" | "product" | "category";

export interface PopupConfig {
  enabled: boolean;
  trigger: PopupTrigger;
  delay_seconds: number;
  pages: PopupPage[];
  image: string | null;
}

export interface PopupSettings {
  newsletter: PopupConfig;
  gift_finder: PopupConfig;
}
