const RAW_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080/api/v1';
const BASE_HOST = RAW_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const API_BASE_URL = `${BASE_HOST}/api/v1`;

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes(':3900/tandur/')) {
      const path = url.split(':3900/tandur/')[1];
      return `${BASE_HOST}/api/v1/storage/tandur/${path}`;
    }
    return url;
  }
  if (url.startsWith('/')) {
    return `${BASE_HOST}${url}`;
  }
  return `${BASE_HOST}/api/v1/storage/tandur/${url}`;
}

export function getAuthToken(): string | null {
  const keys = ['token', 'access_token', 'auth_token', 'jwt'];
  for (const k of keys) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (val) return val;
  }

  try {
    const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed?.token || parsed?.access_token || null;
    }
  } catch {
    // abaikan parse error
  }

  return null;
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errBody = await response.json();
      errorMessage =
        errBody.error?.message || errBody.message || errBody.error || errorMessage;
    } catch {
      // abaikan parse error
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ==========================================
// INTERFACES / DOMAIN TYPES
// ==========================================

export interface UserDomain {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'farmer' | 'middleman' | 'buyer';
  nik?: string;
  ktp_address?: string;
  city?: string;
  regency?: string;
  is_verified?: boolean;
}

export interface Commodity {
  id: string;
  name: string;
  category: string;
  unit: string;
  base_price: number;
  current_market_price: number;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ProductSellerInfo {
  id: string;
  name: string;
  phone?: string;
  role: 'farmer' | 'middleman';
  role_label: string;
  address?: string;
  city?: string;
  province?: string;
  latitude: number;
  longitude: number;
}

export interface BuyerProduct {
  id: string;
  source: 'farmer' | 'middleman' | string;
  source_label: string;
  commodity_id?: string;
  commodity_name: string;
  category_id: string;
  category_name: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  available_stock: number;
  min_order_quantity: number;
  is_preorder: boolean;
  estimated_harvest_date?: string;
  media_urls?: string[];
  primary_image_url?: string;
  sold_count?: number;
  distance_km?: number;
  seller: ProductSellerInfo;
  created_at?: string;

  // Backward compatibility alias
  title?: string;
  price_per_kg?: number;
  stock_kg?: number;
  min_order_kg?: number;
  seller_name?: string;
  seller_location?: string;
  image_url?: string;
  grade?: string;
  category?: string;
}

export interface CartItem {
  id: string;
  buyer_id?: string;
  product_id: string;
  product_source?: string;
  seller_id?: string;
  product_name: string;
  commodity_name?: string;
  category_name?: string;
  unit: string;
  unit_price: number;
  quantity: number;
  available_stock?: number;
  subtotal: number;
  media_url?: string;
  is_preorder?: boolean;
  seller?: ProductSellerInfo;

  // Backward compatibility alias
  title?: string;
  seller_name?: string;
  price_per_kg?: number;
  quantity_kg?: number;
  image_url?: string;
}

export interface CartSellerGroup {
  seller: ProductSellerInfo;
  source: string;
  items: CartItem[];
  subtotal: number;
  total_quantity: number;
  distance_km?: number;
  within_range: boolean;
}

export interface BuyerCartResponse {
  seller_groups: CartSellerGroup[];
  total_sellers: number;
  total_items: number;
  total_quantity: number;
  grand_subtotal: number;
}

export interface BuyerOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  seller_name: string;
  seller_phone?: string;
  seller_role: string;
  status: string;
  status_label: string;
  payment_method: string;
  payment_label: string;
  subtotal_amount: number;
  handling_fee: number;
  total_amount: number;
  cash_to_prepare: number;
  pickup_address: string;
  notes?: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    subtotal: number;
    media_url?: string;
  }>;
}

