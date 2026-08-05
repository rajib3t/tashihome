import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PropertyDTO, PropertyItem, PropertyQuery } from './property.model';
import { ApiResponse } from '../api/api-response.model';
import { inject } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PropertyService {

  public readonly apiService: ApiService = inject(ApiService);
  private readonly properties: PropertyItem[] = [
    {
      id: 1,
      title: 'Harbor View Residence',
      type: 'Apartment',
      city: 'Dhaka',
      address: 'Dhanmondi 27, Road 10',
      bedrooms: 2,
      bathrooms: 2,
      guests: 4,
      area: 980,
      price: 180000,
      deposit: 60000,
      status: 'active',
      description: 'Bright apartment with balcony, smart home features, and a fully equipped kitchen.',
      galleryImages: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
      featureImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    },
    {
      id: 2,
      title: 'Lakewood Family Villa',
      type: 'Villa',
      city: 'Chattogram',
      address: 'Agrabad, Lake Side Lane',
      bedrooms: 4,
      bathrooms: 3,
      guests: 6,
      area: 2100,
      price: 420000,
      deposit: 120000,
      status: 'draft',
      description: 'A spacious family villa with private garden, parking bay, and a relaxing lounge.',
      galleryImages: ['https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd'],
      featureImage: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd',
      coverImage: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd',
    },
    {
      id: 3,
      title: 'City Nest Studio',
      type: 'Studio',
      city: 'Sylhet',
      address: 'Zindabazar, Block B',
      bedrooms: 1,
      bathrooms: 1,
      guests: 2,
      area: 550,
      price: 120000,
      deposit: 35000,
      status: 'inactive',
      description: 'Compact and cozy studio for short stays, close to shops, restaurants, and transit.',
      galleryImages: ['https://images.unsplash.com/photo-1494526585095-c41746248156'],
      featureImage: 'https://images.unsplash.com/photo-1494526585095-c41746248156',
      coverImage: 'https://images.unsplash.com/photo-1494526585095-c41746248156',
    },
  ];

  getProperties(query?: PropertyQuery): Observable<{ data: PropertyItem[]; meta: { total: number; page: number; size: number } }> {
    const page = query?.page ?? 1;
    const size = query?.size ?? 10;
    const search = query?.search ?? {};

    const filtered = this.properties.filter((property) => {
      const titleMatch = !search.title || property.title.toLowerCase().includes(search.title.toLowerCase());
      const cityMatch = !search.city || property.city.toLowerCase().includes(search.city.toLowerCase());
      const statusMatch = !search.status || property.status === search.status;
      return titleMatch && cityMatch && statusMatch;
    });

    const start = (page - 1) * size;
    const data = filtered.slice(start, start + size);

    return of({
      data,
      meta: {
        total: filtered.length,
        page,
        size,
      },
    });
  }

  createProperty(property: PropertyDTO): Observable<ApiResponse<PropertyItem>> {
    return this.apiService.protectedPost<ApiResponse<PropertyItem>>('/properties/', property).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  updateProperty(property: PropertyItem): Observable<PropertyItem> {
    const index = this.properties.findIndex((item) => item.id === property.id);
    if (index >= 0) {
      this.properties[index] = property;
    }
    return of(property);
  }
}
