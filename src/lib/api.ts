import { API_BASE_URL } from "./config";
import type {
  ApiValidationError,
  Banner,
  Category,
  CreateOrderPayload,
  Faq,
  Order,
  Page,
  PaymentSetting,
  Product,
  ProductListParams,
  ProductListResponse,
  ShippingZone,
  SiteSetting,
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

export async function getProducts(
  params: ProductListParams = {},
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.is_new) query.set("is_new", "1");
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

export async function getPages(): Promise<Page[]> {
  const { data } = await apiFetch<{ data: Page[] }>("/pages");
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

export async function getShippingZones(): Promise<ShippingZone[]> {
  const { data } = await apiFetch<{ data: ShippingZone[] }>("/shipping-zones");
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

export async function subscribeToNewsletter(email: string): Promise<void> {
  await apiFetch<{ message: string; email: string }>("/newsletter-subscribers", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
