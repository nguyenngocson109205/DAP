import pandas as pd
import os

_shared_df = None

def get_df():
    global _shared_df
    if _shared_df is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        csv_path = os.path.join(backend_dir, 'data', 'hcm_aqi_full_dataset.csv')
        
        print(f"[*] [DUY NHẤT] Đang nạp dữ liệu vào RAM từ: {csv_path}")
        _shared_df = pd.read_csv(csv_path)
        _shared_df['time'] = pd.to_datetime(_shared_df['time'])
        print("[*] Nạp dữ liệu thành công!")
        
    return _shared_df