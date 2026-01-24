from flask import Blueprint, request, jsonify, session
from app.services.api_services import ask_gpt

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    if "history" not in session:
        session["history"] = [
            {"role": "system", "content": "Bạn là chatbot hỗ trợ học Python"}
        ]

    session["history"].append({
        "role": "user",
        "content": request.json["message"]
    })

    reply = ask_gpt(session["history"])

    session["history"].append({
        "role": "assistant",
        "content": reply
    })

    return jsonify({"reply": reply})
