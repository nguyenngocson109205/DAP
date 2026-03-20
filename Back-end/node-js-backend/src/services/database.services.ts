import { Collection, Db, MongoClient } from "mongodb";
import dotenv from 'dotenv'
import User from "~/models/User.shema";
import RefreshToken from "~/models/RefreshToken.schema";
import Chat from "~/models/Chat.schema";
import DataAqi from "~/models/dataAqi.schema";
dotenv.config() //kết nối đến file env

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@demoai.vgrkbpn.mongodb.net/?appName=DEMOAI`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
class DatabaseServices {
    private client: MongoClient //prop
    private db: Db
    constructor() {
        this.client = new MongoClient(uri)
        this.db = this.client.db(process.env.DB_NAME);
    }


    async connect() {
        try {
            await this.db.command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    get users(): Collection<User> {
        return this.db.collection(process.env.DB_USERS_COLLECION as string)
    }

    get refreshTokens(): Collection<RefreshToken> {
        return this.db.collection(process.env.DB_REFRESH_TOKENS__COLLECION as string)
    }
    get chats(): Collection<Chat> {
        return this.db.collection(process.env.DB_REFRESH_CHAT_COLLECION as string)
    }
    get aqiData(): Collection<DataAqi> {
        // Tên collection 'aqi_data' phải khớp với tên trong MongoDB Compass nha bro
        return this.db.collection((process.env.DB_AQI_COLLECTION as string) || 'AQI_HCM_DATASET');
    }
}
// tạo instance và export instance đó 
const databaseServices = new DatabaseServices()
export default databaseServices