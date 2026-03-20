import { ObjectId } from "mongodb";

export default interface DataAqi {
    _id?: ObjectId;
    Time: string;
    "PM2.5": number;
    PM10: number;
    NO2: number;
    CO: number;
    SO2: number;
    O3: number;
    Temp: number;
    Humid: number;
    Wind_Speed: number;
    Wind_Dir: number;
    Rain: number;
}