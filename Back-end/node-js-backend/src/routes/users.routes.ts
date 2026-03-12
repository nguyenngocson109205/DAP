import express from 'express'
import { changePasswordController, chatController, emailVerifyController, forgotPasswordController, getMeController, loginController, logoutController, refreshTokenController, registerController, rendEmailVerifyTokenController, resetPasswordController, updateMeController, verifyForgotPasswordController, } from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.midderwares'
import { accessTokenValidator, changePasswordValidator, emailVerifyTokenValidator, forgotPasswordTokenValidator, forgotPasswordValidator, loginValidator, refreshTokenValidator, registerValidator, resetPasswordValidator, updateMeValidator } from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/request/User.request'
import { wraperAsync } from '~/utils/handler'
const userRouter = express.Router()


/*login
path: /users/login
method: POST
có 4 thuộc tính: (header, body, keystring, paramstring)
body: {email, password}
 */

userRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wraperAsync(logoutController))

userRouter.post('/login', loginValidator, wraperAsync(loginController))

/*register
path: user/register
method: post
body{
    email: string,
    name: string,
    password: string,
    confirm_password: string,
    data_of_birth: ISO8601,
}
*/

userRouter.post(
    "/register",
    registerValidator,
    wraperAsync(registerController),
)/*Logout
path: /users/logout
method: POST
headers:{
    Authorization: 'Bearer <access_token>'
body:{
    refresh_token: string,
}

*/

/*verify-email
khi người dùng vào link trong email sẽ lập tức gửi token trong route này 
mình sẽ verify token thông qua link này và verify người dùng 
path: /users/verify-email/?email_verify_token=string

*/

userRouter.get(
    '/verify-email/',
    emailVerifyTokenValidator,
    wraperAsync(emailVerifyController)
)

/*Resend email verify token 
des: khgi người dùng k nhận đc email verify token có thể gửi lại 
path: /users/resend-verify-email
method: POST
headers: {
    Authorization: 'Bearer access_token'
}
*/
userRouter.post(
    "/resend-verify-email",
    accessTokenValidator,
    wraperAsync(rendEmailVerifyTokenController)
)

/* Forgot password
des: khi người dùng quên mk có thể gửi yêu cầu đặt lại mk, ta sẽ gửi email có chứa link đặt lại mk
path: /users/forgot-password
method: POST
body: {
    email: string
}
*/
userRouter.post(
    "/forgot-password",
    forgotPasswordValidator,
    wraperAsync(forgotPasswordController)
)
/*  verify forgot password
des: khi người dùng vào mail click vào link để verify, họ sẽ gửi
forgot_password_token cho frontend, froned sẽ gửi token này lên 
sever để verify nếu oke thì hiển thị form nhập mk mới
path: /users\verify-forgot-password
method: POST
body:{
    "email"
}
*/


userRouter.post('/verify-forgot-password',
    forgotPasswordTokenValidator,
    wraperAsync(verifyForgotPasswordController)
)

/* Reset password
des: Frontend sẽ gửi mật khẩu và confimd_passwornd, kèm với forgot_password_token
lên cho backend tiến hành xác thực và đổi mật khẩu 
path: /users/reset-password
method: POST
body:{
    forgot_password_token: string,
    password: string,
    confirm_password: string
}
*/

userRouter.post('/reset-password',
    forgotPasswordTokenValidator, // hàm kiểm tra mã
    resetPasswordValidator, // hàm kiểm tra mk và confirm_password
    wraperAsync(resetPasswordController)
)

/* get-me

*/

userRouter.post('/me',
    accessTokenValidator,
    wraperAsync(getMeController)
)

/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
    name?: string
    date_of_birth?: Date
    bio?: string // optional
    location?: string // optional
    website?: string // optional
    username?: string // optional
    avatar?: string // optional
    cover_photo?: string // optional}
*/

userRouter.patch(
    "/me",
    filterMiddleware<UpdateMeReqBody>([
        'name',
        'date_of_birth',
        'bio',
        'location',
        'website',
        'username',
        'avatar',
        'cover_photo'
    ]),
    accessTokenValidator,
    updateMeValidator,
    wraperAsync(updateMeController)
)
/*desc: change password
method: put
headers: 
{Authorization: Bearer <access_token>}
body:{
    old_password: string,
    password: string,
    confirm_password: string
}
*/

userRouter.put('/change-password',
    accessTokenValidator,
    changePasswordValidator,
    wraperAsync(changePasswordController)
)

/*Refresh token
khi access token hết hạn, client sẽ dùng refresh token để lấy access token mới
path: /users/refresh-token
method: POST
body:{
    refresh_token: string
}

*/

userRouter.post('/refresh-token',
    refreshTokenValidator,
    wraperAsync(refreshTokenController)
)

userRouter.post('/chat', accessTokenValidator, refreshTokenValidator,
    wraperAsync(chatController)
)


export default userRouter


