from flask import Blueprint, request, jsonify, session
# 1. Import service Chatbot cũ
from app.services.api_services import ask_gpt 
# 2. Import service AI Dự báo mới (QUAN TRỌNG)
from app.services.ai_service import ai_service 

# Đặt tên blueprint là 'main' hoặc 'api' cho tổng quát (thay vì chat_bp)
main = Blueprint("main", __name__)

# --- ROUTE 1: CHATBOT (Code cũ của bạn) ---
@main.route("/chat", methods=["POST"])
def chat():
    # Kiểm tra xem có history trong session chưa
    if "history" not in session:
        session["history"] = [
            {"role": "system", "content": "Bạn là chatbot hỗ trợ học Python"}
        ]

    # Lấy tin nhắn từ User
    user_msg = request.json.get("message", "")
    
    session["history"].append({
        "role": "user",
        "content": user_msg
    })

    # Gọi GPT xử lý
    try:
        reply = ask_gpt(session["history"])
    except Exception as e:
        reply = "Xin lỗi, server đang bận. Vui lòng thử lại sau."
        print(f"Chat Error: {e}")

    session["history"].append({
        "role": "assistant",
        "content": reply
    })

    return jsonify({"reply": reply})

# --- ROUTE 2: DỰ BÁO AI (Code mới thêm) ---
@main.route("/predict", methods=["POST"])
def predict():
    try:
        # Lấy tham số 'model' từ frontend gửi lên (gru hoặc xgboost)
        data = request.get_json()
        model_type = data.get('model', 'gru') # Mặc định dùng GRU nếu không chọn
        
        # Gọi Service AI để tính toán
        prediction_result = ai_service.predict_aqi(model_type)
        
        # Kiểm tra kết quả
        if not prediction_result:
            return jsonify({'error': 'Lỗi tính toán từ Model'}), 500

        # Trả về JSON cho Frontend vẽ biểu đồ
        return jsonify({
            'status': 'success',
            'model': model_type,
            'prediction': prediction_result
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 400