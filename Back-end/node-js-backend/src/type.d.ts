import { TokePayLoad } from "./models/request/User.request";

declare module "express" {
    interface Request {
        decoded_authorization?: TokePayLoad
        decoded_refresh_token?: TokePayLoad
        decoded_email_verify_token?: TokePayLoad
        decoded_forgot_password_token?: TokePayLoad
    }

}