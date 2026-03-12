// --- CẤU HÌNH ĐỊA CHỈ BACKEND ---
// Đổi lại port 3000 hoặc theo đúng port Node.js của bạn đang chạy
const API_BASE_URL = 'http://localhost:4000/users';

// ==========================================
// 1. XỬ LÝ FORM ĐĂNG NHẬP
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Chặn reload trang

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('loginError');

        // Reset thông báo lỗi
        errorDiv.style.display = 'none';
        errorDiv.innerText = '';

        try {
            // Gửi cục data sang Node.js
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Thành công: Lưu cả Access và Refresh token vào trình duyệt
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);

                // Tùy chọn: Lưu thêm thông tin user cơ bản nếu backend có trả về
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                alert('Đăng nhập thành công!');
                // Đá về trang chủ Dashboard
                window.location.href = 'index.html';
            } else {
                // Lỗi (Sai pass, email không tồn tại...)
                errorDiv.innerText = data.message || 'Sai thông tin đăng nhập!';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Login Error:', error);
            errorDiv.innerText = 'Không thể kết nối đến Server Node.js!';
            errorDiv.style.display = 'block';
        }
    });
}

// ==========================================
// 2. XỬ LÝ FORM ĐĂNG KÝ
// ==========================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const confirm_password = document.getElementById('regConfirm').value.trim();
        const yob = document.getElementById('regDob').value;
        const date_of_birth = new Date(yob).toISOString();
        const errorDiv = document.getElementById('registerError');

        errorDiv.style.display = 'none';

        // Tự kiểm tra mật khẩu khớp nhau ở Frontend trước cho nhanh
        if (password !== confirm_password) {
            errorDiv.innerText = 'Mật khẩu xác nhận không khớp!';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            // Gửi thẳng sang Node.js để lưu vào MongoDB
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirm_password, date_of_birth })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = 'login.html';
            } else {
                // Lỗi (Email đã tồn tại, pass quá ngắn...)
                errorDiv.innerText = data.message || 'Đăng ký thất bại!';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Register Error:', error);
            errorDiv.innerText = 'Lỗi kết nối đến máy chủ!';
            errorDiv.style.display = 'block';
        }
    });
}