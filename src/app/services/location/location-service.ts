import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { LocationRequest, LocationResponse } from './location-model';
import { Observable } from 'rxjs';
import { map, catchError } from "rxjs/operators";
import { ApiResponse } from '../api/api-response.model';
@Service()
export class LocationService {
    public readonly apiService = inject(ApiService);


    public createLocation(location: LocationRequest): Observable<ApiResponse<LocationResponse>> {
            return this.apiService.protectedPost<ApiResponse<LocationResponse>>('/locations/', location).pipe(
                map(response => response.data),
                catchError(this.apiService.passthroughError)
            )
        }
   
}

