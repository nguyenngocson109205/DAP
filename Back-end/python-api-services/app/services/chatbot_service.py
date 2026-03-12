import os
import pandas as pd
from langchain_openai import ChatOpenAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from dotenv import load_dotenv

# 1. Load biến môi trường (Chứa OPENAI_API_KEY từ file .env)
load_dotenv()

# 2. Xử lý đường dẫn chuẩn xác 100% đến file CSV
# 1. Vị trí hiện tại: D:\DAP\Back-end\app\services
current_dir = os.path.dirname(os.path.abspath(__file__)) 
# 2. Lùi ra thư mục app: D:\DAP\Back-end\app
app_dir = os.path.dirname(current_dir)                   
# 3. Lùi ra thư mục Back-end: D:\DAP\Back-end
backend_dir = os.path.dirname(app_dir)                   

# 4. Nối thẳng vào thư mục data của bạn
csv_path = os.path.join(backend_dir, 'data', 'hcm_aqi_full_dataset.csv')
# Khai báo biến global cho agent
agent = None

try:
    # 3. Đọc dữ liệu từ file CSV
    print(f"[*] Đang nạp dữ liệu AI Chatbot từ: {csv_path}")
    df = pd.read_csv(csv_path)

    # 4. Khởi tạo "Bộ não" ChatGPT và kết nối với dữ liệu (Pandas Agent)
    # Nhiệt độ (temperature=0) giúp Bot trả lời số liệu chính xác, không nói điêu
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    
    agent = create_pandas_dataframe_agent(
        llm, 
        df, 
        verbose=True, # Hiển thị quá trình suy luận của AI trên Terminal
        allow_dangerous_code=True # Bắt buộc phải có để Agent được phép chạy code Pandas
    )
    print("[+] Khởi tạo AI Chatbot (RAG) thành công!")
    
except Exception as e:
    print(f"[-] Lỗi khởi tạo Chatbot: {e}")
    # Nếu lỗi (VD: sai API key, không thấy file) thì báo lỗi chứ không làm sập server

def get_chatbot_answer(user_message):
    """
    Hàm này nhận câu hỏi từ file routes.py, đưa cho Agent phân tích và trả về đáp án.
    """
    # Kiểm tra xem não (agent) có khởi động thành công không
    if not agent:
        return "Xin lỗi, hệ thống AI đang bảo trì hoặc không tìm thấy dữ liệu gốc."
    
    try:
        # Ra lệnh cho Agent phân tích câu hỏi và truy xuất file CSV
        response = agent.invoke(user_message)
        return response['output']
        
    except Exception as e:
        print(f"[-] Lỗi khi xử lý câu hỏi: {e}")
        return "Tôi đang gặp khó khăn khi phân tích dữ liệu này. Bạn có thể hỏi theo cách khác được không?"