import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { AdminCreateUserDTO, AdminUpdateUserDTO, RegisterUserRequest, RegisterUserResponse, RequestVendor, UpdatePasswordDTO, UpdateProfileInfoDTO, User, UserBasicProfileResponse, UserQuery, VendorDetail, VendorQuery, VendorUpdateRequest } from './user.model';

@Service()
export class UserService {
    public readonly apiService = inject(ApiService)


    getUserProfile(): Observable<ApiResponse<User>> {
    return this.apiService.protectedGet<ApiResponse<User>>('/profile/').pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    )
  }

  public getProfile(): Observable<ApiResponse<UserBasicProfileResponse>> {
    return this.apiService.protectedGet<ApiResponse<UserBasicProfileResponse>>('/profile/').pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateProfileInfo(data: UpdateProfileInfoDTO): Observable<ApiResponse<UserBasicProfileResponse>> {
    return this.apiService.protectedPut<ApiResponse<UserBasicProfileResponse>>('/profile/info', data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updatePassword(data: UpdatePasswordDTO): Observable<ApiResponse<UserBasicProfileResponse>> {
    return this.apiService.protectedPut<ApiResponse<UserBasicProfileResponse>>('/profile/password', data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public uploadProfileImage(file: File): Observable<ApiResponse<UserBasicProfileResponse>> {
    const formData = new FormData();
    formData.append('profile_image', file);
    return this.apiService.protectedUpload<ApiResponse<UserBasicProfileResponse>>('/profile/image', formData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public deleteProfileImage(): Observable<ApiResponse<UserBasicProfileResponse>> {
    return this.apiService.protectedDelete<ApiResponse<UserBasicProfileResponse>>('/profile/image').pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
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
    return this.apiService.protectedPost<ApiResponse<User>>('/admin/vendors/', vendorData).pipe(
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

    return this.apiService.protectedGet<PaginatedResponse<User>>('/admin/vendors/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }


  public getVendorById(vendorId: string): Observable<ApiResponse<VendorDetail>> {
    return this.apiService.protectedGet<ApiResponse<VendorDetail>>(`/admin/vendors/${vendorId}`).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateImage(vendorId: string, imageFile: File): Observable<ApiResponse<VendorDetail>> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    return this.apiService.protectedUploadPatch<ApiResponse<VendorDetail>>(`/admin/vendors/${vendorId}/profile-image`, formData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateVendor(
    vendorId : string,
    vendorDetail : Partial<RequestVendor>,
  ): Observable<ApiResponse<VendorDetail>> {
    return this.apiService.protectedPut<ApiResponse<VendorDetail>>(`/admin/vendors/${vendorId}`, vendorDetail).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public statusUpdateVendor(id: string, status: string): Observable<ApiResponse<VendorDetail>> {
      return this.apiService.protectedPatch<ApiResponse<VendorDetail>>(`/admin/vendors/change/${id}/${status}`, { status }).pipe(
          map(response => response.data),
          catchError(this.apiService.passthroughError)
      )
  }

  public sendVendorPasswordReset(vendorId: string, confirm: string): Observable<ApiResponse<any>> {
    return this.apiService.protectedPost<ApiResponse<any>>(`/admin/vendors/${vendorId}/password-reset`, { confirm }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  // ================= ADMIN USER MANAGEMENT =================

  public getUsers(params: UserQuery): Observable<PaginatedResponse<User>> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = (search.full_name || search.name)?.trim();
    const email = search.email?.trim();
    const phone = search.phone?.trim();
    const status = search.status?.trim();
    const role = search.role?.trim();

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

    if (role) {
      queryParams['role'] = role;
    }

    if (params.sortBy?.trim()) {
      queryParams['sort_by'] = params.sortBy.trim();
    }

    if (params.sortOrder) {
      queryParams['sort_order'] = params.sortOrder;
    }

    return this.apiService.protectedGet<PaginatedResponse<User>>('/admin/users/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public getUserById(userId: string): Observable<ApiResponse<User>> {
    return this.apiService.protectedGet<ApiResponse<User>>(`/admin/users/${userId}`).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public createUser(userData: AdminCreateUserDTO): Observable<ApiResponse<User>> {
    const payload = {
      ...userData,
      
    };
    return this.apiService.protectedPost<ApiResponse<User>>('/admin/users/', payload).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateUser(userId: string, userData: AdminUpdateUserDTO): Observable<ApiResponse<User>> {
    return this.apiService.protectedPut<ApiResponse<User>>(`/admin/users/${userId}`, userData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public statusUpdateUser(id: string, status: string): Observable<ApiResponse<User>> {
    return this.apiService.protectedPatch<ApiResponse<User>>(`/admin/users/change/${id}/${status}`, { status }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public updateUserProfileImage(userId: string, imageFile: File): Observable<ApiResponse<User>> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    return this.apiService.protectedUploadPatch<ApiResponse<User>>(`/admin/users/${userId}/profile-image`, formData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public sendUserPasswordReset(userId: string, confirm: string = 'CONFIRM'): Observable<ApiResponse<any>> {
    return this.apiService.protectedPost<ApiResponse<any>>(`/admin/users/${userId}/password-reset`, { confirm }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  // ================= ADMIN CUSTOMER MANAGEMENT (ALIASES) =================

  public getCustomers(params: UserQuery): Observable<PaginatedResponse<User>> {
    return this.getUsers(params);
  }

  public getCustomerById(customerId: string): Observable<ApiResponse<User>> {
    return this.getUserById(customerId);
  }

  public createCustomer(customerData: AdminCreateUserDTO): Observable<ApiResponse<User>> {
    return this.createUser({
      ...customerData,
     
    });
  }

  public updateCustomer(customerId: string, customerData: AdminUpdateUserDTO): Observable<ApiResponse<User>> {
    return this.updateUser(customerId, customerData);
  }

  public statusUpdateCustomer(id: string, status: string): Observable<ApiResponse<User>> {
    return this.statusUpdateUser(id, status);
  }

  public updateCustomerProfileImage(customerId: string, imageFile: File): Observable<ApiResponse<User>> {
    return this.updateUserProfileImage(customerId, imageFile);
  }

  public sendCustomerPasswordReset(customerId: string, confirm: string = 'CONFIRM'): Observable<ApiResponse<any>> {
    return this.sendUserPasswordReset(customerId, confirm);
  }

  public registerUser(userData: RegisterUserRequest): Observable<ApiResponse<RegisterUserResponse>> {
    return this.apiService.post<ApiResponse<RegisterUserResponse>>('/auth/register', userData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public activateAccount(token: string): Observable<ApiResponse<any>> {
    return this.apiService.post<ApiResponse<any>>(`/auth/activate-account/${token}`, {}).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
}
