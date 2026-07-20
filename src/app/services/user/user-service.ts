import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map, Observable , throwError} from 'rxjs';
import { ApiResponse } from '../api/api-response.model';
import { User } from './user.model';

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
}
