/* --- CHATBOT LOGIC --- */

// 1. Hàm bật/tắt khung chat
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        // Tự động focus vào ô nhập liệu
        document.getElementById('userInput').focus();
    } else {
        chatWindow.style.display = 'none';
    }
}

// 2. Xử lý khi nhấn Enter
function handleEnter(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

// 3. Hàm gửi tin nhắn và gọi Backend
async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const message = inputField.value.trim();
    const chatBox = document.getElementById('chatMessages');

    if (message === "") return;

    // A. Hiển thị tin nhắn của User lên màn hình
    chatBox.innerHTML += `<div class="message user">${message}</div>`;
    inputField.value = ''; // Xóa ô nhập
    chatBox.scrollTop = chatBox.scrollHeight; // Cuộn xuống dưới cùng

    // Hiển thị trạng thái "Đang gõ..." (tùy chọn)
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div class="message bot" id="${loadingId}">...</div>`;

    try {
        // B. GỌI API BACKEND (Flask)
        // Lưu ý: Đảm bảo server Flask đang chạy ở port 5000
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // C. Xóa loading và hiển thị câu trả lời của Bot
        document.getElementById(loadingId).remove();
        
        // Kiểm tra xem data trả về có field 'reply' không (theo code Python bạn làm lúc nãy)
        if (data.reply) {
            chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="message bot text-danger">Lỗi: Server không trả lời đúng định dạng.</div>`;
        }

    } catch (error) {
        document.getElementById(loadingId).remove();
        console.error('Error:', error);
        chatBox.innerHTML += `<div class="message bot text-danger">Không kết nối được với Server Chatbot!</div>`;
    }

    // Cuộn xuống dưới cùng sau khi có tin nhắn mới
    chatBox.scrollTop = chatBox.scrollHeight;
}