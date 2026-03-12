// chứa các function xử lí file 
// tạo hàm tự tạo foder uploadss
import { dir } from 'console'
import { Request } from 'express'
import formidable, { File } from 'formidable'
import fs from 'fs' // file system (tạo|tìm|xóa|thêm thư mục)
import path from 'path'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'


export const initFolder = () => {
    ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    })
}

export const handleUpLoadSingleImage = (req: Request) => {
    // tiếp nhận file từ req, kiểm tra formidable và lưu tạm
    const form = formidable({
        maxFiles: 1, // tối đa bao nhiêu 
        maxFileSize: 1024 * 300, // tối đa bao nhiêu byte 300kb
        keepExtensions: true, // có giữ đuôi mở rộng không .png, .jpg
        uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR), // lưu ở đâu
        filter: function ({ name, originalFilename, mimetype }) {
            // name là trường dữ liệu đc gửi từ form 
            // originalFilename:tên gốc của file
            // mimetype loại file của type 
            const valid = name === 'image' && Boolean(mimetype?.includes("image/"))
            if (!valid) form.emit('error' as any, new Error("Not file Type") as any)
            return valid
        }
    })
    return new Promise<File>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(err)
            }
            // nếu k có lỗi do quá trình parse
            if (!files.image) {
                return reject(new Error('Image is empty'))
            }
            // nếu mà có gửi và đầy đủ thì
            return resolve(files.image[0] as File)
        })
    })
}

export const getNameFormFileName = (filename: string) => {
    const nameArr = filename.split('.')
    nameArr.pop()
    return nameArr.join('.')
}

export const getExtFormFileName = (filename: string) => {
    const nameArr = filename.split('.')
    return nameArr.pop()
}

export const handleUpLoadVideo = (req: Request) => {
    // tiếp nhận file từ req, kiểm tra formidable và lưu tạm
    const form = formidable({
        maxFiles: 1, // tối đa bao nhiêu 
        maxFileSize: 1024 * 50 * 1024, // tối đa bao nhiêu byte 50Mb
        keepExtensions: true, // có giữ đuôi mở rộng không .png, .jpg
        uploadDir: path.resolve(UPLOAD_VIDEO_DIR), // lưu ở đâu
        filter: function ({ name, originalFilename, mimetype }) {
            // name là trường dữ liệu đc gửi từ form 
            // originalFilename:tên gốc của file
            // mimetype loại file của type 
            const valid = name === 'video' && Boolean(mimetype?.includes("video/"))
            if (!valid) form.emit('error' as any, new Error("Not file Type") as any)
            return valid
        }
    })
    return new Promise<File>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(err)
            }
            // nếu k có lỗi do quá trình parse
            if (!files.video) {
                return reject(new Error('Video is empty'))
            }
            // nếu mà có gửi và đầy đủ thì
            return resolve(files.video[0] as File)
        })
    })
}

