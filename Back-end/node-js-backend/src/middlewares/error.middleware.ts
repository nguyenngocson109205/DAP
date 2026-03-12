import { NextFunction, Request, Response } from "express"
import { omit } from "lodash"
import HTTP_STATUS from "~/constants/httpStatus"
import { ErrorWithStatus } from "~/models/Error"

export const defaultErrorHandler = (
    error: any,
    req: Request,  //
    res: Response, next: NextFunction) => {
    // hệ thống về rất nhiều lỗi, thườngh là Erorwithstatus
    // những cũng có thể là mội lỗi nào đó không theo cấu trúc {status, message}
    console.log("lỗi nè : " + error.message)

    if (error instanceof ErrorWithStatus) {
        return res
            .status(error.status).json(omit(error, 'status'))
    }
    //  nếu có lỗi dạng error bth hoặc khác
    // thì mình mở enumerable ra 
    Object.getOwnPropertyNames(error).forEach((key) => {
        Object.defineProperty(error, key, { enumerable: true })
    })

    //lỗi new Error thì không có status thì để mã 500
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: error.message,
        errorInfor: omit(error, ['stack'])
    })
}
