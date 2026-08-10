


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

export interface PropertyRequest {
  vendor_id: string;
  name: string;
  type: PropertyType;
  city_id: string;
  location_id: string;
  description: string;
  price: number;
  sale_price?: number;
  price_per_night?: number;
  deposit?: number;
  is_featured: boolean;
  status: 'draft' | 'active' | 'inactive';
  galleryImages: string[];
  featureImage: string;
  coverImage: string;
  documents: string[];
  amenity_ids: string[];
  facility_ids: string[];
  room_type_ids: string[];
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
  id: number;
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
}

export interface PropertyQuery {
  page: number;
  size: number;
  search?: {
    title?: string;
    city?: string;
    status?: string;
  };
}

export type PropertySearch = PropertyQuery['search'];



export interface PropertyData {
  vendor: Vendor;
  location: Location;
  city: City;
  room_type: RoomType | null;
  name: string;
  slug: string;
  type: PropertyType;
  sale_price?: number;
  price_per_night?: number;
  description: string;
  status: string;
  id: string;
}

export interface Vendor {
  id: string;
  full_name: string;
  email: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
}