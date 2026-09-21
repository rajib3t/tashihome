import { CountrySearch } from "../country/country-model";



export const PROPERTY_TYPES = [
  'hotel',
  'apartment',
  'villa',
  'resort',
  'hostel',
  'guest_house',
  'bed_and_breakfast',
  'cottage',
  'cabin',
  'lodge',
  'motel',
  'pension',
  'chalet',
  'farm_stay',
  'houseboat',
  'home_stay',
] as const;

export const PROPERTY_TYPES_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  apartment: 'Apartment',
  villa: 'Villa',
  resort: 'Resort',
  hostel: 'Hostel',
  guest_house: 'Guest House',
  bed_and_breakfast: 'Bed and Breakfast',
  cottage: 'Cottage',
  cabin: 'Cabin',
  lodge: 'Lodge',
  motel: 'Motel',
  pension: 'Pension',
  chalet: 'Chalet',
  farm_stay: 'Farm Stay',
  houseboat: 'Houseboat',
  home_stay: 'Home Stay',
};

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyStatus = 'draft' | 'active' | 'inactive';

export interface PropertyRoomTypePrice {
  id?: string;
  occupancy: number; // 1, 2, 3, 4, etc.
  price_per_night: number; // e.g. 2200.00
  sale_per_night?: number; // e.g. 2000.00
}

export interface PropertyRoomTypeRequest {
  id?: string;
  room_type_id: string;
  total_units: number;
  price_per_night?: number;
  sale_per_night?: number;
  pricing_tiers?: PropertyRoomTypePrice[];
}

export interface PropertyRequest {
  vendor_id: string;
  name: string;
  type: PropertyType;
  city_id: string;
  location_id: string;
  address: string;
  description: string;
  price: number;
  sale_price?: number;
  price_per_night?: number;
  deposit?: number;
  is_featured: boolean;
  status: PropertyStatus;
  galleryImages: string[];
  featureImage: string;
  coverImage: string;
  documents: string[];
  amenity_ids: string[];
  facility_ids: string[];
  room_types?: PropertyRoomTypeRequest[];
  room_type_ids?: string[];
  food_option_ids: string[];
  lat?: number | null;
  lon?: number | null;
}

export interface CreatePropertyRequest {
  name: string;
  vendor: string;
  type: PropertyType;
  city: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  vendor_id: string;
  location_id: string;
  city_id: string;
  description: string;
}

export type PropertyDTO = PropertyRequest;

export interface PropertyUpdateRequest extends Partial<PropertyRequest> {}

export interface PropertyMediaUploadResponse {
  galleryImages?: string[];
  featureImage?: string;
  coverImage?: string;
  documents?: string[];
}

export interface PropertyItem {
  id: string;
  title: string;
  type: PropertyType;
  city: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  area: number;
  price: number;
  sale_price?: number;
  price_per_night?: number;
  deposit?: number;
  status: 'draft' | 'active' | 'inactive';
  description: string;
  galleryImages: string[];
  featureImage: string;
  coverImage: string;
  documents?: string[];
  amenity_ids?: string[];
  facility_ids?: string[];
  room_types?: PropertyRoomTypeRequest[];
  room_type_ids?: string[];
  food_option_ids?: string[];
}



export interface PropertyFormValue {
  title: string;
  type: PropertyItem['type'];
  city: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  area: number;
  price: number;
  sale_price: number;
  price_per_night: number;
  status: PropertyItem['status'];
  description: string;
  galleryImages: string;
  featureImage: string;
  coverImage: string;
  documents?: string[];
  amenity_ids?: string[];
  facility_ids?: string[];
  room_types?: PropertyRoomTypeRequest[];
  room_type_ids?: string[];
  food_option_ids?: string[];
  lat?: number | null;
  lon?: number | null;
}
export interface PropertySearch {
  name?: string;
  type?: PropertyType | string;
  city?: string;
  city_id?: string;
  city_slug?: string;
  location?: string;
  location_id?: string;
  location_slug?: string;
  country?: string;
  country_id?: string;
  country_slug?: string;
  min_price?: number | string;
  max_price?: number | string;
  status?: PropertyStatus;
  is_featured?: boolean;
}

