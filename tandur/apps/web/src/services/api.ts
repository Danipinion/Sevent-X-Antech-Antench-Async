const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const BASE_HOST = RAW_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const API_BASE_URL = `${BASE_HOST}/api/v1`;

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

export interface BuyerProduct {
  id: string;
  listing_id?: string;
  title: string;
  commodity_name: string;
  category: string;
  grade?: string;
  price_per_kg: number;
  stock_kg: number;
  min_order_kg: number;
  seller_name: string;
  seller_location: string;
  image_url?: string;
  description?: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  seller_name: string;
  price_per_kg: number;
  quantity_kg: number;
  subtotal: number;
  image_url?: string;
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

// ==========================================
// API SERVICES PER ROLE
// ==========================================

export const BuyerApi = {
  getProducts: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'Semua') q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchApi<{ data: BuyerProduct[] }>(`/buyer/products${qs}`);
  },
  getProductDetail: (id: string) =>
    fetchApi<{ data: BuyerProduct }>(`/buyer/products/${id}`),
  getCart: () =>
    fetchApi<{ data: { items: CartItem[]; total: number } }>('/buyer/cart'),
  addToCart: (productId: string, quantityKg: number) =>
    fetchApi('/buyer/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity_kg: quantityKg }),
    }),
  updateCartItem: (itemId: string, quantityKg: number) =>
    fetchApi(`/buyer/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity_kg: quantityKg }),
    }),
  removeCartItem: (itemId: string) =>
    fetchApi(`/buyer/cart/items/${itemId}`, { method: 'DELETE' }),
  checkoutCashOnPickup: (payload: {
    pickup_schedule: string;
    buyer_note?: string;
    payment_method: 'cash_on_pickup';
  }) =>
    fetchApi('/buyer/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const FarmerApi = {
  getOrders: () => fetchApi<{ data: FarmerPurchaseOrder[] }>('/orders'),
  updateOrderStatus: (orderId: string, status: string, notes?: string) =>
    fetchApi(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
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