export interface FarmerPurchaseOrder {
  id: string;
  po_number: string;
  commodity_name: string;
  variety?: string;
  weight_kg: number;
  price_per_kg: number;
  total_price: number;
  buyer_name: string;
  buyer_location?: string;
  status: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  pickup_date?: string;
  vehicle_info?: string;
  notes?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  batch_code: string;
  commodity_name: string;
  variety: string;
  category: 'Gabah' | 'Beras' | 'Palawija';
  location: string;
  stock_kg: number;
  capacity_kg: number;
  avg_buy_price: number;
  market_ref_price: number;
  moisture_level?: string;
  supplier_name?: string;
  updated_at?: string;
}

export interface NegotiationOffer {
  id: string;
  contract_code: string;
  farmer_name: string;
  village: string;
  commodity_name: string;
  weight_kg: number;
  offered_price: number;
  market_ref_price: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  harvest_period?: string;
  payment_method?: string;
}

export function normalizeMarketplaceListingToProduct(item: any): BuyerProduct {
  if (!item) return {} as BuyerProduct;

  const price = Number(item.price_per_unit ?? item.price ?? item.price_per_kg ?? 0);
  const stock = Number(
    item.available_quantity ?? item.estimated_quantity ?? item.available_stock ?? item.stock_kg ?? 0
  );
  const minOrder = Number(item.min_order_quantity ?? item.min_order_kg ?? 1);
  const mediaUrls: string[] = Array.isArray(item.media_urls)
    ? item.media_urls
    : item.primary_image_url
    ? [item.primary_image_url]
    : item.image_url
    ? [item.image_url]
    : [];
  const primaryImg =
    item.primary_image_url || item.image_url || (mediaUrls.length > 0 ? mediaUrls[0] : '');

  const isFarmer =
    item.farmer_id ||
    item.source === 'farmer' ||
    (!item.middleman_id && !item.inventory_id && !item.selling_price_per_kg);

  return {
    id: String(item.id),
    source: (item.source || (isFarmer ? 'farmer' : 'middleman')) as 'farmer' | 'middleman',
    source_label: item.source_label || (isFarmer ? 'Petani Mitra' : 'Mitra Gudang'),
    commodity_id: item.commodity_id,
    commodity_name: item.commodity_name || item.title || 'Komoditas',
    category_id: item.category_id || item.category || 'cat-umum',
    category_name: item.category || item.category_name || item.commodity_name || 'Komoditas',
    name: item.title || item.name || item.commodity_name || 'Komoditas Panen',
    description: item.description || '',
    price: price,
    unit: item.unit || 'kg',
    available_stock: stock,
    min_order_quantity: minOrder,
    is_preorder: Boolean(item.is_preorder),
    estimated_harvest_date: item.estimated_harvest_date || item.ready_date,
    primary_image_url: primaryImg,
    media_urls: mediaUrls,
    seller: item.seller || {
      id: item.farmer_id || item.middleman_id || 'seller',
      name: item.farmer_name || item.farmer_group || item.seller_name || 'Petani Mitra',
      phone: item.farmer_phone,
      role: (isFarmer ? 'farmer' : 'middleman') as 'farmer' | 'middleman',
      role_label: isFarmer ? 'Petani Mitra' : 'Mitra Gudang',
      city: item.pickup_address || item.seller_city || 'Demak, Jawa Tengah',
      address: item.pickup_address,
      latitude: item.latitude || -7.0519,
      longitude: item.longitude || 110.5342,
    },
  };
}

// ==========================================
// API SERVICES PER ROLE
// ==========================================

