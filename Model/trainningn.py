import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
import os

# ==============================================================================
# 1. LOAD DỮ LIỆU
# ==============================================================================
# 👇 SỬA TÊN FILE CSV CỦA BẠN Ở ĐÂY
csv_file_path = 'Sydney_Air_Quality.csv' 

if not os.path.exists(csv_file_path):
    print(f"❌ LỖI: Không tìm thấy file '{csv_file_path}'!")
    print("👉 Hãy copy file CSV dữ liệu vào cùng thư mục với file code này.")
    exit()

print("🔄 Đang đọc dữ liệu...")
df = pd.read_csv(csv_file_path)

# ==============================================================================
# 2. LÀM SẠCH & FEATURE ENGINEERING (TỔNG HỢP)
# ==============================================================================
print("🛠️ Đang xử lý dữ liệu...")

# 2.1. Xử lý thời gian
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values('Date').set_index('Date')
df = df.interpolate(method='time') # Lấp ô trống
df = df[~df.index.duplicated(keep='first')] # Xóa trùng

# 2.2. Xử lý Outliers (Kẹp trần 3*IQR)
cols_to_fix = ['PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'O3']
for col in cols_to_fix:
    if col in df.columns:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        df[col] = df[col].clip(lower=Q1 - 3*IQR, upper=Q3 + 3*IQR)

# 2.3. Feature Engineering (Tạo đặc trưng mới)
df['Hour'] = df.index.hour
df['DayOfWeek'] = df.index.dayofweek
df['Month'] = df.index.month

# Cyclical Encoding
df['Hour_Sin'] = np.sin(2 * np.pi * df['Hour'] / 24)
df['Hour_Cos'] = np.cos(2 * np.pi * df['Hour'] / 24)
df['Day_Sin'] = np.sin(2 * np.pi * df['DayOfWeek'] / 7)
df['Day_Cos'] = np.cos(2 * np.pi * df['DayOfWeek'] / 7)
df['Is_Rush_Hour'] = df['Hour'].apply(lambda h: 1 if (7<=h<=9) or (16<=h<=19) else 0)
df['Is_Weekend'] = df['DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

# ==============================================================================
# 3. CHUẨN BỊ DATA CHO LSTM
# ==============================================================================
# Chọn cột để train
feature_cols = ['PM2.5', 'NO2', 'CO', 'O3', 'SO2', 
                'Hour_Sin', 'Hour_Cos', 'Day_Sin', 'Day_Cos', 
                'Is_Rush_Hour', 'Is_Weekend']

# Lọc chỉ lấy các cột có trong dữ liệu thực tế
valid_cols = [c for c in feature_cols if c in df.columns]
data_values = df[valid_cols].values

# Chia Train/Test
train_size = int(len(data_values) * 0.8)
train_data = data_values[:train_size]
test_data = data_values[train_size:]

# Scaling (Quan trọng)
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_train = scaler.fit_transform(train_data)
scaled_test = scaler.transform(test_data)

# Lưu Scaler
joblib.dump(scaler, 'final_scaler.pkl')
print("✅ Đã lưu Scaler: final_scaler.pkl")

# Hàm tạo cửa sổ trượt (Sliding Window)
def create_sequences(dataset, look_back=24):
    X, y = [], []
    for i in range(look_back, len(dataset)):
        X.append(dataset[i-look_back:i, :]) # Lấy 24h quá khứ
        y.append(dataset[i, 0])             # Lấy PM2.5 hiện tại (cột index 0)
    return np.array(X), np.array(y)

LOOK_BACK = 24
X_train, y_train = create_sequences(scaled_train, LOOK_BACK)
X_test, y_test = create_sequences(scaled_test, LOOK_BACK)

# ==============================================================================
# 4. LƯU FILE .NPZ (CÁI MÀ BẠN ĐANG THIẾU)
# ==============================================================================
print("💾 Đang lưu file 'processed_data.npz'...")
np.savez('processed_data.npz', 
         X_train=X_train, 
         y_train=y_train, 
         X_test=X_test, 
         y_test=y_test)

print("-" * 50)
print(f"✅ XONG! Đã tạo ra file: {os.path.abspath('processed_data.npz')}")
print("👉 Giờ bạn hãy chạy lại file trainningn.py là sẽ hết lỗi!")