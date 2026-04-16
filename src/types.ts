
export type Category = string;

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Totem {
  id: string;
  name: string;
  location: Location;
  status: 'online' | 'offline';
  lastMaintenance?: string;
}

export interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  schedule?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}


export interface FeedPost {
  id: string;
  image_url: string;
  caption: string;
  likes: number;
  active: boolean;
  created_at?: string;
}

export interface SiteSettings {
  id: string;
  hero_background_url: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export type UserRole = 'admin' | 'user' | 'intern';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // In a real app never store this on client
}

export type ParkingTicketStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface ParkingTicket {
  id: string;
  plate: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  duration_minutes: number;
  amount_cents: number;
  status: ParkingTicketStatus;
  payment_method: 'pix' | 'card';
  payment_id?: string;
  pix_code?: string;
  qr_code_base64?: string;
  location_description?: string;
  user_id?: string;
  created_at: string;
  expires_at: string;
}

export interface ParkingPriceOption {
  duration_minutes: number;
  label: string;
  amount_cents: number;
}

export type BusinessStatus = 'published' | 'pending_approval' | 'pending_delete';

export interface Business {
  id: string;
  name: string;
  category: Category;
  description: string;
  long_description?: string;
  rating: number;
  review_count: number;
  price_level: number; // 1-4
  image_url: string;
  gallery?: string[];
  location: Location;
  amenities?: string[];
  opening_hours?: Record<string, string>;
  is_featured?: boolean;

  // RBAC fields
  status?: BusinessStatus;
  created_by?: string; // User ID
  updated_by?: string; // User ID
}
