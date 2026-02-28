document.addEventListener("DOMContentLoaded", function () {
    let lastScrollTop = 0; // Biến lưu vị trí cuộn chuột trước đó
    const navbar = document.getElementById("smartNavbar");

    if (!navbar) return;

    window.addEventListener("scroll", function () {
        // Lấy vị trí cuộn hiện tại của màn hình
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Nếu cuộn xuống VÀ đã cuộn qua một đoạn nhỏ (ví dụ 50px)
        if (currentScroll > lastScrollTop && currentScroll > 50) {
            // Đang cuộn xuống -> Thêm class để giấu menu đi
            navbar.classList.add("navbar-hidden");
        } else {
            // Đang cuộn lên -> Gỡ class ra để menu hiện lại
            navbar.classList.remove("navbar-hidden");
        }

        // Cập nhật lại vị trí cũ (Xử lý lỗi số âm trên một số trình duyệt)
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
});