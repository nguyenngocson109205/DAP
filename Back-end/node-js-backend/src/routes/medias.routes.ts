import { Router } from 'express'
import { uploadSingleImageController, uploadVideoController } from '~/controllers/medias.controllers'
import { wraperAsync } from '~/utils/handler'

const mediasRouter = Router()

mediasRouter.post('/upload-image', uploadSingleImageController)
mediasRouter.post('/upload-video', wraperAsync(uploadVideoController))

export default mediasRouter

//uploadSingleImageController chưa làm