import axios from 'axios';
import { ObjectId } from 'mongodb';

import databaseServices from './database.services'; // Import file kết nối DB của bạn
import Chat from '~/models/Chat.schema';

class ChatServices {
    async handleChatWithAI(user_id: string, user_message: string) {
        try {
            // 1. Bắn request sang Server Python (Bếp trưởng nhờ Bếp phó AI làm món)
            const pythonResponse = await axios.post('http://127.0.0.1:5000/chat', {
                message: user_message
            });

            // Lấy câu trả lời từ JSON của Python
            const botReply = pythonResponse.data.reply;

            // 2. Đóng gói dữ liệu bằng Class Chat bạn vừa tạo
            const newChat = new Chat({
                user_id: new ObjectId(user_id), // Ép kiểu id từ token (string) thành ObjectId của MongoDB
                message_user: user_message,
                message_bot: botReply
                // created_at không cần truyền, constructor trong class Chat sẽ tự lấy giờ hiện tại
            });

            // 3. Lưu thẳng xuống MongoDB qua native driver
            // Lưu ý: Đảm bảo bạn đã khai báo collection 'chats' trong databaseServices
            await databaseServices.chats.insertOne(newChat);

            // 4. Trả kết quả lên cho tầng Controller
            return { reply: botReply };

        } catch (error) {

            throw new Error;
        }
    }
}

const chatServices = new ChatServices();
export default chatServices;