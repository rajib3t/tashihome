import { PaginationMeta } from '../api/api-response.model';

export interface RoomBlockProperty {
  id: string; // Property UUID
  name: string;
  slug?: string;
  address?: string;
  price_per_night?: number;
  currency?: string;
}

export interface RoomBlockRoomType {
  id: string; // Room Type UUID
  name: string;
  capacity?: number;
  total_units?: number;
}

export interface RoomBlockCreator {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
}

export interface RoomBlock {
  id: string; // Room Block UUID
  block_start_date: string; // "YYYY-MM-DD"
  block_end_date: string;   // "YYYY-MM-DD"
  units_blocked: number;
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
  property?: RoomBlockProperty;
  room_type?: RoomBlockRoomType;
  creator?: RoomBlockCreator;
}

export interface RoomBlockCreatePayload {
  property_id: string; // UUID or string ID
  room_type_id: string; // UUID or string ID
  block_start_date: string; // "YYYY-MM-DD"
  block_end_date: string;   // "YYYY-MM-DD"
  units_blocked: number;
  reason?: string | null;
}

export interface RoomBlockUpdatePayload {
  block_start_date?: string;
  block_end_date?: string;
  units_blocked?: number;
  reason?: string | null;
}

export interface RoomBlockQueryParams {
  page?: number;
  size?: number;
  property_id?: string;
  room_type_id?: string;
  start_date?: string; // "YYYY-MM-DD"
  end_date?: string;   // "YYYY-MM-DD"
  search?: string;
  sort_by?: 'created_at' | 'block_start_date' | 'block_end_date' | 'units_blocked' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface RoomBlockResponse {
  status: 'success' | 'error';
  message: string;
  data: RoomBlock;
}

export interface RoomBlockListResponse {
  status: 'success' | 'error';
  message: string;
  data: RoomBlock[];
  meta: PaginationMeta;
}

export interface RoomBlockSummaryStats {
  activeBlocksToday: number;
  upcomingBlocksCount: number;
  totalUnitsBlocked: number;
  blockedPropertiesCount: number;
}

export const PREDEFINED_BLOCK_REASONS = [
  'Maintenance',
  'Renovation',
  'Host Personal Stay',
  'Seasonal Closure',
  'Deep Cleaning',
  'Plumbing / Electrical Work',
  'Other',
] as const;

