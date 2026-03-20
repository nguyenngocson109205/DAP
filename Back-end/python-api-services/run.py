import os
import sys
import threading
import time

# --- 1. CẤU HÌNH MÔI TRƯỜNG (Đã xóa sạch tàn dư TensorFlow) ---
# Giữ lại 2 dòng này để các thư viện Machine Learning (XGBoost, Sklearn) không đánh nhau giành CPU
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1" 

# --- 2. HÀM KIỂM TRA SỰ SỐNG (HEARTBEAT) ---
def heartbeat():
    """Cứ 10 giây in một dấu chấm để biết server còn sống hay đã chết"""
    while True:
        # print("💓 Server vẫn đang thức...", flush=True)
        time.sleep(10)

# --- 3. KHỞI CHẠY HỆ THỐNG ---
def start_server():
    try:
        from app import create_app
        from waitress import serve
        
        print("--- ĐANG KHỞI ĐỘNG HỆ THỐNG API... ---")
        app = create_app()
        
        # Chạy một luồng phụ để theo dõi sự sống
        threading.Thread(target=heartbeat, daemon=True).start()
        
        print("====================================================")
        print("🚀 SERVER ĐÃ SẴN SÀNG TẠI: http://127.0.0.1:5000")
        print("👉 Đã kích hoạt chế độ 'Lazy Load' - Server cực nhẹ!")
        print("====================================================")
        
        # Chạy Waitress với cấu hình "hiền lành" nhất có thể
        serve(app, host="127.0.0.1", port=5000, threads=1, channel_timeout=1000)

    except Exception as e:
        print(f"❌ LỖI KHỞI ĐỘNG: {e}")
        time.sleep(10)

if __name__ == "__main__":
    start_server()