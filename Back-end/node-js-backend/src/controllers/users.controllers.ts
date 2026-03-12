import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import userServices from '~/services/users.services';
import { NextFunction, ParamsDictionary } from "express-serve-static-core"
import { ChangePasswordReqBody, EmailVerifyRequestQuery, forgotPasswordReqBody, LoginReqBody, LogoutReqBody, RefreshTokenReqBody, RegisterReqBody, ResetPasswordReqBody, TokePayLoad, UpdateMeReqBody, VerifyForgotPasswordTokenReqBody } from '~/models/request/User.request';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Error';
import { USERS_MESSAGES } from '~/constants/message';
import { UserVerifyStatus } from '~/constants/enums';
import { result } from 'lodash';
import databaseServices from '~/services/database.services';
import chatServices from '~/services/chat.services';

export const loginController = async (
    req: Request<ParamsDictionary, any, LoginReqBody>,
    res: Response
) => {
    // body có email và password
    // lên sever kiểm tra email và password có khớp không, nếu hớp
    let result = await userServices.login(req.body)
    // thì gửi lại ac và è để duy trì đăng nhập

    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.LOGIN_SUCCESS,
        result // ac và rf để duy trì đăng nhập
    })
};
export const registerController = async (

    req: Request<ParamsDictionary, any, RegisterReqBody>,
    res: Response,
    next: NextFunction) => {
    // kiểm tra tính đúng của dữ liệu liên quan đến database 
    //   *** ở controller dữ liệu sạch và đủ ***    
    // kiểm tra email này đã có người sử dụng chưa
    const isExisted = await userServices.checkEmailExist(req.body.email)
    if (isExisted) {
        throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
            message: 'Email has been used'
        })
    }

    // tạo user mới trên database 
    const result = await userServices.register(req.body)
    // response đóng gói kết quả 
    console.log(result);

    return res.status(HTTP_STATUS.OK).json({
        message: 'register successfully',
        result
    })
};

export const logoutController = async (
    req: Request<ParamsDictionary, any, LogoutReqBody>,
    res: Response
) => {
    const { user_id: user_id_ac } = req.decoded_authorization as TokePayLoad
    const { user_id: user_id_rf } = req.decoded_refresh_token as TokePayLoad
    if (user_id_ac !== user_id_rf) {
        throw new ErrorWithStatus({
            status: HTTP_STATUS.UNAUTHORIZED,
            message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
        })
    }
    // kiểm tra còn trên hệ thống không 

    const { refresh_token } = req.body

    await userServices.checkRefreshToken({
        user_id: user_id_rf,
        refresh_token
    })

    await userServices.logout(refresh_token)

    // nếu bth thì mình xóa
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.LOGOUT_SUCCESS
    })
}

