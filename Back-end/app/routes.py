from flask import Blueprint, request, jsonify, session
from app.services.api_services import ask_gpt 
from app.services.ai_service import ai_service 

main = Blueprint("main", __name__)

#chat box/ POST
@main.route("/chat", methods=["POST"])
def chat():
    if "history" not in session:
        session["history"] = [
            {"role": "system", "content": "Bạn là chatbot hỗ trợ học Python"}
        ]

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