export const BuyerApi = {
  getCategories: () =>
    fetchApi<{ status: string; data: ProductCategory[] }>('/categories'),

  getProducts: async (params?: {
    category_id?: string;
    category?: string;
    search?: string;
    source?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ status: string; data: BuyerProduct[] }> => {
    const q = new URLSearchParams();
    if (params?.category_id) q.set('commodity_id', params.category_id);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';

    let items: BuyerProduct[] = [];
    try {
      // Prioritaskan endpoint /marketplace/listings untuk katalog pembeli /produk
      const res = await fetchApi<any>(`/marketplace/listings${qs}`);
      const rawList = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      items = rawList.map(normalizeMarketplaceListingToProduct);
    } catch {
      // Fallback ke endpoint /products bila /marketplace/listings gagal
    }

    if (items.length === 0) {
      try {
        const pQ = new URLSearchParams();
        if (params?.category_id) pQ.set('category_id', params.category_id);
        if (params?.search) pQ.set('search', params.search);
        const pQs = pQ.toString() ? `?${pQ.toString()}` : '';
        const fallbackRes = await fetchApi<any>(`/products${pQs}`);
        const fallbackList = Array.isArray(fallbackRes?.data?.items)
          ? fallbackRes.data.items
          : Array.isArray(fallbackRes?.data)
          ? fallbackRes.data
          : Array.isArray(fallbackRes)
          ? fallbackRes
          : [];
        items = fallbackList.map(normalizeMarketplaceListingToProduct);
      } catch {
        // Abaikan
      }
    }

    return { status: 'success', data: items };
  },

  getPopularProducts: async (): Promise<{ status: string; data: BuyerProduct[] }> => {
    try {
      const res = await fetchApi<any>('/marketplace/listings?limit=6');
      const rawList = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      if (rawList.length > 0) {
        return { status: 'success', data: rawList.map(normalizeMarketplaceListingToProduct) };
      }
    } catch {
      // Fallback
    }

    try {
      const res = await fetchApi<{ status: string; data: BuyerProduct[] }>('/products/popular');
      const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
      return { status: 'success', data: list.map(normalizeMarketplaceListingToProduct) };
    } catch {
      return { status: 'success', data: [] };
    }
  },

  getProductDetail: async (id: string, source?: string): Promise<{ status: string; data: BuyerProduct }> => {
    try {
      const res = await fetchApi<any>(`/marketplace/listings/${id}`);
      const item = (res as any)?.data || res;
      if (item && (item.id || item.title || item.name)) {
        return { status: 'success', data: normalizeMarketplaceListingToProduct(item) };
      }
    } catch {
      // Lanjut coba /products/${id}
    }

    const qs = source ? `?source=${source}` : '';
    const fallbackRes = await fetchApi<any>(`/products/${id}${qs}`);
    const item = (fallbackRes as any)?.data || fallbackRes;
    return { status: 'success', data: normalizeMarketplaceListingToProduct(item) };
  },

  getCart: () =>
    fetchApi<{ status: string; data: BuyerCartResponse }>('/cart'),

  addToCart: async (productId: string, quantity: number, source?: string) => {
    try {
      const res = await fetchApi('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
          source: source || 'middleman',
        }),
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'));
      }
      return res;
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'));
      }
      throw err;
    }
  },

  updateCartItem: async (itemId: string, quantity: number) => {
    const res = await fetchApi(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cartUpdated'));
    }
    return res;
  },

  removeCartItem: async (itemId: string) => {
    const res = await fetchApi(`/cart/items/${itemId}`, { method: 'DELETE' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cartUpdated'));
    }
    return res;
  },

  getPrimaryAddress: () =>
    fetchApi<{ status: string; data: any }>('/addresses/primary'),

  checkoutSummary: () =>
    fetchApi<{ status: string; data: any }>('/orders/checkout-summary', {
      method: 'POST',
    }),

  createOrder: (payload: {
    item_ids?: string[];
    delivery_address_id?: string;
    notes?: string;
  }) =>
    fetchApi<{ status: string; data: BuyerOrder }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  checkoutCashOnPickup: (payload: {
    pickup_schedule?: string;
    buyer_note?: string;
    payment_method?: 'cash_on_pickup';
  }) =>
    fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({
        notes: [payload.pickup_schedule, payload.buyer_note].filter(Boolean).join(' • '),
      }),
    }),
};

