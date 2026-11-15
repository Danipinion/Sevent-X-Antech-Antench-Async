export type UserRole = 'FARMER' | 'MIDDLEMAN' | 'BUYER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

export interface Commodity {
  id: string;
  name: string;
  category: string;
  unit: string;
  basePrice: number;
  currentMarketPrice: number;
}

export interface InventoryItem {
  id: string;
  commodityId: string;
  commodityName: string;
  ownerId: string;
  quantity: number;
  unit: string;
  qualityGrade: 'GRADE_A' | 'GRADE_B' | 'GRADE_C';
  locationName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  commodityId: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface MarketPrice {
  commodityId: string;
  commodityName: string;
  regionalPrice: number;
  nationalAverage: number;
  updatedAt: string;
}
