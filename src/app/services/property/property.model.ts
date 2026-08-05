


export interface PropertyRequest {
  vendor_id: string;
  name: string;
  location_id: string;
  city_id: string;
  is_featured: boolean;
  description: string;

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
