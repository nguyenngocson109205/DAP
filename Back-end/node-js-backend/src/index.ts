import express from "express";
import userRouter from "./routes/users.routes";
import cors from "cors";

import databaseServices from "./services/database.services";
import HTTP_STATUS from "./constants/httpStatus";
import { defaultErrorHandler } from "./middlewares/error.middleware";
import mediasRouter from "./routes/medias.routes";
import { initFolder } from "./utils/file";
import staticRouter from "./routes/static.routes";
import aiRouter from "./routes/aiPython.routes";


const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); //middleware dùng để parse body từ client gửi lên server
databaseServices.connect()
initFolder()
app.use("/users", userRouter)
app.use('/medias', mediasRouter)
app.use('/static', staticRouter)
app.use('/ai', aiRouter)
app.use(defaultErrorHandler)


app.listen(port, () => {
    console.log(`app đang chạy trên port ${port}`);
});


