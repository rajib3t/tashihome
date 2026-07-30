import { Routes } from '@angular/router';
import { Public } from './shared/layouts/public/public';
import { Home } from './pages/public/home/home';
import { Login } from './pages/public/login/login';
import { authGuard } from './guards/auth/auth-guard';
import { Authenticate } from './shared/layouts/authenticate/authenticate';
import { adminGuard } from './guards/auth/role-guard';
import { Admin } from './shared/layouts/authenticate/admin/admin';
import { AdminDashboard } from './pages/authenticate/admin/admin-dashboard/admin-dashboard';
import { Setting } from './pages/authenticate/admin/setting/setting';
import { CountryManagement } from './pages/authenticate/admin/country-management/country-management';
import { CityManagement } from './pages/authenticate/admin/city-management/city-management';
import { LocationManagement } from './pages/authenticate/admin/location-management/location-management';
import { FacilityManagement } from './pages/authenticate/admin/facility-management/facility-management';

export const routes: Routes = [
    {
        path: '',
        component: Public,
        children: [
            {
                path: '',
                component: Home,
                title: 'Home',
            },
            {
                path: 'login',
                component: Login,
                title: 'Login',
            }
        ]
    },
    {
        path: '',
        canActivateChild: [authGuard],
        component: Authenticate,
        children: [
            {
                path: 'admin',
                canActivate: [adminGuard],
                component: Admin,
                children: [
                    {
                        path: '',
                        component: AdminDashboard,
                        title: 'Admin Dashboard',
                    },
                    {
                        path: 'setting',
                        component: Setting,
                        title: 'Application Setting',
                    },
                    {
                        path: 'country-management',
                        component: CountryManagement,
                        title: 'Country Management',
                    },
                    {
                        path: 'city-management',
                        component: CityManagement,
                        title: 'City Management',
                    },
                    {
                        path: 'location-management',
                        component: LocationManagement,
                        title: 'Location Management',
                    },
                    {
                        path:'facility-management',
                        component:FacilityManagement,
                        title:'Facility Management'
                    }
                ]
            }
        ]
    }
];
