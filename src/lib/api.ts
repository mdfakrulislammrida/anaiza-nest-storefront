import { API_BASE_URL } from "./config";
import type {
  ApiValidationError,
  AuthResponse,
  Banner,
  Brand,
  Category,
  ContactSubmissionPayload,
  CreateOrderPayload,
  Faq,
  LoginPayload,
  Order,
  Page,
  PaymentSetting,
  Product,
  ProductListParams,
  ProductListResponse,
  ProductTag,
  RegisterPayload,
  SiteSetting,
  Testimonial,
} from "./types";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiValidationError | null;
    throw new ApiError(
      body?.message ?? `Request failed with status ${res.status}`,
      res.status,
      body?.errors,
    );
  }

  return res.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<{ data: Category[] }>("/categories");
  return data;
}

export async function getBrands(): Promise<Brand[]> {
  const { data } = await apiFetch<{ data: Brand[] }>("/brands");
  return data;
}

export async function getTags(): Promise<ProductTag[]> {
  const { data } = await apiFetch<{ data: ProductTag[] }>("/tags");
  return data;
}

export async function getProducts(
  params: ProductListParams = {},
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.brand) query.set("brand", params.brand);
  if (params.tag) query.set("tag", params.tag);
  if (params.search) query.set("search", params.search);
  if (params.is_new) query.set("is_new", "1");
  if (params.is_featured) query.set("is_featured", "1");
  if (params.on_sale) query.set("on_sale", "1");
  if (params.min_price !== undefined) query.set("min_price", String(params.min_price));
  if (params.max_price !== undefined) query.set("max_price", String(params.max_price));
  if (params.sort && params.sort !== "relevant") query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  const qs = query.toString();
  return apiFetch<ProductListResponse>(`/products${qs ? `?${qs}` : ""}`);
}

export async function getProduct(slug: string): Promise<Product> {
  const { data } = await apiFetch<{ data: Product }>(
    `/products/${encodeURIComponent(slug)}`,
  );
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await apiFetch<{ data: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function lookupOrder(orderId: string, phone: string): Promise<Order> {
  const query = new URLSearchParams({ order_id: orderId, phone });
  const { data } = await apiFetch<{ data: Order }>(`/orders/lookup?${query.toString()}`);
  return data;
}

export async function getPage(slug: string): Promise<Page> {
  const { data } = await apiFetch<{ data: Page }>(`/pages/${encodeURIComponent(slug)}`);
  return data;
}

export async function getBanners(): Promise<Banner[]> {
  const { data } = await apiFetch<{ data: Banner[] }>("/banners");
  return data;
}

export async function getFaqs(): Promise<Faq[]> {
  const { data } = await apiFetch<{ data: Faq[] }>("/faqs");
  return data;
}

export async function getSiteSettings(): Promise<SiteSetting> {
  const { data } = await apiFetch<{ data: SiteSetting }>("/site-settings");
  return data;
}

export async function getPaymentSettings(): Promise<PaymentSetting> {
  const { data } = await apiFetch<{ data: PaymentSetting }>("/payment-settings");
  return data;
}

export async function getTestimonials(featured = false): Promise<Testimonial[]> {
  const qs = featured ? "?featured=1" : "";
  const { data } = await apiFetch<{ data: Testimonial[] }>(`/testimonials${qs}`);
  return data;
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  await apiFetch<{ message: string; email: string }>("/newsletter-subscribers", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function submitContactForm(payload: ContactSubmissionPayload): Promise<void> {
  await apiFetch<{ message: string }>("/contact-submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerCustomer(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginCustomer(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

