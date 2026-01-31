from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()

    app = Flask(__name__)
    
    # Secret Key (Quan trọng cho session)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-key-bi-mat-cua-son")

    # Cho phép Frontend gọi API (CORS)
    CORS(app)

    # --- SỬA Ở ĐÂY ---
    # Vì trong routes.py mình đặt tên là 'main', nên ở đây phải import 'main'
    from .routes import main 
    app.register_blueprint(main)

    return app