export async function getEffectiveCartCount(): Promise<number> {
  let count = 0;

  // 1. Coba hitung dari backend jika ada token login
  try {
    const token = getAuthToken();
    if (token) {
      const res = await fetchApi<any>('/cart');
      const cartData = (res as any)?.data;
      if (typeof cartData?.total_items === 'number' && cartData.total_items > 0) {
        count = cartData.total_items;
      } else if (Array.isArray(cartData?.seller_groups)) {
        let itemsCount = 0;
        for (const sg of cartData.seller_groups) {
          if (Array.isArray(sg.items)) {
            itemsCount += sg.items.length;
          }
        }
        if (itemsCount > 0) count = itemsCount;
      }
    }
  } catch {
    // fallback ke local storage
  }

  // 2. Jika 0 atau fallback, hitung dari local storage cart
  try {
    const rawLocal = localStorage.getItem('tandur_buyer_cart');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.length > 0) {
        count = Math.max(count, parsed.length);
      }
    }
  } catch {
    // ignore
  }

  return count;
}

export const FarmerApi = {
  getOrders: () => fetchApi<{ data: FarmerPurchaseOrder[] }>('/farmer/orders'),
  getOrderDetail: (orderId: string) =>
    fetchApi<{ data: FarmerPurchaseOrder }>(`/farmer/orders/${orderId}`),
  acceptOrder: (orderId: string) =>
    fetchApi<{ data: FarmerPurchaseOrder }>(`/farmer/orders/${orderId}/accept`, {
      method: 'POST',
    }),
  negotiateOrder: (
    orderId: string,
    payload: { counter_price: number; counter_quantity?: number; counter_notes?: string }
  ) =>
    fetchApi<{ data: FarmerPurchaseOrder }>(`/farmer/orders/${orderId}/negotiate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rejectOrder: (orderId: string, reason?: string) =>
    fetchApi<{ data: FarmerPurchaseOrder }>(`/farmer/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || '' }),
    }),
  confirmReady: (orderId: string) =>
    fetchApi<{ data: FarmerPurchaseOrder }>(`/farmer/orders/${orderId}/confirm-ready`, {
      method: 'POST',
    }),
  updateOrderStatus: async (orderId: string, status: string, notes?: string) => {
    if (status === 'scheduled' || status === 'scheduled_pickup' || status === 'accepted') {
      return FarmerApi.acceptOrder(orderId);
    }
    if (status === 'in_transit' || status === 'ready') {
      return FarmerApi.confirmReady(orderId);
    }
    if (status === 'rejected' || status === 'cancelled') {
      return FarmerApi.rejectOrder(orderId, notes);
    }
    return FarmerApi.acceptOrder(orderId);
  },
  uploadMedia: async (file: File): Promise<{ url: string; key: string }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('media', file);
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/farmer/listings/upload-media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(
        errJson?.message ||
          errJson?.error?.message ||
          `Gagal mengunggah foto ke storage (${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  },
  createListing: async (payload: Record<string, unknown>) => {
    try {
      return await fetchApi('/farmer/offers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('404')) {
        return fetchApi('/farmer/listings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      throw err;
    }
  },
};

export const MiddlemanApi = {
  getInventories: () => fetchApi<{ data: InventoryItem[] }>('/middleman/inventory'),
  addIncomingStock: (payload: Record<string, unknown>) =>
    fetchApi('/middleman/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInventory: (id: string, payload: Record<string, unknown>) =>
    fetchApi(`/middleman/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteInventory: (id: string) =>
    fetchApi(`/middleman/inventory/${id}`, { method: 'DELETE' }),
  openSellOffer: (payload: Record<string, unknown>) =>
    fetchApi('/middleman/sell-offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPurchaseOrders: () =>
    fetchApi<{ data: FarmerPurchaseOrder[] }>('/middleman/orders'),
  createPurchaseOrder: (payload: Record<string, unknown>) =>
    fetchApi('/middleman/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePurchaseOrder: (id: string, payload: Record<string, unknown>) =>
    fetchApi(`/middleman/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deletePurchaseOrder: (id: string) =>
    fetchApi(`/middleman/orders/${id}`, { method: 'DELETE' }),
  getNegotiations: () =>
    fetchApi<{ data: NegotiationOffer[] }>('/middleman/negotiations'),
  acceptNegotiation: (id: string) =>
    fetchApi(`/middleman/negotiations/${id}/accept`, { method: 'POST' }),
};