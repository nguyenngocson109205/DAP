import { Router } from "express";

import { getWeatherController, predictAqiController } from "~/controllers/ai.controllers";
import { wraperAsync } from "~/utils/handler";

const aiRouter = Router()


/* path: /ai/weather
method: GET
description: Lấy dữ liệu thời tiết quá khứ 24h và tương lai từ Python
*/
aiRouter.get('/weather', wraperAsync(getWeatherController))

/*
path: /ai/predict
method: POST
body: { modelType: "xgboost" | "lstm" | "ridge", features: number[] }
description: Gửi mảng features sang Python để dự báo AQI
*/
// Nếu có validator thì gắn vào giữa giống bên user: aiRouter.post('/predict', predictValidator, wraperAsync(...))
aiRouter.post('/predict', wraperAsync(predictAqiController))

export default aiRouter