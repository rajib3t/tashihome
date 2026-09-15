import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth/auth-guard';
import { adminGuard, adminOnlyGuard, staffGuard, userGuard, vendorGuard } from './guards/auth/role-guard';


export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/public/login/login').then((m) => m.Login),
        title: 'Login',
        canActivate: [guestGuard],
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./pages/public/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'Forgot Password',
    },
    {
        path: 'password-reset',
        loadComponent: () => import('./pages/public/password-reset/password-reset').then((m) => m.PasswordReset),
        title: 'Reset Password',
    },
    {
        path: 'password-reset/:token',
        loadComponent: () => import('./pages/public/password-reset/password-reset').then((m) => m.PasswordReset),
        title: 'Reset Password',
    },
    {
        path: "register",
        loadComponent: () => import('./pages/public/register/register').then((m) => m.Register),
        title: "Register",
    },
    {
        path:'activate-account/:token',
        loadComponent: () => import('./pages/public/activate-account/activate-account').then((m) => m.ActivateAccount),
        title: 'Activate Account',
    },
    {
        path: '',
        loadComponent: () => import('./shared/layouts/public/public').then((m) => m.Public),
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
                loadComponent: () => import('./pages/public/become-host/become-host').then((m) => m.BecomeHost),
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
                path: 'stays/:city_slug',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Stays',
            },
            {
                path: 'stays/:city_slug/:location_slug',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Stays',
            },
            {
                path: 'homestays',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Homestays',
            },
            {
                path: 'homestays/:city_slug',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Homestays',
            },
            {
                path: 'homestays/:city_slug/:location_slug',
                loadComponent: () => import('./pages/public/properties/properties').then((m) => m.Properties),
                title: 'Homestays',
            },
            {
                path: 'experiences',
                loadComponent: () => import('./pages/public/experiences/experiences').then((m) => m.Experiences),
                title: 'Himalayan Experiences & Guest Stories | Tashi Homes',
            },
            {
                path: 'experience',
                redirectTo: 'experiences',
                pathMatch: 'full',
            },
            {
                path: 'locations',
                loadComponent: () => import('./pages/public/locations/locations').then((m) => m.Locations),
                title: 'Himalayan Locations & Hill Villages | Tashi Homes',
            },
            {
                path: 'locations/:slug',
                loadComponent: () => import('./pages/public/locations/locations').then((m) => m.Locations),
                title: 'Verified Homestays by Location | Tashi Homes',
            },
            {
                path: 'location/:slug',
                redirectTo: 'locations/:slug',
                pathMatch: 'full',
            },
            {
                path: 'location',
                redirectTo: 'locations',
                pathMatch: 'full',
            },
            {
                path: 'stays/location/:location_slug',
                redirectTo: 'locations/:location_slug',
                pathMatch: 'full',
            },
            {
                path: 'search',
                loadComponent: () => import('./pages/public/search/search').then((m) => m.Search),
                title: 'Search Homestays',
            },

            {
                path: 'stay',
                redirectTo: 'stays',
                pathMatch: 'full',
            },
            {
                path: 'stay/:slug',
                loadComponent: () => import('./pages/public/properties/property/property').then((m) => m.Property),
                title: 'Property Detail',
            },
            {
                path: 'homestay/:slug',
                loadComponent: () => import('./pages/public/properties/property/property').then((m) => m.Property),
                title: 'Property Detail',
            },
            {
                path: 'checkout',
                loadComponent: () => import('./pages/public/checkout/checkout').then((m) => m.Checkout),
                title: 'Checkout & Reserve',
            },
            {
                path: 'checkout/:slug',
                loadComponent: () => import('./pages/public/checkout/checkout').then((m) => m.Checkout),
                title: 'Checkout & Reserve',
            },
            {
                path: 'stay/:slug/checkout',
                loadComponent: () => import('./pages/public/checkout/checkout').then((m) => m.Checkout),
                title: 'Checkout & Reserve',
            },
            {
                path: 'homestay/:slug/checkout',
                loadComponent: () => import('./pages/public/checkout/checkout').then((m) => m.Checkout),
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
        loadComponent: () => import('./shared/layouts/authenticate/authenticate').then((m) => m.Authenticate),
        children: [
            {
                path: 'admin',
                canActivate: [adminGuard],
                loadComponent: () => import('./shared/layouts/authenticate/admin/admin').then((m) => m.Admin),
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./pages/authenticate/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
                        title: 'Admin Dashboard',
                    },
                    {
                        path: 'profile',
                        loadComponent: () => import('./pages/authenticate/admin/profile/profile').then((m) => m.AdminProfile),
                        title: 'Admin Profile',
                    },
                    {
                        path: 'setting',
                        loadComponent: () => import('./pages/authenticate/admin/setting/setting').then((m) => m.Setting),
                        title: 'Application Setting',
                    },
                    {
                        path: 'settings',
                        redirectTo: 'setting',
                        pathMatch: 'full',
                    },
                    {
                        path: 'settings/taxes',
                        loadComponent: () => import('./pages/authenticate/admin/tax-management/tax-management').then((m) => m.TaxManagement),
                        title: 'Tax & GST Rates',
                    },
                    {
                        path: 'setting/taxes',
                        redirectTo: 'settings/taxes',
                        pathMatch: 'full',
                    },
                    {
                        path: 'tax-management',
                        loadComponent: () => import('./pages/authenticate/admin/tax-management/tax-management').then((m) => m.TaxManagement),
                        title: 'Tax & GST Management',
                    },
                    {
                        path: 'taxes',
                        redirectTo: 'tax-management',
                        pathMatch: 'full',
                    },
                    {
                        path: 'country-management',
                        loadComponent: () => import('./pages/authenticate/admin/country-management/country-management').then((m) => m.CountryManagement),
                        title: 'Country Management',
                    },
                    {
                        path: 'city-management',
                        loadComponent: () => import('./pages/authenticate/admin/city-management/city-management').then((m) => m.CityManagement),
                        title: 'City Management',
                    },
                    {
                        path: 'location-management',
                        loadComponent: () => import('./pages/authenticate/admin/location-management/location-management').then((m) => m.LocationManagement),
                        title: 'Location Management',
                    },
                    {
                        path: 'facility-management',
                        loadComponent: () => import('./pages/authenticate/admin/facility-management/facility-management').then((m) => m.FacilityManagement),
                        title: 'Facility Management'
                    },
                    {
                        path: 'amenity-management',
                        loadComponent: () => import('./pages/authenticate/admin/amenity-management/amenity-management').then((m) => m.AmenityManagement),
                        title: 'Amenity Management'
                    },
                    {
                        path: 'room-type-management',
                        loadComponent: () => import('./pages/authenticate/admin/room-type-management/room-type-management').then((m) => m.RoomTypeManagement),
                        title: 'Room Type Management'
                    },
                    {
                        path: 'property-management',
                        loadComponent: () => import('./pages/authenticate/admin/property-management/property-management').then((m) => m.PropertyManagement),
                        title: 'Property Management'
                    },
                    {
                        path: 'property-management/create',
                        loadComponent: () => import('./pages/authenticate/admin/property-management/create-property/create-property').then((m) => m.CreateProperty),
                        title: 'Create Property'
                    },
                    {
                        path: 'property-management/:id/edit',
                        loadComponent: () => import('./pages/authenticate/admin/property-management/edit-property/edit-property').then((m) => m.EditProperty),
                        title: 'Edit Property'
                    },
                    {
                        path: 'customer-management',
                        loadComponent: () => import('./pages/authenticate/admin/customer-management/customer-management').then((m) => m.CustomerManagement),
                        title: 'Customer Management'
                    },
                    {
                        path: 'customer-management/:id/edit',
                        loadComponent: () => import('./pages/authenticate/admin/customer-management/edit-customer/edit-customer').then((m) => m.EditCustomer),
                        title: 'Edit Customer'
                    },
                    {
                        path: 'user-management',
                        redirectTo: 'customer-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'vendor-management',
                        loadComponent: () => import('./pages/authenticate/admin/vendor-management/vendor-management').then((m) => m.VendorManagement),
                        title: 'Vendor Management'
                    },
                    {
                        path: 'vendor-management/:id/edit',
                        loadComponent: () => import('./pages/authenticate/admin/vendor-management/edit-vendor/edit-vendor').then((m) => m.EditVendor),
                        title: 'Edit Vendor'
                    },
                    {
                        path: 'host-management',
                        loadComponent: () => import('./pages/authenticate/admin/host-management/host-management').then((m) => m.HostManagement),
                        title: 'Host Applications'
                    },
                    {
                        path: 'host-requests',
                        redirectTo: 'host-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'booking-management',
                        loadComponent: () => import('./pages/authenticate/admin/booking-management/booking-management').then((m) => m.AdminBookingManagement),
                        title: 'Booking Management'
                    },
                    {
                        path: 'room-blocks',
                        loadComponent: () => import('./pages/authenticate/admin/room-block-management/room-block-management').then((m) => m.AdminRoomBlockManagement),
                        title: 'Room Blocks & Availability'
                    },
                    {
                        path: 'room-block-management',
                        redirectTo: 'room-blocks',
                        pathMatch: 'full'
                    },
                    {
                        path: 'review-management',
                        loadComponent: () => import('./pages/authenticate/admin/review-management/review-management').then((m) => m.AdminReviewManagement),
                        title: 'Review Moderation'
                    },
                    {
                        path: 'reviews',
                        redirectTo: 'review-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'testimonial-management',
                        loadComponent: () => import('./pages/authenticate/admin/testimonial-management/testimonial-management').then((m) => m.AdminTestimonialManagement),
                        title: 'Testimonial Moderation'
                    },
                    {
                        path: 'testimonials',
                        redirectTo: 'testimonial-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'staff-management',
                        canActivate: [adminOnlyGuard],
                        loadComponent: () => import('./pages/authenticate/admin/staff-management/staff-management').then((m) => m.StaffManagement),
                        title: 'Staff Management'
                    },
                    {
                        path: 'staff-management/:id/edit',
                        canActivate: [adminOnlyGuard],
                        loadComponent: () => import('./pages/authenticate/admin/staff-management/edit-staff/edit-staff').then((m) => m.EditStaff),
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
                        loadComponent: () => import('./pages/authenticate/admin/refund-management/refund-management').then((m) => m.RefundManagement),
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
                        loadComponent: () => import('./pages/authenticate/admin/payout-management/payout-management').then((m) => m.PayoutManagement),
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
                loadComponent: () => import('./shared/layouts/authenticate/vendor/vendor').then((m) => m.Vendor),
                children:[
                    {
                        path:'',
                        loadComponent: () => import('./pages/authenticate/vendor/dashboard/dashboard').then((m) => m.Dashboard),
                        title:'Vendor Dashboard'
                    },
                    {
                        path: 'profile',
                        loadComponent: () => import('./pages/authenticate/vendor/profile/profile').then((m) => m.VendorProfile),
                        title: 'Vendor Profile'
                    },
                    {
                        path:'property-management',
                        loadComponent: () => import('./pages/authenticate/vendor/vendor-property-management/vendor-property-management').then((m) => m.VendorPropertyManagement),
                        title:'Vendor Property Management'
                    },
                    {
                        path:'property-management/create',
                        loadComponent: () => import('./pages/authenticate/vendor/vendor-property-management/create-property/create-property').then((m) => m.CreateVendorProperty),
                        title:'Create Property'
                    },
                    {
                        path:'property-management/:id/edit',
                        loadComponent: () => import('./pages/authenticate/vendor/vendor-property-management/edit-property/edit-property').then((m) => m.EditVendorProperty),
                        title:'Edit Property'
                    },
                    {
                        path: 'booking-management',
                        loadComponent: () => import('./pages/authenticate/vendor/booking-management/booking-management').then((m) => m.VendorBookingManagement),
                        title: 'Booking Management'
                    },
                    {
                        path: 'room-blocks',
                        loadComponent: () => import('./pages/authenticate/vendor/room-block-management/room-block-management').then((m) => m.VendorRoomBlockManagement),
                        title: 'Room Blocks & Availability'
                    },
                    {
                        path: 'room-block-management',
                        redirectTo: 'room-blocks',
                        pathMatch: 'full'
                    },
                    {
                        path: 'review-management',
                        loadComponent: () => import('./pages/authenticate/vendor/review-management/review-management').then((m) => m.VendorReviewManagement),
                        title: 'Host Reviews & Ratings'
                    },
                    {
                        path: 'reviews',
                        redirectTo: 'review-management',
                        pathMatch: 'full'
                    },
                    {
                        path: 'testimonial-management',
                        loadComponent: () => import('./pages/authenticate/vendor/testimonial-management/testimonial-management').then((m) => m.VendorTestimonialManagement),
                        title: 'Host Stories & Testimonials'
                    },
                    {
                        path: 'testimonials',
                        redirectTo: 'testimonial-management',
                        pathMatch: 'full'
                    }
                ]
            },
            {
                path: 'profile',
                redirectTo: 'user',
                pathMatch: 'full',
            },
            {
                path: 'profile/:tab',
                redirectTo: 'user/:tab',
                pathMatch: 'full',
            },
            {
                path: 'user',
                canActivate: [userGuard],
                loadComponent: () => import('./shared/layouts/authenticate/user/user').then((m) => m.User),
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./pages/authenticate/user/profile/profile').then((m) => m.Profile),
                        title: 'Your Profile',
                    },
                    {
                        path: 'profile',
                        redirectTo: '',
                        pathMatch: 'full',
                    },
                    {
                        path: 'profile/:tab',
                        redirectTo: ':tab',
                        pathMatch: 'full',
                    },
                    {
                        path: ':tab',
                        loadComponent: () => import('./pages/authenticate/user/profile/profile').then((m) => m.Profile),
                        title: 'Your Profile',
                    }
                ]
            }
        ]
    }
];
