from ultralytics import YOLO
import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify
from flask_cors import CORS
from threading import Thread, Lock
import time
import os
import random
from collections import deque
from datetime import datetime, timezone, timedelta

# Try to import from locals, otherwise use fallback
try:
    from gps_simulator import get_gps
    from alert_system import send_alert
except ImportError:
    # Fallback simulation logic if modules are missing
    lat, lon = -8.005, -60.005
    def get_gps():
        global lat, lon
        lat += random.uniform(-0.00005, 0.00005)
        lon += random.uniform(-0.00005, 0.00005)
        return round(lat, 6), round(lon, 6)
    def send_alert(lat, lon):
        print(f"🚨 Fallback Alert: Fire at {lat}, {lon}")

# ================== CONFIG ==================
# Corrected model path
MODEL_PATH = "runs/detect/fire_stage113/weights/best.pt"

WEBCAM = 0
VIDEO = "simulated_drone_fire_video.mp4"
PHONE = "http://10.221.92.234:8080/video"

SOURCE = VIDEO  # Set to simulated drone video per user request

CONF_THRESH = 0.25      # Lowered for better sensitivity
MIN_AREA_RATIO = 0.002 
TEMPORAL_FRAMES = 5
MIN_SATURATION = 60
DISPLAY_SCALE = 0.5

DASHBOARD_API = "http://localhost:3000/api/local-fires"
STREAM_PORT = 5000

# Weather API Config
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")  # Set in .env or system environment
WEATHER_UPDATE_INTERVAL = 300 # 5 minutes
# ============================================

app = Flask(__name__)
CORS(app) # Enable CORS for dashboard integration

print("🔥 Loading YOLO model...")
if not os.path.exists(MODEL_PATH):
    # Try fallback if the stage113 isn't available for some reason
    MODEL_PATH = "runs/detect/stage4/weights/best.pt"

model = YOLO(MODEL_PATH)
cap = cv2.VideoCapture(SOURCE)
cap_lock = Lock()

fire_counter = 0
alert_sent = False
latest_frame = None

# Real-time status for Dashboard API
detection_status = {
    "fire_detected": False,
    "location": {"lat": 0.0, "lon": 0.0},
    "confidence": 0.0,
    "timestamp": time.time(),
    "alert_status": "Monitoring",
    "weather": {
        "temp": 24,
        "humidity": 45,
        "wind_speed": 5,
        "description": "Clear Sky"
    },
    "fwi": {
        "score": 45,
        "level": "Moderate"
    }
}
confidence_history = deque(maxlen=45) # Rolling cache for analytics chart
status_lock = Lock()

def calculate_cbi(temp, rh):
    """
    Chandler Burning Index (CBI) - Method 1
    CBI = (((110 - 1.373*RH) - 0.54 * (10.2 - T)) * (124 * 10**(-0.0142*RH))) / 60
    """
    if rh > 100: rh = 100
    if rh < 0: rh = 0
    cbi = (((110 - 1.373 * rh) - 0.54 * (10.2 - temp)) * (124 * 10**(-0.0142 * rh))) / 60
    
    level = "Low"
    if cbi > 97.5: level = "Extreme"
    elif cbi > 90: level = "Very High"
    elif cbi > 75: level = "High"
    elif cbi > 50: level = "Moderate"
    
    return round(cbi, 1), level

