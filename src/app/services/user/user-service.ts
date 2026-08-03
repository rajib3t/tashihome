import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map, Observable , throwError} from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { RequestVendor, User, VendorDetail, VendorQuery, VendorUpdateRequest } from './user.model';

@Service()
export class UserService {
    public readonly apiService = inject(ApiService)


    getUserProfile(): Observable<ApiResponse<User>> {
    return this.apiService.protectedGet<ApiResponse<User>>('/profile/').pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    )
  }

  
  getInitials(name?: string): string {
    if (!name) return '?';

    return name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  getRole(role: string): string {
    switch (role) {
      

      case 'admin':
        return 'Admin';

      case "vendor":
        return "Vendor";
      case 'user':
        return 'User';

      default:
        return 'Guest';
    }
  }


  createVendor(vendorData: RequestVendor): Observable<ApiResponse<User>> {
    return this.apiService.protectedPost<ApiResponse<User>>('/vendors/', vendorData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  

  public getVendors(params: VendorQuery): Observable<PaginatedResponse<User>> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = search.name?.trim();
    const email = search.email?.trim();
    const phone = search.phone?.trim();
    const status = search.status?.trim();

    if (name) {
      queryParams['full_name'] = name;
    }

    if (email) {
      queryParams['email'] = email;
    }

    if (phone) {
      queryParams['phone'] = phone;
    }

    if (status) {
      queryParams['status'] = status;
    }

    if (params.sortBy?.trim()) {
      queryParams['sortBy'] = params.sortBy.trim();
    }

    if (params.sortOrder) {
      queryParams['sortOrder'] = params.sortOrder;
    }

    return this.apiService.protectedGet<PaginatedResponse<User>>('/vendors/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }


  public getVendorById(vendorId: string): Observable<ApiResponse<VendorDetail>> {
    return this.apiService.protectedGet<ApiResponse<VendorDetail>>(`/vendors/${vendorId}`).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateImage(vendorId: string, imageFile: File): Observable<ApiResponse<VendorDetail>> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    return this.apiService.protectedUploadPatch<ApiResponse<VendorDetail>>(`/vendors/${vendorId}/profile-image`, formData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateVendor(
    vendorId : string,
    vendorDetail : Partial<RequestVendor>,
  ): Observable<ApiResponse<VendorDetail>> {
    return this.apiService.protectedPut<ApiResponse<VendorDetail>>(`/vendors/${vendorId}`, vendorDetail).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public statusUpdateVendor(id: string, status: string): Observable<ApiResponse<VendorDetail>> {
      return this.apiService.protectedPatch<ApiResponse<VendorDetail>>(`/vendors/change/${id}/${status}`, { status }).pipe(
          map(response => response.data),
          catchError(this.apiService.passthroughError)
      )
  }
}
