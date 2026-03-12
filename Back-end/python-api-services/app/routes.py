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
        model_type = data.get('model', 'gru') 
        
        prediction_result = ai_service.predict_aqi(model_type)
        
        if not prediction_result:
            return jsonify({'error': 'Lỗi tính toán từ Model'}), 500

        return jsonify({
            'status': 'success',
            'model': model_type,
            'prediction': prediction_result
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 400