export const emailVerifyController = async (
    req: Request<ParamsDictionary, any, any, EmailVerifyRequestQuery>,
    res: Response
) => {
    const { email_verify_token } = req.query
    const { user_id } = req.decoded_email_verify_token as TokePayLoad

    //kiểm tra xem user có còn sở hữu email_verify_token này không
    await userServices.checkEmailVerifyToken({ user_id, email_verify_token })
    // nếu có thì đổi trạng thái verified của user account 
    await userServices.verifyEmail(user_id)
    // nếu oke hết thì 
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS
    })
}
export const rendEmailVerifyTokenController = async (
    req: Request,
    res: Response
) => {
    const { user_id } = req.decoded_authorization as TokePayLoad
    const verifyStatus = await userServices.getUserVerifyStatus(user_id)
    // nếu mà trạng thái hiện tại đã verify thì xin làm dell gì
    if (verifyStatus == UserVerifyStatus.Verified) {
        return res.status(HTTP_STATUS.OK).json({
            message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
        })
    }
    if (verifyStatus == UserVerifyStatus.Banned) {
        return res.status(HTTP_STATUS.OK).json({
            message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
        })
    }
    // nếu chưa verify thì gửi mã 
    if (verifyStatus == UserVerifyStatus.Unverified) {
        userServices.rendEmailVerifyToken(user_id)
        return res.status(HTTP_STATUS.OK).json({
            message: USERS_MESSAGES.CHECK_YOUR_EMAIL
        })
    }
}
export const forgotPasswordController = async (
    req: Request<ParamsDictionary, any, forgotPasswordReqBody>,
    res: Response
) => {
    const { email } = req.body
    // kiểm tra email có tồn tại không
    const isExisted = await userServices.checkEmailExist(email)
    if (!isExisted) {
        throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
            message: USERS_MESSAGES.USER_NOT_FOUND
        })
    }
    // nếu tồn tại thì gửi email chứa link đặt lại mật khẩu và gửi vào email 
    await userServices.forgotpassword(email)
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.CHECK_YOUR_EMAIL
    })
}
export const verifyForgotPasswordController = async (
    req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
    res: Response
) => {
    // người  ta đưa mã cho mình và muốn biết mã đã verify hay chưa
    //  mình đã verify có nghĩa là mã do mình tạo ra
    // nhưng mình phải xem thử mà này là cũ hay mới trong hệ thống
    // tức là trong database có còn mà mã này nữa hay không
    // tức là user_id có còn sở hữu forgot_password_token này không 
    const { user_id } = req.decoded_forgot_password_token as TokePayLoad
    const { forgot_password_token } = req.body

    await userServices.checkForgotPasswordToken({
        user_id,
        forgot_password_token
    })

    // nếu có thông tin thì oke 

    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
    })
}

export const resetPasswordController = async (
    req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
    res: Response
) => {
    // kiếm tra xem forgot_password_token có còn khớp với user_id nữa không ?
    const { user_id } = req.decoded_forgot_password_token as TokePayLoad
    const { forgot_password_token, password } = req.body

    await userServices.checkForgotPasswordToken({
        user_id,
        forgot_password_token
    })

    // nếu còn thì tiến hành đặt mk mới do req cung cấp

    await userServices.resetPassword({ user_id, password })
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
    })

}

export const getMeController = async (
    req: Request,
    res: Response
) => {
    const { user_id } = req.decoded_authorization as TokePayLoad
    const userInfor = await userServices.getMe(user_id)
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.GET_ME_SUCCESS,
        result: userInfor
    })
}

export const updateMeController = async (
    req: Request<ParamsDictionary, any, UpdateMeReqBody>,
    res: Response
) => {
    // chức năng update này chỉ khi người dùng đã verify
    const { user_id } = req.decoded_authorization as TokePayLoad
    const verifyStatus = await userServices.getUserVerifyStatus(user_id)
    // chưa verify thì không cho update
    if (verifyStatus != UserVerifyStatus.Verified) {
        throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
            message: USERS_MESSAGES.USER_NOT_VERIFIED
        })
    }
    // nếu đã verify thì mới cho update
    const userInfor = await userServices.updateMe({
        user_id,
        payload: req.body
    })
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
        result: userInfor
    })

}

export const changePasswordController = async (
    req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
    res: Response
) => {
    const { user_id } = req.decoded_authorization as TokePayLoad
    const { old_password, password } = req.body
    await userServices.changePassword({
        user_id,
        old_password,
        password
    })
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
    })
}

export const refreshTokenController = async (
    req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
    res: Response,
    next: NextFunction
) => {
    const { refresh_token } = req.body
    const { user_id, token_type } = req.decoded_refresh_token as TokePayLoad
    await userServices.checkRefreshToken({
        user_id,
        refresh_token
    })
    await userServices.refreshToken({
        user_id,
        refresh_token,
    })
    return res.status(HTTP_STATUS.OK).json({
        message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS
    })
}

export const chatController = async (
    req: Request, res: Response, next: NextFunction
) => {
    const { message } = req.body

    const { user_id } = req.decoded_authorization as TokePayLoad

    const result = chatServices.handleChatWithAI(user_id, message)

    return res.status(HTTP_STATUS.OK).json({
        message: "AI trả lời thành công",
        result: result
    })
}