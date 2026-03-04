import os
import numpy as np
import joblib
import requests
import datetime
import math
import warnings 
from tensorflow.keras.models import load_model

warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

IDX_HOUR_SIN = 0
IDX_HOUR_COS = 1
IDX_TEMP       = 12
IDX_HUMID      = 13
IDX_RAIN       = 14
IDX_WIND_SPEED = 15
IDX_WIND_SIN   = 16
IDX_WIND_COS   = 17
IDX_DEW_POINT  = 18
IDX_PM25_LAG1  = 20 

class AIService:
    def __init__(self):
        self.model = None
        self.scaler_X = None
        self.scaler_y = None
        self.sample_input = None 
        self.is_loaded = False

    # def load_resources(self):
        # if self.is_loaded: return
        # try:
        #     self.model = load_model(os.path.join(MODEL_DIR, 'aqi_forecasting_gru_24h_vfinal.keras'))
        #     self.scaler_X = joblib.load(os.path.join(MODEL_DIR, 'scaler_X_final.pkl'))
        #     self.scaler_y = joblib.load(os.path.join(MODEL_DIR, 'scaler_y_final.pkl'))
        #     self.sample_input = np.load(os.path.join(MODEL_DIR, 'sample_input.npy'))
        #     self.is_loaded = True
        #     print("[+] BÁO CÁO: Nạp toàn bộ Model (.keras), Scaler (.pkl) và Sample (.npy) THÀNH CÔNG! 🚀")
        # except Exception as e:
        #     print(f"[-] Lỗi load resources: {e}")

    def get_weather_forecast(self):
        try:
            url = "https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&hourly=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,wind_direction_10m&timezone=Asia%2FBangkok&forecast_days=2"
            response = requests.get(url).json()
            now = datetime.datetime.now()
            current_hour_idx = now.hour 
            hourly = response['hourly']
            forecast_data = []
            for i in range(24):
                idx = current_hour_idx + i
                forecast_data.append({
                    'temp': hourly['temperature_2m'][idx],
                    'humid': hourly['relative_humidity_2m'][idx],
                    'rain': hourly['rain'][idx],
                    'wind_speed': hourly['wind_speed_10m'][idx],
                    'wind_dir': hourly['wind_direction_10m'][idx]
                })
            return forecast_data
        except Exception as e:
            print(f"Lỗi API Weather: {e}")
            return None

    def predict_aqi(self, model_type='gru', current_hour=0):
        self.load_resources()
        if not self.is_loaded: return [0]*24

        weather_forecast = self.get_weather_forecast()
        current_input_scaled = self.sample_input.copy()
        future_aqi = []

        for i in range(24):
            # 1. Dự báo
            pred_scaled = self.model.predict(current_input_scaled, verbose=0)
            pred_val_real = self.scaler_y.inverse_transform(pred_scaled)[0][0]
            
            final_val = float(max(0, pred_val_real)) 
            future_aqi.append(round(final_val, 2))

            # 2. Update Input cho vòng sau
            last_row_scaled = current_input_scaled[0, -1, :].reshape(1, -1)
            last_row_real = self.scaler_X.inverse_transform(last_row_scaled)
            
            # Update Time
            next_hour = (current_hour + i + 1) % 24
            last_row_real[0, IDX_HOUR_SIN] = math.sin(2 * math.pi * next_hour / 24)
            last_row_real[0, IDX_HOUR_COS] = math.cos(2 * math.pi * next_hour / 24)
            
            # Update Weather
            if weather_forecast:
                w = weather_forecast[i]
                last_row_real[0, IDX_TEMP]       = w['temp']
                last_row_real[0, IDX_HUMID]      = w['humid']
                last_row_real[0, IDX_RAIN]       = w['rain']
                last_row_real[0, IDX_WIND_SPEED] = w['wind_speed']
                
                wd_rad = w['wind_dir'] * math.pi / 180
                last_row_real[0, IDX_WIND_SIN] = math.sin(wd_rad)
                last_row_real[0, IDX_WIND_COS] = math.cos(wd_rad)
                last_row_real[0, IDX_DEW_POINT] = w['temp'] - ((100 - w['humid']) / 5)

            # Update Lag
            last_row_real[0, IDX_PM25_LAG1] = final_val

            # Transform & Shift
            new_row_scaled = self.scaler_X.transform(last_row_real)
            current_input_scaled = np.roll(current_input_scaled, -1, axis=1)
            current_input_scaled[0, -1, :] = new_row_scaled[0, :]
            
        return future_aqi

ai_service = AIService()