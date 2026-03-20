import { Router } from "express";
import dataAqiController from "~/controllers/dataAqiController";


import { wraperAsync } from "~/utils/handler";

const dataAqiRouter = Router()

/*
path: /aqi/get-all (Tùy bro cấu hình bên file app/server tổng)
method: GET
description: Rút 26k dòng dữ liệu AQI từ MongoDB và format thành mảng 2 chiều cho ECharts Frontend
*/
dataAqiRouter.get('/get-all', wraperAsync(dataAqiController.getAllData))

export default dataAqiRouter