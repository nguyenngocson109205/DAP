import HTTP_STATUS from "~/constants/httpStatus";


type ErrorType = Record<
    string,
    {

    }
>

// tạo ra 1 kiểu lỗi mới 

export class ErrorWithStatus {
    message: string
    status: number
    constructor({ message, status }: { message: string; status: number }) { // khi 2 biến này tạo ra 1 thứ gì đó 
        this.message = message
        this.status = status
    }
}

export class EntityError extends ErrorWithStatus {
    errors: ErrorType // kiểu lỗi cũ
    constructor({
        message = "Validation Error",
        errors }: {
            message?: string,
            errors: ErrorType
        }) {
        super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY }) // new ErrorWithStatus({status, message})
        this.errors = errors
    }
}