import { Request } from "express"
import sharp from "sharp"
import { UPLOAD_IMAGE_DIR } from "~/constants/dir"
import { getNameFormFileName, handleUpLoadSingleImage, handleUpLoadVideo } from "~/utils/file"
import fs from 'fs'

class MediasServices {
    //
    async uploadSingleImage(req: Request) {
        const file = await handleUpLoadSingleImage(req)
        file.newFilename = getNameFormFileName(file.newFilename) + '.jpg'
        // tạo đường dẫn mà mình sẽ lưu file
        const newPath = UPLOAD_IMAGE_DIR + '/' + file.newFilename
        // file.filepath: lưu vào đường dẫn trong temp
        // sharp

        await sharp(file.filepath as string)
            .jpeg()
            .toFile(newPath)
        // lưu vào folder chính thức
        // trả ra link để người dùng xài
        // xóa file cũ đi 
        fs.unlinkSync(file.filepath)
        console.log(`http://localhost:4000/static/image/${file.newFilename}`);
        return `http://localhost:4000/static/image/${file.newFilename}`


    }

    async handleUploadVideo(req: Request) {
        const file = await handleUpLoadVideo(req)
        console.log(`http://localhost:4000/static/image/${file.newFilename}`);
        return `http://localhost:4000/static/image/${file.newFilename}`


    }

}

const mediasServices = new MediasServices()
export default mediasServices