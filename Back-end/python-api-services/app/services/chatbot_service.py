import os
import pandas as pd
from langchain_openai import ChatOpenAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from dotenv import load_dotenv

load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__)) 
app_dir = os.path.dirname(current_dir)                   
backend_dir = os.path.dirname(app_dir)                   
csv_path = os.path.join(backend_dir, 'data', 'hcm_aqi_full_dataset.csv')
from app.data_loader import get_df

# Trong hàm xử lý, gọi nó ra
df = get_df() 
# Lúc này Python sẽ kiểm tra: nếu nạp rồi thì nó lấy cái có sẵn, không bao giờ nạp lần 2.
def get_chatbot_answer(user_message):
    """
    Hàm xử lý Chatbot: GPT-4o-mini + Pandas Agent.
    Đã được tối ưu để chống ảo giác và chống sập server Windows.
    """
    if df is None:
        return "Xin lỗi, dữ liệu AQI chưa được nạp. Vui lòng kiểm tra file CSV."
    
    try:
        # 1. Khởi tạo bộ não GPT-4o-mini (Rẻ, nhanh, cực thông minh)
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        
        # 2. Quét thông tin thực tế từ dữ liệu để "dằn mặt" Bot
        min_date = df['time'].min().strftime('%d/%m/%Y')
        max_date = df['time'].max().strftime('%d/%m/%Y')
        latest_year = df['time'].max().year
        
        # 3. Prompt cực kỳ nghiêm ngặt - Chống tự chế dữ liệu
        system_prompt = f"""Bạn là Chuyên gia phân tích chất lượng không khí (AQI) tại TP.HCM.
        
[DỮ LIỆU THỰC TẾ TRONG FILE]:
- Bạn đang làm việc với một DataFrame tên là 'df'.
- Khoảng thời gian: Từ ngày {min_date} đến ngày {max_date}.
- Các cột: {', '.join(df.columns.tolist())}

[QUY TẮC BẮT BUỘC]:
1. CHỈ sử dụng biến 'df' có sẵn. TUYỆT ĐỐI KHÔNG dùng pd.read_csv() hay tạo dữ liệu giả.
2. Trả lời bằng Tiếng Việt thân thiện, chuyên nghiệp.
3. Nếu người dùng hỏi ngày/tháng mà không nói năm, mặc định tính toán trên năm {latest_year}.
4. Luôn dùng code Pandas để kiểm tra dữ liệu trước khi đưa ra con số.
5. Nếu không tìm thấy dữ liệu sau khi đã dùng code tìm kiếm, hãy nói rõ: "Dữ liệu thời điểm này không có trong hệ thống".
"""

        # 4. Khởi tạo Agent với các chốt chặn an toàn
        agent = create_pandas_dataframe_agent(
            llm, 
            df, 
            verbose=True, 
            allow_dangerous_code=True, # Cần thiết để chạy Pandas
            agent_type="openai-tools",
            prefix=system_prompt,
            max_iterations=3,           # Giới hạn 3 lần thử để tránh treo server
            handle_parsing_errors=True # Tự sửa lỗi nếu output định dạng sai
        )
        
        # 5. Thực hiện truy vấn
        # Thêm chỉ dẫn ép buộc vào cuối câu hỏi của user để Bot không quên nhiệm vụ
        final_input = f"{user_message} (Lưu ý: Chỉ dùng dữ liệu từ biến df, không tự tạo data giả)"
        
        response = agent.invoke({"input": final_input})
        
        # Trả về câu trả lời cuối cùng
        return response['output']
        
    except Exception as e:
        print(f"[-] Lỗi Chatbot nghiêm trọng: {e}")
        return "Tui đang bị 'rối não' một chút khi xử lý dữ liệu này. Sơn thử hỏi cụ thể hơn (ví dụ: kèm theo ngày tháng năm) xem sao nha!"