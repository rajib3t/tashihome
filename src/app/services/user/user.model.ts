
export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    status: string;
    role: UserRole;
    is_profile_image_url: string;
}

export type UserRole = 'user' | 'admin' | 'vendor';
