import User from "~/models/User.shema";
import databaseServices from "./database.services";
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from "~/models/request/User.request";
import { hashPassword } from "~/utils/crypto";
import { signToken } from "~/utils/jwt";
import { TokenType, UserVerifyStatus } from "~/constants/enums";
import { StringValue } from "ms"
import { ErrorWithStatus } from "~/models/Error";
import HTTP_STATUS from "~/constants/httpStatus";
import { USERS_MESSAGES } from "~/constants/message";
import RefreshToken from "~/models/RefreshToken.schema";
import { ObjectId } from "mongodb";
import dotenv from "dotenv"
import { verify } from "crypto";
import { update } from "lodash";

dotenv.config()
class UserServices {
    private signAccessToken(user_id: string) {
        return signToken({
            privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
            payload: { user_id, token_type: TokenType.AccessToken },
            options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN as StringValue }
        })
    }
    private signRefreshToken(user_id: string) {
        return signToken({
            privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
            payload: { user_id, token_type: TokenType.AccessToken },
            options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN as StringValue }
        })
    }
    private signEmailVerifyToken(user_id: string) {
        return signToken({
            privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
            payload: { user_id, token_type: TokenType.EmailVerificationToken },
            options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN as StringValue }
        })
    }
    private signForgotPasswordToken(user_id: string) {
        return signToken({
            privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
            payload: { user_id, token_type: TokenType.ForgotPasswordToken },
            options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN as StringValue }
        })
    }
    async register(payload: RegisterReqBody) {
        const user_id = new ObjectId()
        const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
        const result = await databaseServices.users.insertOne(
            new User({
                ...payload,
                _id: user_id,
                date_of_birth: new Date(payload.date_of_birth),
                password: hashPassword(payload.password),//ghi đè
                // mã hóa trước khi đẩy lên 
                email_verify_token
            })
        )
        // lấy id của user vừa tạo để tạo làm ac và rf
        // ký và ac và rf

        const [access_token, refresh_token] = await Promise.all([
            this.signAccessToken(user_id.toString()),
            this.signRefreshToken(user_id.toString())
        ])
        //thiếu việc lưu rf vào database 
        await databaseServices.refreshTokens.insertOne(
            new RefreshToken({
                token: refresh_token,
                user_id: new ObjectId(user_id)
            })
        )
        //hàm gửi mail
        console.log(`http://localhost:4000/users/verify-email/?email_verify_token=${email_verify_token}`);

        return {
            access_token,
            refresh_token
        }
    }
    async checkEmailExist(email: string): Promise<boolean> {
        const user = await databaseServices.users.findOne({ email })
        return Boolean(user)
    }
    async login(payload: LoginReqBody) {
        // lên sever tìm user sở hữu cả 2 thông tin cùng lúc
        const user = await databaseServices.users.findOne({
            ...payload,
            password: hashPassword(payload.password)
        })
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
                message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
            })
        }
        // nếu có user thfi tạo ac và rf tạo từ user_id
        const user_id = user._id.toString()

        const [access_token, refresh_token] = await Promise.all([
            this.signAccessToken(user_id),
            this.signRefreshToken(user_id)
        ])
        //thiếu việc lưu rf vào database 
        await databaseServices.refreshTokens.insertOne(
            new RefreshToken({
                token: refresh_token,
                user_id: new ObjectId(user_id)
            })
        )
        return {
            access_token,
            refresh_token,
            // Trả thêm cục user này về nè
            user: {
                _id: user._id,
                name: user.name,  // Đây là cái 'name' mà nãy giờ index.js đi tìm
                email: user.email
                // TUYỆT ĐỐI không trả password về đây nhé!
            }
        }
    }

    async checkRefreshToken({ user_id, refresh_token }: { user_id: string, refresh_token: string }) {
        const refreshtoken = await databaseServices.refreshTokens.findOne({
            user_id: new ObjectId(user_id),
            token: refresh_token
        })

        if (!refreshtoken) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
            })
        }
    }
    async logout(refresh_token: string) {
        await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
    }
    async checkEmailVerifyToken({
        user_id,
        email_verify_token
    }: {
        user_id: string,
        email_verify_token: string
    }) {
        // tìm user
        const user = await databaseServices.users.findOne({
            _id: new ObjectId(user_id),
            email_verify_token
        })
        // nếu không có user thì throw lỗi vì mã này cũ rồi, hoặc user bị xóa r 
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
                message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
            })
        }

        // nếu có thì return true
        return true
    }

    async verifyEmail(user_id: string) {
        // cập nhật thông tin của user đó
        await databaseServices.users.updateOne(
            {
                _id: new ObjectId(user_id)
            },
            [
                {
                    $set: {
                        verify: UserVerifyStatus.Verified,
                        email_verify_token: '',
                        update_at: '$$NOW'
                    }
                }
            ]
        )
        return
    }

    async getUserVerifyStatus(user_id: string) {
        const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
        if (!user) {
            throw new ErrorWithStatus({
                message: USERS_MESSAGES.USER_NOT_FOUND,
                status: HTTP_STATUS.UNAUTHORIZED
            })
        }

        return user.verify
    }

    async rendEmailVerifyToken(user_id: string) {
        const email_verify_token = await this.signEmailVerifyToken(user_id)
        // cập nhật lại token mới cho user
        await databaseServices.users.updateOne(
            { _id: new ObjectId(user_id) },
            [
                {
                    $set: {
                        email_verify_token,
                        update_at: '$$NOW'
                    }
                }
            ]
        )
        console.log(`http://localhost:4000/users/verify-email/?email_verify_token=${email_verify_token}`);
        return
    }

    async sendForgotPasswordEmail(email: string) {
        // giả sử email tồn tại 
        // tạo token đặt lại mk 
        const user = await databaseServices.users.findOne({ email })
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
                message: USERS_MESSAGES.USER_NOT_FOUND
            })
        }
        const sign_forgot_password_token = await signToken({
            privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
            payload: { user_id: user._id.toString() },
            options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN as StringValue }
        })
        console.log(`http://localhost:4000/users/reset-password/?forgot_password_token=${sign_forgot_password_token}`);
        return
    }

    async forgotpassword(email: string) {
        // tìm user theo email
        const user = await databaseServices.users.findOne({ email }) as User
        // lấy user_id
        const user_id = (user._id as ObjectId).toString()
        // tạo token đặt lại mk
        const forgot_password_token = await this.signForgotPasswordToken(user_id)
        // cập nhật thêm forgot_password cho user
        await databaseServices.users.updateOne(
            { _id: new ObjectId(user_id) },
            [
                {
                    $set: {
                        forgot_password_token,
                        update_at: '$$NOW'
                    }
                }
            ]
        )

        console.log(`http://localhost:8000/users/reset-password/?forgot_password_token=${forgot_password_token}`);
        return
    }

    async checkForgotPasswordToken({
        user_id,
        forgot_password_token
    }: {
        user_id: string,
        forgot_password_token: string
    }) {
        const user = await databaseServices.users.findOne({
            _id: new ObjectId(user_id),
            forgot_password_token
        })
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USERS_MESSAGES.FORGOT_PASSWORD_IS_INVALID
            })
        }
    }

    async resetPassword({ user_id, password }: { user_id: string, password: string }) {
        await databaseServices.users.updateOne(
            { _id: new ObjectId(user_id) },
            [
                {
                    $set: {
                        forgot_password_token: '',
                        password: hashPassword(password),
                        update_at: '$$NOW'
                    }
                }
            ]
        )
    }

    async getMe(user_id: string) {
        const user = await databaseServices.users.findOne(
            {
                _id: new ObjectId(user_id)
            },
            {
                projection: {
                    password: 0,
                    email_verify_token: 0,
                    forgot_password_token: 0
                }
            }
        )
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: USERS_MESSAGES.USER_NOT_FOUND
            })
        }
        return user
    }
    async updateMe({ user_id, payload }: { user_id: string, payload: UpdateMeReqBody }) {
        //payload này có 2 thức cần fix là date_of_birth và username
        const _payload = payload.date_of_birth
            ? {
                ...payload,
                date_of_birth: new Date(payload.date_of_birth)
            } : payload
        const user = await databaseServices.users.findOne({ username: _payload.username })
        // nếu có người dùng username rồi thì báo lỗi 
        if (user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
                message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
            })
        }
        const userInfor = await databaseServices.users.findOneAndUpdate(
            { _id: new ObjectId(user_id) },
            [
                {
                    $set: {
                        ...payload,
                        update_at: '$$NOW'
                    }
                }
            ],
            {
                returnDocument: 'after',
                projection: {
                    password: 0,
                    email_verify_token: 0,
                    forgot_password_token: 0
                }
            }
        )
        return userInfor
    }
    async changePassword({
        user_id,
        old_password,
        password
    }: {
        user_id: string,
        old_password: string,
        password: string
    }) {
        const user = await databaseServices.users.findOne({
            _id: new ObjectId(user_id),
            password: hashPassword(old_password)
        })
        // nếu không có user nhập sai pass
        if (!user) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
                message: USERS_MESSAGES.USER_NOT_FOUND
            })
        }
        // nếu có thì cập nhật mk mới cho user  
        await databaseServices.users.updateOne(
            { _id: new ObjectId(user_id) },
            [
                {
                    $set: {
                        password: hashPassword(password),
                        update_at: '$$NOW'
                    }
                }
            ]
        )
    }
    async refreshToken({
        user_id,
        refresh_token
    }: {
        user_id: string,
        refresh_token: string
    }) {
        // tạo mới ac và rf
        const [access_token, new_refresh_token] = await Promise.all([
            this.signAccessToken(user_id),
            this.signRefreshToken(user_id)
        ])
        // xoa rf cu
        await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
        // lưu rf mới vào db
        await databaseServices.refreshTokens.insertOne(
            new RefreshToken({
                token: new_refresh_token,
                user_id: new ObjectId(user_id)
            })
        )
        // gui ac va rf moi cho nguoi dung 
        return {
            access_token,
            refresh_token: new_refresh_token
        }
    }
}


const userServices = new UserServices()
export default userServices
