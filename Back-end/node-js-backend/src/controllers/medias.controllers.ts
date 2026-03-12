import { Request, Response, NextFunction } from "express";
import formidable from "formidable";
import path from 'path'
import fs from 'fs'
import HTTP_STATUS from "~/constants/httpStatus";
import { USERS_MESSAGES } from "~/constants/message";
import mediasServices from "~/services/medias.services";
import { handleUpLoadSingleImage } from "~/utils/file";
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from "~/constants/dir";

export const uploadSingleImageController = async (
    req: Request, res: Response, next: NextFunction
) => {
    // _dirname: cung cấp đường dẫn tuyệt đối đến thư mục chứa file
    // path.resolve(): cung cấp đừng dẫn tính từ thư mục dự án
    //      đang hướng về uploads dù upload k tồn tịa
    //      và đâyu là đường dẫn trong mơ mình muốn lưu trữ
    // tạo 1 tấm lưới lọc file bằng  formidable

    const file = await mediasServices.uploadSingleImage(req)
    return res.status(HTTP_STATUS.OK).json({
        message: 'Upload image success',
        result: file
    })
}

export const serveSingleImageController = async (
    req: Request,
    res: Response
) => {
    const { filename } = req.params
    return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, filename),
        (err) => {
            if (err)
                return res.status((err as any).status || 500).json({
                    message: 'File not found'
                })
            // return res.status((err as any).status).send('file not found')
        })
}

export const serverVideoController = async (
    req: Request,
    res: Response
) => {
    const { filename } = req.params
    return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, filename),
        (err) => {
            if (err)
                return res.status((err as any).status || 500).json({
                    message: 'File not found'
                })
            // return res.status((err as any).status).send('file not found')
        })
}

export const uploadVideoController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // _dirname: cung cấp đường dẫn tuyệt đối đến thư mục chứa file
    // path.resolve('upload): cung cấp đừng dẫn tính từ thư mục dự án
    //      đang hướng về uploads dù upload k tồn tịa
    //      và đâyu là đường dẫn trong mơ mình muốn lưu trữ
    // tạo 1 tấm lưới lọc file bằng  formidable

    const urlVideo = await mediasServices.handleUploadVideo(req)
    return res.status(HTTP_STATUS.OK).json({
        message: 'Upload image success',
        result: urlVideo
    })
}
