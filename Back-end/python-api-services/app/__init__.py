from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()

    app = Flask(__name__)
    
    #sign token
    app.secret_key = os.getenv("FLASK_SECRET_KEY")

    # link tới front
    CORS(app)

    
    from .routes import main 
    app.register_blueprint(main)

    return app