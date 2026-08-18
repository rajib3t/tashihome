import { Routes } from '@angular/router';
import { Public } from './shared/layouts/public/public';
import { Home } from './pages/public/home/home';
import { Login } from './pages/public/login/login';
import { authGuard } from './guards/auth/auth-guard';
import { Authenticate } from './shared/layouts/authenticate/authenticate';
import { adminGuard, userGuard } from './guards/auth/role-guard';
import { Admin } from './shared/layouts/authenticate/admin/admin';
import { AdminDashboard } from './pages/authenticate/admin/admin-dashboard/admin-dashboard';
import { Setting } from './pages/authenticate/admin/setting/setting';
import { CountryManagement } from './pages/authenticate/admin/country-management/country-management';
import { CityManagement } from './pages/authenticate/admin/city-management/city-management';
import { LocationManagement } from './pages/authenticate/admin/location-management/location-management';
import { FacilityManagement } from './pages/authenticate/admin/facility-management/facility-management';
import { AmenityManagement } from './pages/authenticate/admin/amenity-management/amenity-management';
import { RoomTypeManagement } from './pages/authenticate/admin/room-type-management/room-type-management';
import { VendorManagement } from './pages/authenticate/admin/vendor-management/vendor-management';
import { EditVendor } from './pages/authenticate/admin/vendor-management/edit-vendor/edit-vendor';
import { PropertyManagement } from './pages/authenticate/admin/property-management/property-management';
import { CreateProperty } from './pages/authenticate/admin/property-management/create-property/create-property';
import { EditProperty } from './pages/authenticate/admin/property-management/edit-property/edit-property';
import { Property } from './pages/public/properties/property/property';
import { Properties } from './pages/public/properties/properties';
import { Register } from './pages/public/register/register';
import { ActiveAccount } from './pages/public/active-account/active-account';
import { ForgotPassword } from './pages/public/forgot-password/forgot-password';
import { PasswordReset } from './pages/public/password-reset/password-reset';
import { Profile as ProfileUser } from './pages/authenticate/user/profile/profile'
import { User } from './shared/layouts/authenticate/user/user';

export const routes: Routes = [
    {
        path: 'login',
        component: Login,
        title: 'Login',
    },
    {
        path: "register",
        component: Register,
        title: "Register",
    },
    {
        path: 'forgot-password',
        component: ForgotPassword,
        title: 'Forgot Password',
    },
    {
        path: 'password-reset',
        component: PasswordReset,
        title: 'Reset Password',
    },
    {
        path: 'password-reset/:token',
        component: PasswordReset,
        title: 'Reset Password',
    },
    {
        path: 'reset-password',
        component: PasswordReset,
        title: 'Reset Password',
    },
    {
        path: 'reset-password/:token',
        component: PasswordReset,
        title: 'Reset Password',
    },
    {
        path: 'active-account',
        component: ActiveAccount,
        title: 'Activate Account',
    },
    {
        path: 'active-account/:token',
        component: ActiveAccount,
        title: 'Activate Account',
    },
    {
        path: 'activate-account',
        component: ActiveAccount,
        title: 'Activate Account',
    },
    {
        path: 'activate-account/:token',
        component: ActiveAccount,
        title: 'Activate Account',
    },
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
                path: 'home',
                redirectTo: '',
                pathMatch: 'full',
            },
            {
                path: 'stays',
                component: Properties,
                title: 'Property Management',
            },

            {
                path: 'stay',
                redirectTo: '',
                pathMatch: 'full',
            },
            {
                path: 'stay/:slug',
                component: Property,
                title: 'Property Detail',
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
                        path: 'facility-management',
                        component: FacilityManagement,
                        title: 'Facility Management'
                    },
                    {
                        path: 'amenity-management',
                        component: AmenityManagement,
                        title: 'Amenity Management'
                    },
                    {
                        path: 'room-type-management',
                        component: RoomTypeManagement,
                        title: 'Room Type Management'
                    },
                    {
                        path: 'property-management',
                        component: PropertyManagement,
                        title: 'Property Management'
                    },
                    {
                        path: 'property-management/create',
                        component: CreateProperty,
                        title: 'Create Property'
                    },
                    {
                        path: 'property-management/:id/edit',
                        component: EditProperty,
                        title: 'Edit Property'
                    },
                    {
                        path: 'vendor-management',
                        component: VendorManagement,
                        title: 'Vendor Management'
                    },
                    {
                        path: 'vendor-management/:id/edit',
                        component: EditVendor,
                        title: 'Edit Vendor'
                    }
                ]
            },
            {
                path: 'profile',
                component: User,
                children: [
                    {
                        path: '',
                        component: ProfileUser,
                        title: 'Profile'
                    }
                ]
            }
        ]
    }
];
