// wraperAsync biến những hàm Async
// thành hàm có cấu trúc try catch + next

import { NextFunction, Request, RequestHandler, Response } from "express";
// generit?\
// RequestHandeler: (req, res, next) =>{}
export const wraperAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
    return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
        try {
            await func(req, res, next)
        } catch (error) {
            await next(error)
        }
    }
}