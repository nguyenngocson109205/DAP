import os
import sys

# Đã dọn dẹp sạch sẽ các bùa chú của TensorFlow vì không xài nữa
import xgboost as xgb
from sklearn.multioutput import MultiOutputRegressor
from sklearn.linear_model import Ridge
import pandas as pd
import numpy as np
import joblib
import requests
import datetime
import warnings 
import math

# import tensorflow as tf  <--- ĐÃ CẤM CỬA TENSORFLOW ĐỂ SERVER BẤT TỬ

warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

class AIService:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.is_loaded = False # Đã xóa dòng gọi load để Lazy Load hoạt động thực sự!

    def load_all_resources(self):
        print("\n--- BẮT ĐẦU NẠP HỆ THỐNG MODEL & SCALER ---")
        
        # 1. NẠP SCALER (Chỉ nạp cho XGBoost/Ridge)
        try:
            self.scalers['X_xgb']  = joblib.load(os.path.join(MODEL_DIR, 'scaler_X_XGB.pkl'))
            self.scalers['y_xgb']  = joblib.load(os.path.join(MODEL_DIR, 'scaler_y_XGB.pkl'))
            print("[V] Scalers: Nạp thành công!")
        except Exception as e:
            print(f"[X] Lỗi nạp Scaler: {e}")

        # 2. NẠP RIDGE
        try:
            path_ridge = os.path.join(MODEL_DIR, 'ridge_pm25_multi_v1.pkl')
            self.models['ridge'] = joblib.load(path_ridge)
            print("[V] Ridge: OK")
        except Exception as e:
            print(f"[X] Ridge THẤT BẠI: {e}")

        # 3. NẠP XGBOOST
        try:
            path_xgb = os.path.join(MODEL_DIR, 'xgboost_pm25_multi_v1.pkl')
            self.models['xgboost'] = joblib.load(path_xgb)
            print("[V] XGBoost: OK")
        except Exception as e:
            print(f"[X] XGBoost THẤT BẠI: {e}")

        print("------------------------------------------")
        print(f"📊 DANH SÁCH MODEL SẴN SÀNG: {list(self.models.keys())}")
        print("------------------------------------------\n")

    def get_weather_forecast(self):
        """Hàm này dành riêng cho Frontend lấy dữ liệu vẽ biểu đồ"""
        try:
            lat, lon = 10.8231, 106.6297
            params = f"latitude={lat}&longitude={lon}&timezone=Asia%2FBangkok&past_days=1&forecast_days=2"
            
            url_weather = f"https://api.open-meteo.com/v1/forecast?{params}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m"
            url_air = f"https://air-quality-api.open-meteo.com/v1/air-quality?{params}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide"
            
            res_weather = requests.get(url_weather).json()
            res_air = requests.get(url_air).json()

            now = datetime.datetime.now()
            current_hour_idx = 24 + now.hour 

            hourly_w = res_weather['hourly']
            hourly_a = res_air['hourly']

            past_24h_data = []
            future_data = []

            for i in range(24, 0, -1):
                idx = current_hour_idx - i
                past_24h_data.append({
                    'time': hourly_w['time'][idx],
                    'pm25': hourly_a['pm2_5'][idx] if hourly_a['pm2_5'][idx] is not None else 0,
                })

            for i in range(48): 
                idx = current_hour_idx + i
                if idx < len(hourly_w['time']):
                    future_data.append({
                        'time': hourly_w['time'][idx],
                        'pm25': hourly_a['pm2_5'][idx] if hourly_a['pm2_5'][idx] is not None else 0,
                        'temp': hourly_w['temperature_2m'][idx],
                        'humid': hourly_w['relative_humidity_2m'][idx],
                        'rain': hourly_w['precipitation'][idx],
                        'wind_speed': hourly_w['wind_speed_10m'][idx],
                        'wind_dir': hourly_w['wind_direction_10m'][idx]
                    })

            return {
                "past_24h": past_24h_data, 
                "future": future_data
            }
        except Exception as e:
            print(f"[-] Lỗi API Weather cho Web: {e}")
            return None

    def fetch_and_preprocess_data(self):
        """Gọi API Open-Meteo và dùng Pandas để Feature Engineering y hệt lúc Train"""
        try:
            lat, lon = 10.8231, 106.6297
            params = f"latitude={lat}&longitude={lon}&timezone=Asia%2FBangkok&past_days=3&forecast_days=0"
            
            url_weather = f"https://api.open-meteo.com/v1/forecast?{params}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m"
            url_air = f"https://air-quality-api.open-meteo.com/v1/air-quality?{params}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide"
            
            res_w = requests.get(url_weather).json()['hourly']
            res_a = requests.get(url_air).json()['hourly']

            df = pd.DataFrame({
                'time': pd.to_datetime(res_w['time']),
                'PM2.5': res_a['pm2_5'],
                'PM10': res_a['pm10'],
                'NO2': res_a['nitrogen_dioxide'],
                'CO': res_a['carbon_monoxide'],
                'SO2': res_a['sulphur_dioxide'],
                'O3': res_a['ozone'],
                'Temperature': res_w['temperature_2m'],
                'Humidity': res_w['relative_humidity_2m'],
                'Rain': res_w['precipitation'],
                'Wind_Speed': res_w['wind_speed_10m'],
                'Wind_Dir': res_w['wind_direction_10m']
            })
            
            df.set_index('time', inplace=True)
            df.interpolate(method='linear', inplace=True)
            df.bfill(inplace=True) 

            df['hour_sin'] = np.sin(2 * np.pi * df.index.hour / 24)
            df['hour_cos'] = np.cos(2 * np.pi * df.index.hour / 24)
            df['doy_sin'] = np.sin(2 * np.pi * df.index.dayofyear / 365)
            df['doy_cos'] = np.cos(2 * np.pi * df.index.dayofyear / 365)
            df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)

            wd_rad = df['Wind_Dir'] * np.pi / 180
            df['Wind_sin'] = np.sin(wd_rad)
            df['Wind_cos'] = np.cos(wd_rad)

            for lag in range(1, 25):
                df[f'PM2.5_lag_{lag}'] = df['PM2.5'].shift(lag)

            df.dropna(inplace=True) 
            return df
            
        except Exception as e:
            print(f"[-] Lỗi fetch/preprocess dữ liệu: {e}")
            return None

    # Đã đổi mặc định thành xgboost
    def predict_aqi(self, model_type='xgboost'): 
        """Thực thi dự báo đa bước (T+1, T+2, T+3) dựa trên loại Model"""
        
        if not self.is_loaded:
            print("⏳ Có yêu cầu dự báo! Lần đầu tiên gọi model, bắt đầu nạp vào RAM...")
            self.load_all_resources()
            self.is_loaded = True

        df = self.fetch_and_preprocess_data()
        if df is None or df.empty:
            return None

        model_type = model_type.lower()
        
        if model_type not in self.models:
            print(f"❌ CẢNH BÁO: Model '{model_type}' chưa được nạp!")
            return None

        try:
            # Đã fix lại cú pháp IF
            if model_type in ['xgboost', 'ridge']:
                recent_1h = df.tail(1).values
                scaled_X = self.scalers['X_xgb'].transform(recent_1h)
                
                pred_scaled = self.models[model_type].predict(scaled_X)
                pred_real = self.scalers['y_xgb'].inverse_transform(pred_scaled)[0]
                
                return [round(float(max(0, val)), 2) for val in pred_real]

        except Exception as e:
            print(f"❌ Lỗi Predict Model {model_type}: {e}")
            return None

# Khởi tạo Service
ai_service = AIService()