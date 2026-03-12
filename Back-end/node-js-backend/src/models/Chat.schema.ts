import { ObjectId } from "mongodb";

// 1. Interface định nghĩa kiểu dữ liệu truyền vào lúc tạo object
interface ChatType {
    _id?: ObjectId;       // Khi tạo mới thì DB tự sinh ra _id, không cần truyền
    user_id: ObjectId;    // Liên kết với _id của người dùng
    message_user: string; // Tin nhắn user gửi
    message_bot: string;  // Câu trả lời của AI
    created_at?: Date;    // Không truyền thì class sẽ tự động lấy giờ hiện tại
}

// 2. Class dùng để tạo ra đối tượng Chat trước khi insert vào database
export default class Chat {
    _id?: ObjectId;
    user_id: ObjectId;
    message_user: string;
    message_bot: string;
    created_at: Date;

    constructor({ _id, user_id, message_user, message_bot, created_at }: ChatType) {
        this._id = _id;
        this.user_id = user_id;
        this.message_user = message_user;
        this.message_bot = message_bot;
        this.created_at = created_at || new Date(); // Tự động lấy giờ hiện tại nếu không truyền
    }
}