export interface PropertyQuery {
  page?: number;
  size?: number;
  search?: PropertySearch;
  city_slug?: string;
  location_slug?: string;
  country_slug?: string;
  city_id?: string;
  location_id?: string;
  country_id?: string;
  min_price?: number | string;
  max_price?: number | string;
  is_featured?: boolean;
  sort_by?: 'created_at' | 'name' | 'price' | string;
  sort_order?: 'asc' | 'desc';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PropertyPublicSearchParams {
  search?: string;
  q?: string;
  region?: string;
  city_slug?: string;
  location_slug?: string;
  country_slug?: string;
  city_name?: string;
  city?: string;
  city_id?: string;
  location_name?: string;
  location?: string;
  location_id?: string;
  country_name?: string;
  country?: string;
  country_id?: string;
  check_in_date?: string;
  check_out_date?: string;
  guests?: number | string;
  adults?: number | string;
  children?: number | string;
  rooms?: number | string;
  min_price?: number | string;
  max_price?: number | string;
  type?: PropertyType | string;
  is_featured?: boolean;
  amenities?: string[] | string;
  facilities?: string[] | string;
  room_types?: string[] | string;
  property_categories?: string[] | string;
  sort_by?: 'created_at' | 'name' | 'price' | string;
  sort_order?: 'asc' | 'desc';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface PropertyAsset {
  id: string;
  property_id?: string | null;
  asset_type?: string;
  use_for?: 'gallery' | 'feature' | 'cover' | string;
  file_url: string;
  title?: string;
  is_primary?: boolean;
  sort_order?: number;
  status?: string;
}

export interface RatingDistribution {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
  [key: string]: number;
}

export interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution?: RatingDistribution | Record<string, number>;
}

export interface LocationNested {
  id: string;
  name: string;
  slug: string;
}

export interface CityNested {
  id: string;
  name: string;
  slug: string;
}

export interface PublicPropertyItem {
  id: string;
  name: string;
  slug: string;
  type?: string;
  price_per_night: number;
  sale_per_night?: number | null;
  currency?: string;
  address?: string;
  is_featured: boolean;
  feature_image?: PropertyAsset | null;
  city?: CityNested | null;
  location?: LocationNested | null;
  rating_summary?: RatingSummary | null;
  average_rating?: number;
  total_reviews?: number;
}

export interface PublicPropertyListResponse {
  success: boolean;
  message: string;
  data: PublicPropertyItem[];
  meta: {
    page: number;
    page_size?: number;
    size?: number;
    total: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
}

export interface PropertyData {
  id: string;
  name: string;
  slug: string;
  type: PropertyType;
  status: string;
  currency?: string;
  sale_price?: number;
  price_per_night?: number;
  sale_per_night?: number;
  deposit?: number;
  is_featured?: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  vendor: Vendor;
  location: Location;
  city: City;
  room_type: RoomType | null;
  property_room_types: PropertyRoomType[];
  property_amenities: PropertyAmenity[];
  property_facilities: PropertyFacility[];
  property_food_options: PropertyFoodOption[];
  property_assets?: PropertyAsset[];
  gallery_images?: PropertyAsset[];
  feature_image?: PropertyAsset | null;
  cover_image?: PropertyAsset | null;
  average_rating?: number;
  total_reviews?: number;
  rating_summary?: RatingSummary;
  completed_steps?: string[];
  current_step?: string;
  percent_complete?: number;
  is_complete?: boolean;
}

export interface Vendor {
  id: string;
  full_name: string;
  email: string;
  is_profile_image_url?: string | null;
}

export interface Location {
  id: string;
  name: string;
  slug?: string;
}

export interface City {
  id: string;
  name: string;
  slug?: string;
}

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
}

export interface PropertyAmenity {
  id: string;
  amenity: Amenity;
}

export interface PropertyFacility {
  id: string;
  facility: Facility;
}

export interface PropertyFoodOption {
  id: string;
  name: string;
  is_included: boolean;
}

export interface PropertyRoomType {
  id: string;
  room_type: RoomType;
  total_units?: number;
  price_per_night?: number;
  sale_per_night?: number;
  pricing_tiers?: PropertyRoomTypePrice[];
}

export interface Amenity {
  id: string;
  name: string;
  icon_url?: string;
}

export interface Facility {
  id: string;
  name: string;
  icon_url?: string;
}

