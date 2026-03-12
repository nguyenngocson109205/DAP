// định nghĩa những gì mà người dùng gửi lên 
// định nghĩa nên là interface

import { ParsedQs } from 'qs'

export interface RegisterReqBody {
    email: string,
    name: string,
    password: string,
    confirm_password: string,
    date_of_birth: string
}

export interface LoginReqBody {
    email: string,
    password: string
}

export interface LogoutReqBody {
    refresh_token: string
}

export interface TokePayLoad {
    user_id: string
    token_type: TouchType
}

export interface EmailVerifyRequestQuery extends ParsedQs {
    email_verify_token: string
}

export interface forgotPasswordReqBody {
    email: string
}

export interface VerifyForgotPasswordTokenReqBody {
    forgot_password_token: string
}

export interface ResetPasswordReqBody {
    password: string,
    confirm_password: string,
    forgot_password_token: string

}

export interface UpdateMeReqBody {
    name?: string
    date_of_birth?: string
    bio?: string // optional
    location?: string // optional
    website?: string // optional
    username?: string // optional
    avatar?: string // optional
    cover_photo?: string // optional}
}

export interface ChangePasswordReqBody {
    old_password: string,
    password: string,
    confirm_password: string
}
export interface RefreshTokenReqBody {
    refresh_token: string
}