


export interface PropertyRequest {
  vendor_id: string;
  name: string;
  type: 'Apartment' | 'Villa' | 'House' | 'Studio';
  city_id: string;
  location_id: string;
  description: string;
  price: number;
  deposit: number;
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
}

export type PropertyDTO = PropertyRequest;

export interface PropertyItem {
  id: number;
  title: string;
  type: 'Apartment' | 'Villa' | 'House' | 'Studio';
  city: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  area: number;
  price: number;
  deposit: number;
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
  deposit: number;
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
