import { Routes } from '@angular/router';
import { Public } from './shared/layouts/public/public';
import { Login } from './pages/public/login/login';
import { authGuard, guestGuard } from './guards/auth/auth-guard';
import { Authenticate } from './shared/layouts/authenticate/authenticate';
import { adminGuard, adminOnlyGuard, staffGuard, userGuard, vendorGuard } from './guards/auth/role-guard';
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
import { CustomerManagement } from './pages/authenticate/admin/customer-management/customer-management';
import { EditCustomer } from './pages/authenticate/admin/customer-management/edit-customer/edit-customer';
import { PropertyManagement } from './pages/authenticate/admin/property-management/property-management';
import { CreateProperty } from './pages/authenticate/admin/property-management/create-property/create-property';
import { EditProperty } from './pages/authenticate/admin/property-management/edit-property/edit-property';
import { Property } from './pages/public/properties/property/property';

import { Search } from './pages/public/search/search';
import { BecomeHost } from './pages/public/become-host/become-host';
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
import { Checkout } from './pages/public/checkout/checkout';
import { AdminBookingManagement } from './pages/authenticate/admin/booking-management/booking-management';
import { VendorBookingManagement } from './pages/authenticate/vendor/booking-management/booking-management';
import { RefundManagement } from './pages/authenticate/admin/refund-management/refund-management';
import { HostManagement } from './pages/authenticate/admin/host-management/host-management';
import { StaffManagement } from './pages/authenticate/admin/staff-management/staff-management';
import { EditStaff } from './pages/authenticate/admin/staff-management/edit-staff/edit-staff';
import { PayoutManagement } from './pages/authenticate/admin/payout-management/payout-management';

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
                loadComponent: () => import('./pages/public/home/home').then((m) => m.Home),
                title: 'Home',
            },
            {
                path: 'home',
                redirectTo: '',
                pathMatch: 'full',
            },
            {
                path: 'our-story',
                loadComponent: () => import('./pages/public/story/story').then((m) => m.Story),
                title: 'Our Story',
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
                path: 'become-a-host',
                component: BecomeHost,
                title: 'Become a Host',
            },
            {
                path: 'become-host',
                redirectTo: 'become-a-host',
                pathMatch: 'full',
            },
            {
                path: 'stays',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Stays',
            },
            {
                path: 'search',
                component: Search,
                title: 'Search Homestays',
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
            },
            {
                path: 'checkout',
                component: Checkout,
                title: 'Checkout & Reserve',
            },
            {
                path: 'checkout/:slug',
                component: Checkout,
                title: 'Checkout & Reserve',
            },
            {
                path: 'stay/:slug/checkout',
                component: Checkout,
                title: 'Checkout & Reserve',
            },
            {
                path: 'terms',
                loadComponent: () => import('./pages/public/legal/legal').then((m) => m.Legal),
                title: 'Terms of Service — Guests | Tashi Homes',
                data: { tab: 'terms' }
            },
            {
                path: 'terms-and-conditions',
                redirectTo: 'terms',
                pathMatch: 'full'
            },
            {
                path: 'host-agreement',
                loadComponent: () => import('./pages/public/legal/legal').then((m) => m.Legal),
                title: 'Homestay Partner (Host) Agreement | Tashi Homes',
                data: { tab: 'host-agreement' }
            },
            {
                path: 'partner-agreement',
                redirectTo: 'host-agreement',
                pathMatch: 'full'
            },
            {
                path: 'privacy-policy',
                loadComponent: () => import('./pages/public/legal/legal').then((m) => m.Legal),
                title: 'Privacy Policy | Tashi Homes',
                data: { tab: 'privacy' }
            },
            {
                path: 'privacy',
                redirectTo: 'privacy-policy',
                pathMatch: 'full'
            },
            {
                path: 'refund-policy',
                loadComponent: () => import('./pages/public/legal/legal').then((m) => m.Legal),
                title: 'Cancellation & Refund Policy | Tashi Homes',
                data: { tab: 'refund' }
            },
            {
                path: 'cancellation-policy',
                redirectTo: 'refund-policy',
                pathMatch: 'full'
            },
            {
                path: 'cancellation-refund-policy',
                redirectTo: 'refund-policy',
                pathMatch: 'full'
            },
            {
                path: 'legal',
                loadComponent: () => import('./pages/public/legal/legal').then((m) => m.Legal),
                title: 'Legal Policies & Platform Terms | Tashi Homes',
                data: { tab: 'all' }
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
                        path: 'customer-management',
                        component: CustomerManagement,
                        title: 'Customer Management'
                    },
                    {
                        path: 'customer-management/:id/edit',
                        component: EditCustomer,
                        title: 'Edit Customer'
                    },
                    {
                        path: 'user-management',
                        redirectTo: 'customer-management',
                        pathMatch: 'full'
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
                    },
                    {
                        path: 'host-management',
                        component: HostManagement,
                        title: 'Host Applications'
                    },
                    {
                        path: 'host-requests',
                        redirectTo: 'host-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'booking-management',
                        component: AdminBookingManagement,
                        title: 'Booking Management'
                    },
                    {
                        path: 'staff-management',
                        canActivate: [adminOnlyGuard],
                        component: StaffManagement,
                        title: 'Staff Management'
                    },
                    {
                        path: 'staff-management/:id/edit',
                        canActivate: [adminOnlyGuard],
                        component: EditStaff,
                        title: 'Edit Staff'
                    },
                    {
                        path: 'staffs',
                        redirectTo: 'staff-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'refund-management',
                        canActivate: [adminOnlyGuard],
                        component: RefundManagement,
                        title: 'Refund Management'
                    },
                    {
                        path: 'finance/refunds',
                        redirectTo: 'refund-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'finance/payouts',
                        canActivate: [adminOnlyGuard],
                        component: PayoutManagement,
                        title: 'Payout Management'
                    },
                    {
                        path: 'payout-management',
                        redirectTo: 'finance/payouts',
                        pathMatch: 'full'
                    },
                    {
                        path: 'payouts',
                        redirectTo: 'finance/payouts',
                        pathMatch: 'full'
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
                    },
                    {
                        path: 'booking-management',
                        component: VendorBookingManagement,
                        title: 'Booking Management'
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
