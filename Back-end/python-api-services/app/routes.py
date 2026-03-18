from flask import Blueprint, request, jsonify, session

# 1. Bỏ import cũ: from app.services.api_services import ask_gpt 
# 2. Import RAG Agent mới của chúng ta vào:
from app.services.chatbot_service import get_chatbot_answer 
from app.services.ai_service import ai_service 

main = Blueprint("main", __name__)

# --- ENDPOINT CHATBOT (ĐÃ ĐƯỢC NÂNG CẤP LÊN RAG) ---
@main.route("/chat", methods=["POST"])
def chat():
    # Khởi tạo lịch sử chat nếu chưa có
    if "history" not in session:
        session["history"] = [
            {"role": "system", "content": "Bạn là chuyên gia phân tích dữ liệu không khí AI AirCare."}
        ]

    user_msg = request.json.get("message", "")
    if not user_msg:
        return jsonify({"reply": "Bạn chưa nhập câu hỏi nào cả."}), 400
    
    # Lưu câu hỏi của user vào lịch sử
    session["history"].append({
        "role": "user",
        "content": user_msg
    })

    # Gọi RAG Agent xử lý dữ liệu CSV thay vì GPT chat thông thường
    try:
        # Lưu ý: Agent Langchain xử lý tốt nhất khi nhận câu hỏi trực tiếp (user_msg)
        # thay vì nhận nguyên mảng history như ask_gpt cũ.
        reply = get_chatbot_answer(user_msg)
        
    except Exception as e:
        reply = "Xin lỗi, server đang bận hoặc không thể đọc được dataset. Vui lòng thử lại sau."
        print(f"Chat Error: {e}")

    # Lưu câu trả lời của Bot vào lịch sử
    session["history"].append({
        "role": "assistant",
        "content": reply
    })

    return jsonify({"reply": reply})


# --- ENDPOINT PREDICT (GIỮ NGUYÊN - Rất tốt) ---
@main.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        
        # 1. Lấy tên model (đổi mặc định thành xgboost hoặc lstm cho khớp hệ thống)
        model_type = data.get('model', 'xgboost').lower() 
        
        # 2. LẤY MẢNG FEATURES TỪ WEB GỬI LÊN (Quan trọng nhất)
        features = data.get('features')
        
        # Kiểm tra xem Web có gửi features không và có đúng là danh sách (list) không
        if not features or not isinstance(features, list):
            return jsonify({'error': 'Thiếu dữ liệu features đầu vào hoặc định dạng không đúng (phải là list)'}), 400
        
        # 3. Truyền ĐẦY ĐỦ 2 tham số vào service
        prediction_result = ai_service.predict_aqi(model_type, features)
        
        if prediction_result is None:
            return jsonify({'error': f'Lỗi tính toán từ Model {model_type}'}), 500

        return jsonify({
            'status': 'success',
            'model': model_type,
            'prediction': round(prediction_result, 2) # Làm tròn 2 chữ số thập phân cho đẹp giao diện
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 400
    
# --- ENDPOINT LẤY DỮ LIỆU THỜI TIẾT THỰC TẾ ---
@main.route("/weather-forecast", methods=["GET"])
def get_weather():
    try:
        # 1. Gọi hàm cào dữ liệu từ 2 API (Weather & Air Quality) mà mình đã viết trong AIService
        weather_data = ai_service.get_weather_forecast()
        
        # 2. Kiểm tra nếu không lấy được dữ liệu
        if not weather_data:
            return jsonify({
                'status': 'error',
                'message': 'Không thể lấy dữ liệu từ Open-Meteo. Kiểm tra lại kết nối internet!'
            }), 500

        # 3. Trả về toàn bộ cục JSON (past_24h và future) cho Node.js/Web xử lý
        return jsonify(weather_data)

    except Exception as e:
        print(f"Weather API Error: {e}")
        return jsonify({'error': str(e)}), 400