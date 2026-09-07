import { API_BASE_URL } from "./config";
import type {
  ApiValidationError,
  Category,
  CreateOrderPayload,
  Order,
  Product,
  ProductListParams,
  ProductListResponse,
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
