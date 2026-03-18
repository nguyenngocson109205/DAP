import { Request, Response } from 'express'
import axios from 'axios'

// Lấy link Python từ biến môi trường, nếu không có thì xài mặc định localhost:5000
const PYTHON_AI_SERVER = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:5000'

export const getWeatherController = async (req: Request, res: Response) => {
    console.log("👉 Đang gọi Python lấy dữ liệu thời tiết...");

    const response = await axios.get(`${PYTHON_AI_SERVER}/weather-forecast`);
    return res.json(response.data);
}

export const predictAqiController = async (req: Request, res: Response) => {
    const { modelType, features } = req.body;

    console.log(`👉 Bắt đầu dự báo bằng model: ${modelType}`);

    const response = await axios.post(`${PYTHON_AI_SERVER}/predict`, {
        model: modelType,
        features: features
    });

    // Trả kết quả AQI về lại cho Web
    return res.json(response.data);
}