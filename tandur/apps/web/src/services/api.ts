const API_BASE_URL =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/* =========================================================================
   Domain Models (disesuaikan dengan apps/api/internal/domain)
   ========================================================================= */

// Berdasarkan domain/commodity.go
export interface Commodity {
  id: string;
  name: string;
  category: string;
  unit: string;
  base_price: number;
  current_market_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardCommodityPrice {
  commodity_id: string;
  commodity_name: string;
  unit: string;
  average_price: number;
  yesterday_price: number;
  delta_price: number;
  percentage_change: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trend_label: string;
  last_updated_at: string;
  source: string;
}

// Berdasarkan domain/user.go
export interface UserDomain {
  id: string;
  nik?: string;
  name: string;
  phone: string;
  role: 'farmer' | 'middleman' | 'buyer';
  is_bisnis?: boolean;
  buyer_type?: string;
  is_active?: boolean;
  is_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  ktp_photo_url?: string;
  birth_place?: string;
  birth_date?: string;
  ktp_address?: string;
  email?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// Berdasarkan domain/order.go
export interface FarmerPurchaseOrder {
  id: string;
  order_code: string;
  listing_id?: string;
  farmer_id?: string;
  middleman_id?: string;
  status:
    | 'waiting_confirmation'
    | 'in_negotiation'
    | 'scheduled_pickup'
    | 'completed'
    | 'cancelled';
  status_label: string;
  commodity_id?: string;
  commodity_name: string;
  category?: string;
  listing_title?: string;
  unit?: string;
  buyer_name: string;
  buyer_phone?: string;
  offered_quantity: number;
  offered_price: number;
  total_offered_price?: number;
  total_price: number;
  pickup_date?: string;
  actual_weight?: number;
  final_total_amount?: number;
}

/* =========================================================================
   HTTP Fetcher dengan Otentikasi Otomatis
   ========================================================================= */

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody.message || 'Gagal memproses permintaan');
  }

  return response.json();
}
