import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import { PropertySetupSteps } from './property-setup-steps.model';

@Injectable({
  providedIn: 'root'
})
export class PropertySetupStepsService {
  private readonly apiService = inject(ApiService);

  getVendorSetupSteps(propertyId: string): Observable<ApiResponse<PropertySetupSteps>> {
    return this.apiService.protectedGet<ApiResponse<PropertySetupSteps>>(`/vendor/properties/${propertyId}/setup-steps`).pipe(
      map((res) => res.data),
      catchError(this.apiService.passthroughError)
    );
  }

  getAdminSetupSteps(propertyId: string): Observable<ApiResponse<PropertySetupSteps>> {
    return this.apiService.protectedGet<ApiResponse<PropertySetupSteps>>(`/admin/properties/${propertyId}/setup-steps`).pipe(
      map((res) => res.data),
      catchError(this.apiService.passthroughError)
    );
  }
}

