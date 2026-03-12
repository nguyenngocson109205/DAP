import jwt from "jsonwebtoken"
import { TokePayLoad } from "~/models/request/User.request"

export const signToken = ({
    payload,
    privateKey,
    options = { algorithm: 'HS256' }
}: {
    payload: any,
    privateKey: string,
    options?: jwt.SignOptions
}) => {
    return new Promise<string>((resolve, reject) => {
        jwt.sign(payload, privateKey as string, options, function (err, token) {
            if (err) throw reject(err)
            else resolve(token as string)
        })
    })
}

export const verifyToken = ({
    token,
    privateKey
}: {
    token: string,
    privateKey: string
}) => {
    return new Promise<TokePayLoad>((resolve, reject) => {
        jwt.verify(token, privateKey, (error, decodeed) => {
            if (error) throw reject(error)
            resolve(decodeed as TokePayLoad)
        })
    })

}