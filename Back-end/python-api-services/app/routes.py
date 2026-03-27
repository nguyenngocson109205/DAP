from flask import Blueprint, request, jsonify, session

from app.services.chatbot_service import get_chatbot_answer 
from app.services.ai_service import ai_service 

main = Blueprint("main", __name__)
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

@main.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        
        # 1. Chỉ lấy tên model từ Node.js gửi qua 
        model_type = data.get('model', 'lstm').lower() 
        
        # 2. BỎ LUÔN ĐOẠN CHECK FEATURES CŨ ĐI
        # Vì thằng ai_service bản mới nhất nó tự biết fetch data rồi!
        
        # 3. Gọi thẳng service (chỉ truyền model_type)
        prediction_result = ai_service.predict_aqi(model_type)
        
        if prediction_result is None:
            return jsonify({'error': f'Lỗi tính toán từ Model {model_type}'}), 500

        # Trả về kết quả (bây giờ prediction_result là 1 mảng 3 số)
        return jsonify({
            'status': 'success',
            'model': model_type,
            'prediction': prediction_result 
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 400
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