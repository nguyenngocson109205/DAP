import { Request, Response } from "express";
import databaseServices from "~/services/database.services"; // Import đúng cái service của bro

const dataAqiController = {
    getAllData: async (req: Request, res: Response) => {
        console.log("Đang truy vấn database bằng Native MongoDB...");

        // Dùng native driver: find({}) kết hợp toArray() để lấy hết data
        const data = await databaseServices.aqiData.find({}).toArray();

        const formattedData: any[] = [
            ["Time", "PM2.5", "PM10", "NO2", "CO", "SO2", "O3", "Temp", "Humid", "Wind_Speed", "Wind_Dir", "Rain"]
        ];

        data.forEach((item: any) => {
            formattedData.push([
                item.Time,
                item['PM2.5'],
                item.PM10,
                item.NO2,
                item.CO,
                item.SO2,
                item.O3,
                item.Temp,
                item.Humid,
                item.Wind_Speed,
                item.Wind_Dir,
                item.Rain
            ]);
        });

        console.log(`Đã đóng gói và gửi đi ${formattedData.length - 1} dòng dữ liệu.`);
        res.status(200).json(formattedData);
    }
};

export default dataAqiController;