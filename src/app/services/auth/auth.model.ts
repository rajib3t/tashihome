import { User } from "../user/user.model";

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}


export interface LoginResponse {
    
    user: User;

    token: {
        token: string;
        type: string;
    }
}


export interface RefreshTokenResponseData {
  
    token: string;
    type: string;
  
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
    confirm_password: string;
}

