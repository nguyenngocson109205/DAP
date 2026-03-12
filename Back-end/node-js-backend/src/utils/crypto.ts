import { createHash } from "crypto";
import dotenv from "dotenv"
dotenv.config();
// hàm mã hóa nd thành sha256
function sha256(content: string) {
    return createHash("sha256").update(content).digest('hex') //đoạn mã tạo từ content 
}

// hàm mã hóa theo tiêu chuẩn hs256 

export function hashPassword(password: string) {
    return sha256(password + process.env.PASSWORD_SECRET)
}