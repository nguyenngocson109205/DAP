import os
import numpy as np
import joblib
import requests
import datetime
import math
import warnings 

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

import tensorflow as tf
from tensorflow.keras.models import load_model

# --- ĐOẠN CODE "CHỮA CHÁY" LỖI PHIÊN BẢN TENSORFLOW ---
class CustomLSTM(tf.keras.layers.LSTM):
    def __init__(self, *args, **kwargs):
        # Cắt bỏ cái thông số time_major gây lỗi trước khi load
        kwargs.pop('time_major', None) 
        super().__init__(*args, **kwargs)
class AIService:
    def __init__(self):
        self.model_dir = MODEL_DIR
        self.models = {}
        
        # Khai báo các biến chứa Scaler và Sample Input
        self.sample_input = None
        self.scaler_X_LSTM = None
        self.scaler_y_LSTM = None
        self.scaler_X_XGB = None
        self.scaler_y_XGB = None
        
        self._load_all_models()

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
            # 1. Khai báo tọa độ TP.HCM và cấu hình lấy 1 ngày quá khứ, 2 ngày tương lai
            lat, lon = 10.8231, 106.6297
            params = f"latitude={lat}&longitude={lon}&timezone=Asia%2FBangkok&past_days=1&forecast_days=2"
            
            # 2. Gọi API Thời tiết (Lấy future weather để dự báo)
            # Lưu ý: Chữ precipitation tương ứng với cột Rain lúc Sơn train
            url_weather = f"https://api.open-meteo.com/v1/forecast?{params}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m"
            res_weather = requests.get(url_weather).json()

            # 3. Gọi API Không khí (Lấy past AQI, PM2.5 để làm Lag)
            url_air = f"https://air-quality-api.open-meteo.com/v1/air-quality?{params}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,us_aqi,uv_index"
            res_air = requests.get(url_air).json()

            # Lấy index của giờ hiện tại
            now = datetime.datetime.now()
            # Vì past_days=1 nên giờ hiện tại sẽ nằm ở mảng thứ 24 (bắt đầu từ 0)
            current_hour_idx = 24 + now.hour 

            hourly_w = res_weather['hourly']
            hourly_a = res_air['hourly']

            past_24h_data = []
            future_data = []

            # 4. Gom 24 giờ TRƯỚC (Quá khứ)
            for i in range(24, 0, -1):
                idx = current_hour_idx - i
                past_24h_data.append({
                    'time': hourly_w['time'][idx],
                    'pm25': hourly_a['pm2_5'][idx], # Lấy PM2.5 làm Lag
                    'pm10': hourly_a['pm10'][idx],
                    'temp': hourly_w['temperature_2m'][idx],
                    'humid': hourly_w['relative_humidity_2m'][idx],
                    'rain': hourly_w['precipitation'][idx],
                    'wind_speed': hourly_w['wind_speed_10m'][idx],
                    'wind_dir': hourly_w['wind_direction_10m'][idx]
                })

            # 5. Gom 24 giờ TỚI (Tương lai)
            for i in range(24):
                idx = current_hour_idx + i
                future_data.append({
                    'time': hourly_w['time'][idx],
                    # Tương lai chưa có thực tế, PM2.5 ở đây là do Open-Meteo dự báo (chỉ để tham khảo)
                    'pm25': hourly_a['pm2_5'][idx], 
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
            print(f"Lỗi gọi 2 API Weather/Air: {e}")
            return None
        
    def _load_all_models(self):
        try:
            # ==========================================
            # PHẦN 1: LOAD SCALERS & SAMPLE INPUT
            # ==========================================
            # 1.1 Load Sample Input
            sample_path = os.path.join(self.model_dir, 'sample_input.npy')
            if os.path.exists(sample_path):
                self.sample_input = np.load(sample_path)
                print("✅ Đã load thành công sample_input.npy")

            # 1.2 Load Scalers cho LSTM
            if os.path.exists(os.path.join(self.model_dir, 'scaler_X_LSTM.pkl')):
                self.scaler_X_LSTM = joblib.load(os.path.join(self.model_dir, 'scaler_X_LSTM.pkl'))
                print("✅ Đã load thành công scaler_X_LSTM")
            
            if os.path.exists(os.path.join(self.model_dir, 'scaler_y_LSTM.pkl')):
                self.scaler_y_LSTM = joblib.load(os.path.join(self.model_dir, 'scaler_y_LSTM.pkl'))
                print("✅ Đã load thành công scaler_y_LSTM")

            # 1.3 Load Scalers cho XGBoost (Ridge có thể xài chung scaler này)
            if os.path.exists(os.path.join(self.model_dir, 'scaler_X_XGB.pkl')):
                self.scaler_X_XGB = joblib.load(os.path.join(self.model_dir, 'scaler_X_XGB.pkl'))
                print("✅ Đã load thành công scaler_X_XGB")
            
            if os.path.exists(os.path.join(self.model_dir, 'scaler_y_XGB.pkl')):
                self.scaler_y_XGB = joblib.load(os.path.join(self.model_dir, 'scaler_y_XGB.pkl'))
                print("✅ Đã load thành công scaler_y_XGB")

            # ==========================================
            # PHẦN 2: LOAD MODELS
            # ==========================================
            # 2.1 Load LSTM
            # 2.1 Load LSTM (truyền thêm cái custom_objects vào để nó xài class "chữa cháy" ở trên)
            lstm_path = os.path.join(self.model_dir, 'lstm_aqi_model.h5')
            if os.path.exists(lstm_path):
                self.models['lstm'] = load_model(lstm_path, custom_objects={'LSTM': CustomLSTM},compile=False)
                print("✅ Đã load thành công LSTM")
            
            # 2.2 Load XGBoost
            xgb_path = os.path.join(self.model_dir, 'xgboost_pm25_multi_v1.pkl')
            if os.path.exists(xgb_path):
                self.models['xgboost'] = joblib.load(xgb_path)
                print("✅ Đã load thành công XGBoost")

            # 2.3 Load Ridge
            ridge_path = os.path.join(self.model_dir, 'ridge_pm25_multi_v1.pkl')
            if os.path.exists(ridge_path):
                self.models['ridge'] = joblib.load(ridge_path)
                print("✅ Đã load thành công Ridge")
            
            print("--- Trạng thái Load Models & Scalers: HOÀN TẤT ---")

        except Exception as e:
            print(f"❌ Lỗi load model/scaler: {e}")
    def predict_aqi(self, model_type, features):
        """
        Hàm thực hiện dự báo AQI (hoặc PM2.5) dựa trên model được chọn.
        Tự động áp dụng đúng Scaler và định dạng Shape (2D/3D).
        """
        # Đưa tên model về chữ thường để tránh lỗi gõ nhầm
        model_type = model_type.lower()
        
        if model_type not in self.models:
            print(f"❌ Lỗi: Model '{model_type}' chưa được nạp vào hệ thống!")
            return None
        
        try:
            # 1. Đưa dữ liệu đầu vào thành mảng 2D NumPy: (1 dòng, n_features cột)
            data_2d = np.array(features).reshape(1, -1)
            
            raw_prediction = 0
            final_aqi = 0

            # ==========================================
            # LUỒNG 1: XỬ LÝ CHO DEEP LEARNING (LSTM)
            # ==========================================
            if model_type == 'lstm':
                # Tiền xử lý: Scale biến X bằng scaler_X_LSTM
                if self.scaler_X_LSTM is not None:
                    data_scaled = self.scaler_X_LSTM.transform(data_2d)
                else:
                    data_scaled = data_2d
                
                # Đổi Shape sang 3D cho LSTM: (samples, timesteps, features)
                data_3d = data_scaled.reshape(1, 1, -1)
                
                # Gọi model dự đoán
                raw_prediction = self.models['lstm'].predict(data_3d, verbose=0)[0][0]
                
                # Hậu xử lý: Giải mã kết quả (Inverse Transform) bằng scaler_y_LSTM
                if self.scaler_y_LSTM is not None:
                    pred_2d = np.array([[raw_prediction]])
                    final_aqi = self.scaler_y_LSTM.inverse_transform(pred_2d)[0][0]
                else:
                    final_aqi = raw_prediction

            # ==========================================
            # LUỒNG 2: XỬ LÝ CHO MACHINE LEARNING (XGBOOST, RIDGE)
            # ==========================================
            elif model_type in ['xgboost', 'ridge']:
                # Tiền xử lý: Scale biến X bằng scaler_X_XGB
                if self.scaler_X_XGB is not None:
                    data_scaled = self.scaler_X_XGB.transform(data_2d)
                else:
                    data_scaled = data_2d
                
                # Gọi model dự đoán (ML truyền thống xài luôn mảng 2D)
                raw_prediction = self.models[model_type].predict(data_scaled)[0]
                
                # Hậu xử lý: Giải mã kết quả (Inverse Transform) bằng scaler_y_XGB
                if self.scaler_y_XGB is not None:
                    pred_2d = np.array([[raw_prediction]])
                    final_aqi = self.scaler_y_XGB.inverse_transform(pred_2d)[0][0]
                else:
                    final_aqi = raw_prediction

            # Trả về kết quả thực tế (ép kiểu float cho chắc ăn)
            return float(final_aqi)

        except Exception as e:
            print(f"❌ Lỗi trong quá trình tính toán của model '{model_type}': {e}")
            return None
        
ai_service = AIService()