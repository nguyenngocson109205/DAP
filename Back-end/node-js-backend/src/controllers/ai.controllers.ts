import { Request, Response } from 'express'
import axios from 'axios'

// Lấy link Python từ biến môi trường, nếu không có thì xài mặc định localhost:5000
const PYTHON_AI_SERVER = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:5000'

export const getWeatherController = async (req: Request, res: Response) => {
    console.log("👉 Đang gọi Python lấy dữ liệu thời tiết...");
    
    try {
        // Có try...catch bảo vệ, Python có lỗi thì Node.js vẫn sống khỏe
        const response = await axios.get(`${PYTHON_AI_SERVER}/weather-forecast`);
        return res.json(response.data);
        
    } catch (error: any) {
        const safeErrorMessage = error.response?.data || error.message || "Lỗi không xác định";
        console.error("❌ Lỗi API Thời tiết từ Python:", safeErrorMessage);
        
        return res.status(500).json({ 
            status: "error", 
            message: "Không thể lấy dữ liệu thời tiết",
            detail: safeErrorMessage
        });
    }
}
// file controller Node.js
// Chỗ này bắt buộc phải trỏ đến cổng 5000 của Python


export const predictAqiController = async (req: Request, res: Response) => {
    // 1. Chỉ nhận modelType từ Web gửi lên
    const { modelType } = req.body; 
    
    console.log(`👉 Bắt đầu dự báo bằng model: ${modelType}`);
    console.log(`🔗 Đang bắn API sang Python tại: ${PYTHON_AI_SERVER}/predict`);

    try {
        // 2. Gọi Python
        const response = await axios.post(`${PYTHON_AI_SERVER}/predict`, {
            model: modelType
        });
        
        // 3. Trả kết quả về Web
        return res.json(response.data);

    } catch (error: any) {
        // ❌ TUYỆT ĐỐI KHÔNG DÙNG: console.log(error) hoặc res.json(error)
        
        // ✅ CHỈ BÓC TÁCH ĐÚNG CÂU CHỮ LỖI ĐỂ IN RA
        const safeErrorMessage = error.response?.data || error.message || "Lỗi không xác định";
        
        console.error("❌ Lỗi từ Python trả về:", safeErrorMessage);
        
        return res.status(500).json({ 
            status: "error", 
            message: "Lỗi khi gọi Python AI",
            detail: safeErrorMessage
        });
    }
}