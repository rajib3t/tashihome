import { Routes } from '@angular/router';
import { Public } from './shared/layouts/public/public';
import { Home } from './pages/public/home/home';
import { Login } from './pages/public/login/login';
import { authGuard, guestGuard } from './guards/auth/auth-guard';
import { Authenticate } from './shared/layouts/authenticate/authenticate';
import { adminGuard, userGuard, vendorGuard } from './guards/auth/role-guard';
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
import { Story } from './pages/public/story/story';
import { Register } from './pages/public/register/register';
import { ActivateAccount } from './pages/public/activate-account/activate-account';
import { ForgotPassword } from './pages/public/forgot-password/forgot-password';
import { PasswordReset } from './pages/public/password-reset/password-reset';
import { User as UserLayout } from './shared/layouts/authenticate/user/user';
import { Profile } from './pages/authenticate/user/profile/profile';
import { AdminProfile } from './pages/authenticate/admin/profile/profile';
import { VendorProfile } from './pages/authenticate/vendor/profile/profile';
import { Vendor } from './shared/layouts/authenticate/vendor/vendor';
import { Dashboard } from './pages/authenticate/vendor/dashboard/dashboard';
import { VendorPropertyManagement } from './pages/authenticate/vendor/vendor-property-management/vendor-property-management';
import { CreateVendorProperty } from './pages/authenticate/vendor/vendor-property-management/create-property/create-property';
import { EditVendorProperty } from './pages/authenticate/vendor/vendor-property-management/edit-property/edit-property';


export const routes: Routes = [
    {
        path: 'login',
        component: Login,
        title: 'Login',
        canActivate: [guestGuard],
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
        path: "register",
        component: Register,
        title: "Register",
    },
    {
        path:'activate-account/:token',
        component: ActivateAccount,
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
                path: 'our-story',
                component: Story,
                title: 'Our Story - Tashihomes',
            },
            {
                path: 'story',
                redirectTo: 'our-story',
                pathMatch: 'full',
            },
            {
                path: 'brand-story',
                redirectTo: 'our-story',
                pathMatch: 'full',
            },
            {
                path: 'stays',
                component: Properties,
                title: 'Stays - Tashihomes',
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
                        path: 'profile',
                        component: AdminProfile,
                        title: 'Admin Profile',
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
                path:'vendor',
                canActivate: [vendorGuard],
                component: Vendor,
                children:[
                    {
                        path:'',
                        component:Dashboard,
                        title:'Vendor Dashboard'
                    },
                    {
                        path: 'profile',
                        component: VendorProfile,
                        title: 'Vendor Profile'
                    },
                    {
                        path:'property-management',
                        component:VendorPropertyManagement,
                        title:'Vendor Property Management'
                    },
                    {
                        path:'property-management/create',
                        component:CreateVendorProperty,
                        title:'Create Property'
                    },
                    {
                        path:'property-management/:id/edit',
                        component:EditVendorProperty,
                        title:'Edit Property'
                    }
                ]
            },
            {
                path: 'profile',
                redirectTo: 'user',
                pathMatch: 'full',
            },
            {
                path: 'user',
                canActivate: [userGuard],
                component: UserLayout,
                children: [
                    {
                        path: '',
                        component: Profile,
                        title: 'Your Profile',
                    },
                    {
                        path: 'profile',
                        redirectTo: '',
                        pathMatch: 'full',
                    }
                ]
            }
        ]
    }
];