def fetch_weather_loop():
    while True:
        try:
            with status_lock:
                lat = detection_status["location"]["lat"]
                lon = detection_status["location"]["lon"]
            
            if lat != 0 and lon != 0:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
                res = requests.get(url, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    temp = data["main"]["temp"]
                    humidity = data["main"]["humidity"]
                    wind = data["wind"]["speed"]
                    desc = data["weather"][0]["description"].title()
                    
                    cbi_score, cbi_level = calculate_cbi(temp, humidity)
                    
                    with status_lock:
                        detection_status["weather"] = {
                            "temp": temp,
                            "humidity": humidity,
                            "wind_speed": wind,
                            "description": desc
                        }
                        detection_status["fwi"] = {
                            "score": cbi_score,
                            "level": cbi_level
                        }
                    print(f"🌦️ Weather updated: {temp}°C, {humidity}%, CBI: {cbi_score} ({cbi_level})")
                else:
                    print(f"⚠️ Weather API Error: {res.status_code}")
        except Exception as e:
            print(f"❌ Weather fetch failed: {e}")
        
        time.sleep(WEATHER_UPDATE_INTERVAL)

# Start weather fetcher in background
Thread(target=fetch_weather_loop, daemon=True).start()

print(f"🔥 Fire Detection + Drone Stream Running (Source: {SOURCE})")

# ------------- FLASK ENDPOINTS -------------
@app.route("/video")
def video():
    def generate_stream():
        global latest_frame
        while True:
            if latest_frame is None:
                time.sleep(0.01)
                continue
            with status_lock:
                frame_copy = latest_frame.copy()
            _, buffer = cv2.imencode(".jpg", frame_copy)
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
            time.sleep(0.033) # ~30 FPS
    return Response(generate_stream(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/api/detection-status")
def get_detection_status():
    with status_lock:
        payload = detection_status.copy()
        payload["history"] = list(confidence_history)
        return jsonify(payload)

@app.route("/api/health")
def health():
    return jsonify({"status": "running", "source": SOURCE, "model": MODEL_PATH})

def run_flask():
    app.run(host="0.0.0.0", port=STREAM_PORT, debug=False, threaded=True)

Thread(target=run_flask, daemon=True).start()

# ------------- MAIN LOOP -------------
frame_count = 0
last_best_box = None
last_best_conf = 0.0
last_fire_detected = False

while True:
    loop_start_time = time.time()
    
    with cap_lock:
        ret, frame = cap.read()
        if not ret:
            if SOURCE == VIDEO: # Loop video
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            break

    frame_count += 1
    
    # Performance Optimization: Skip frames and use smaller imgsz
    if frame_count % 3 == 0 or frame_count == 1:
        results = model(frame, conf=CONF_THRESH, imgsz=320)
        fire_detected_this_frame = False
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        best_conf = 0
        best_box = None

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                
                # Area Filter
                area = (x2 - x1) * (y2 - y1)
                if area < MIN_AREA_RATIO * (frame.shape[0] * frame.shape[1]):
                    continue

                # Saturation Filter (Reflection Killer)
                roi = hsv[y1:y2, x1:x2]
                if roi.size > 0 and np.mean(roi[:, :, 1]) >= MIN_SATURATION:
                    fire_detected_this_frame = True
                    if conf > best_conf:
                        best_conf = conf
                        best_box = (x1, y1, x2, y2)
        
        last_best_box, last_best_conf, last_fire_detected = best_box, best_conf, fire_detected_this_frame
    else:
        best_box, best_conf, fire_detected_this_frame = last_best_box, last_best_conf, last_fire_detected

    if best_box:
        x1, y1, x2, y2 = best_box
        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
        cv2.putText(frame, f"FIRE {best_conf:.2f}", (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    # Temporal Confirmation
    if fire_detected_this_frame:
        fire_counter += 1
    else:
        fire_counter = max(0, fire_counter - 1)
        alert_sent = False

    lat, lon = get_gps()
    
    # Update Status
    with status_lock:
        detection_status.update({
            "fire_detected": fire_counter >= TEMPORAL_FRAMES,
            "location": {"lat": lat, "lon": lon},
            "confidence": best_conf,
            "timestamp": time.time(),
            "alert_status": "🔥 FIRE CONFIRMED" if fire_counter >= TEMPORAL_FRAMES else "Monitoring"
        })

    if fire_counter >= TEMPORAL_FRAMES:
        cv2.putText(frame, "🔥 REAL FIRE CONFIRMED", (20,40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)
        if not alert_sent:
            send_alert(lat, lon)
            def _async_dashboard_update(l1, l2, c):
                try:
                    requests.post(DASHBOARD_API, json={"lat": l1, "lon": l2, "confidence": round(c,3)}, timeout=2)
                except: pass
            Thread(target=_async_dashboard_update, args=(lat, lon, best_conf), daemon=True).start()
            alert_sent = True

    # Analytics History (Sample every 10 frames)
    if frame_count % 10 == 0:
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        current_ist = datetime.now(ist_tz).strftime("%H:%M:%S")
        with status_lock:
            confidence_history.append({"time": current_ist, "confidence": float(best_conf)})

    # Display and Stream Update
    display_frame = cv2.resize(frame, None, fx=DISPLAY_SCALE, fy=DISPLAY_SCALE)
    cv2.imshow("Fire Detection System", display_frame)
    with status_lock:
        latest_frame = display_frame.copy()

    # Dynamic Delay
    proc_time = (time.time() - loop_start_time) * 1000
    if cv2.waitKey(max(1, int(33 - proc_time))) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
