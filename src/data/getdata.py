import requests
import json

# Địa chỉ API
API_URL = "https://testnet.arcscan.app/api/v2/stats"

try:
    # Lấy dữ liệu từ API
    response = requests.get(API_URL)
    response.raise_for_status() # Kiểm tra lỗi HTTP
    
    # Gán toàn bộ JSON (dạng dictionary) cho biến getdata
    getdata = response.json() 
    
    # Dòng 5: Truy cập giá gas trung bình
    # Cấu trúc: [root dictionary] -> [gas_prices dictionary] -> [average dictionary] -> [price float]
    gas_price = getdata['gas_prices']['average']
    print(f"Giá gas trung bình: {gas_price} Gwei")
    
except requests.RequestException as e:
    print(f"Lỗi khi gọi API: {e}")
except KeyError as e:
    print(f"Lỗi KeyError: Thiếu khóa {e} trong dữ liệu JSON. Cấu trúc dữ liệu có thể đã thay đổi.")