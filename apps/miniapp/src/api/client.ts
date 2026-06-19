import type {
  AuthResponse,
  Cart,
  CatalogQuery,
  Category,
  CreateOrderResponse,
  InvoiceResponse,
  Order,
  Product,
  ProductInput,
  ShopConfig,
} from '@tma-shop/shared';

export interface ProductPage {
  items: Product[];
  page: number;
  limit: number;
  total: number;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);

    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ApiClientError(res.status, err?.code ?? 'error', err?.message ?? res.statusText);
    }
    return data as T;
  }

  // --- auth ---
  auth(initData: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
  }

  // --- catalog ---
  getShop(): Promise<ShopConfig> {
    return this.request<ShopConfig>('/shop');
  }

  getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  getProducts(query: Partial<CatalogQuery> = {}): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.request<ProductPage>(`/products${qs ? `?${qs}` : ''}`);
  }

  getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  // --- cart ---
  getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  addToCart(productId: string, quantity: number): Promise<Cart> {
    return this.request<Cart>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  setCartItem(productId: string, quantity: number): Promise<Cart> {
    return this.request<Cart>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  removeCartItem(productId: string): Promise<Cart> {
    return this.request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' });
  }

  // --- orders & payment ---
  createOrder(): Promise<CreateOrderResponse> {
    return this.request<CreateOrderResponse>('/orders', { method: 'POST' });
  }

  getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  getOrder(id: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  createInvoice(orderId: string): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>(`/orders/${orderId}/invoice`, { method: 'POST' });
  }

  // --- admin ---
  adminGetOrders(): Promise<Order[]> {
    return this.request<Order[]>('/admin/orders');
  }

  adminSetOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    return this.request<Order>(`/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  adminCreateProduct(input: ProductInput): Promise<Product> {
    return this.request<Product>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}

export const api = new ApiClient();
