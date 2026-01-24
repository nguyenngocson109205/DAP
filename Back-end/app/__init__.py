from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-key")

    CORS(app)

    from .routes import chat_bp
    app.register_blueprint(chat_bp)

    return app   # 👈 BẮT BUỘC
