import { NextFunction, Request, Response } from "express";
import { ValidationChain, validationResult } from "express-validator";
import { RunnableValidationChains } from "express-validator/lib/middlewares/schema";
import HTTP_STATUS from "~/constants/httpStatus";
import { EntityError, ErrorWithStatus } from "~/models/Error";

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await validation.run(req) //chạy checkShema và lưu lỗi trong req
        const error = validationResult(req) // khưi lỗi ra
        if (error.isEmpty()) {
            return next()
        }
        const errorObject = error.mapped()
        //tách thành errorObject vì mình sẽ độ lại errorObject
        const entityError = new EntityError({
            errors: {}
        })
        // tạo vòng lặp đi qua từng key
        for (const key in errorObject) {
            const { msg } = errorObject[key]
            // msg có 2 dạng 
            //      1: string bình thường
            //      2: lỗi do ErrorWithStatus tạo ra 
            if (msg instanceof ErrorWithStatus &&
                msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY //422
            ) {
                return next(msg)// next(error): đưa lỗi về handler tổng 
            }
            console.log(msg);

            // nếu là msg bình thường
            entityError.errors[key] = msg
        }
        //
        next(entityError)// ném cho thằng tổng đóng gói
    }
}