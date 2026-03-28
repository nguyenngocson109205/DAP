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
def get_chatbot_answer(user_message):
    """
    Hàm xử lý Chatbot: GPT-4o-mini + Pandas Agent.
    """
    if df is None:
        return "Xin lỗi, dữ liệu AQI chưa được nạp. Vui lòng kiểm tra file CSV."
    
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        
        min_date = df['time'].min().strftime('%d/%m/%Y')
        max_date = df['time'].max().strftime('%d/%m/%Y')
        latest_year = df['time'].max().year
        
        # 3. Prompt mới: Phân luồng tư duy rõ ràng
        system_prompt = f"""Bạn là Chuyên gia tư vấn Chất lượng không khí (AQI) tại TP.HCM.
        
[DỮ LIỆU LỊCH SỬ TRONG FILE]:
- Biến DataFrame 'df' chứa dữ liệu từ {min_date} đến {max_date}.
- CHỈ tra cứu 'df' khi người dùng hỏi về các thông số trong quá khứ.

[QUY TẮC BẮT BUỘC]:
1. NẾU người dùng tự cung cấp chỉ số (ví dụ: "PM2.5 hiện tại là 19.9, tôi có nên ra đường không?"): TUYỆT ĐỐI KHÔNG dùng code Pandas. Hãy dùng kiến thức chuyên môn của bạn để tư vấn ngay lập tức (Ví dụ: ngưỡng an toàn WHO cho PM2.5 24h là 15 µg/m³).
2. NẾU người dùng hỏi xin lời khuyên chung chung, hãy trả lời tự nhiên.
3. NẾU người dùng yêu cầu tra cứu lịch sử: LUÔN BẮT ĐẦU code bằng `import pandas as pd` và LUÔN dùng `print()` để in kết quả cuối cùng.
4. Nếu đã tra cứu lịch sử trong 'df' mà không có dữ liệu, mới trả lời: "Dữ liệu thời điểm này không có trong hệ thống".
5. Trả lời bằng Tiếng Việt thân thiện, chuyên nghiệp, ngắn gọn.
"""

        agent = create_pandas_dataframe_agent(
            llm, 
            df, 
            verbose=True, 
            allow_dangerous_code=True, 
            agent_type="openai-tools",
            prefix=system_prompt,
            max_iterations=5,  # Tăng lên 5 để Agent không bị ngắt ngang họng
            handle_parsing_errors=True 
        )
        
        final_input = f"{user_message} (Lưu ý: Chỉ dùng dữ liệu từ biến df, không tự tạo data giả)"
        
        response = agent.invoke({"input": final_input})
        
        return response['output']
        
    except Exception as e:
        print(f"[-] Lỗi Chatbot nghiêm trọng: {e}")
        return "Tui đang bị 'rối não' một chút khi xử lý dữ liệu này. Sơn thử hỏi cụ thể hơn (ví dụ: kèm theo ngày tháng năm) xem sao nha!"