import express from "express"
import { serverVideoController, serveSingleImageController } from "~/controllers/medias.controllers"
import { wraperAsync } from "~/utils/handler"
const staticRouter = express.Router()


// image 
staticRouter.get(
    '/image/:filename',
    wraperAsync(serveSingleImageController)
)
staticRouter.get(
    '/video/:filename',
    wraperAsync(serverVideoController)
)

export default staticRouter