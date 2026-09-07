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
  delivery_fee: number;
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
