from ultralytics import YOLO
import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from threading import Thread, Lock
import time
import sys
import os
import random
from collections import deque
from datetime import datetime, timezone, timedelta
print("=== BACKEND STARTING ===")
print("RUNNING FILE:", __file__)

# Add src to path if gps_simulator and alert_system are there
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from gps_simulator import get_gps
    from alert_system import send_alert
except ImportError:
    # Fallback GPS simulator if import fails
    print("⚠️ Warning: Using fallback GPS simulator")
    import random
    
    # Amazon Hotspot (Matches useSatFires.js centers)
    lat = -8.005
    lon = -60.005
    
    def get_gps():
        global lat, lon
        # Tighter jitter so the drone stays within the core of the thermal blob
        lat += random.uniform(-0.00005, 0.00005)
        lon += random.uniform(-0.00005, 0.00005)
        return round(lat, 6), round(lon, 6)
    
    def send_alert(lat, lon):
        print(f"🚨 FIRE ALERT at {lat}, {lon}")

# ================== CONFIG ==================
# Update this path to match your model location
MODEL_PATH = "runs/detect/fire_stage113/weights/best.pt"

WEBCAM = 0
VIDEO = "simulated_drone_fire_video.mp4"
PHONE = "http://192.0.0.4:8080/video"

# Source configuration
SOURCE_MAP = {
    "video": VIDEO,
    "camera": WEBCAM,
    "phone": PHONE
}

SOURCE = VIDEO   # Initial default source
current_source_name = "video"  # Track current source name

CONF_THRESH = 0.25
MIN_AREA_RATIO = 0.002
TEMPORAL_FRAMES = 5
MIN_SATURATION = 60
DISPLAY_SCALE = 0.5

DASHBOARD_API = "http://localhost:3000/api/local-fires"
STREAM_PORT = 5000
# ============================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

print("🔥 Loading YOLO model...")

if not os.path.exists(MODEL_PATH):
    print("❌ Model not found:", MODEL_PATH)
    sys.exit(1)

model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully")

# ============ VIDEO CAPTURE WITH LOCK ============
cap = None
cap_lock = Lock()  # Protects VideoCapture operations

def open_source(source):
    """
    Safely opens a video source with proper error handling.
    Returns: (VideoCapture object, success boolean)
    """
    try:
        new_cap = cv2.VideoCapture(source)
        if not new_cap.isOpened():
            print(f"❌ Could not open source: {source}")
            return None, False
        print(f"✅ Successfully opened source: {source}")
        return new_cap, True
    except Exception as e:
        print(f"❌ Error opening source {source}: {e}")
        return None, False

print("📹 Opening initial video source...")
cap, success = open_source(SOURCE)
if not success:
    print(f"❌ Error: Could not open initial video source: {SOURCE}")
    sys.exit(1)
print("✅ Video source opened")

fire_counter = 0
alert_sent = False
latest_frame = None

# Weather API Config
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")  # Set in .env or system environment
WEATHER_UPDATE_INTERVAL = 300

# ============ REAL-TIME STATUS & HISTORY ============
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
confidence_history = deque(maxlen=45) # rolling cache for the analytics chart
status_lock = Lock()

def calculate_cbi(temp, rh):
    """Chandler Burning Index (CBI) - Method 1"""
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

# Start weather fetcher
Thread(target=fetch_weather_loop, daemon=True).start()

print("🔥 Fire Detection + Drone Stream Running with Real-Time API")

# ------------- FLASK ENDPOINTS -------------

@app.route("/video")
def video():
    """Stream video frames to browser"""
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
            time.sleep(0.033)
    
    return Response(generate_stream(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/api/detection-status")
def get_detection_status():
    """Return current detection status as JSON"""
    with status_lock:
        # inject the live deque into the payload map
        payload = detection_status.copy()
        payload["history"] = list(confidence_history)
        return jsonify(payload)

@app.route("/api/health")
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "running", 
        "model": "YOLOv8", 
        "port": STREAM_PORT,
        "video_source": SOURCE,
        "current_source": current_source_name
    })

@app.route("/api/set-source", methods=["POST"])
def set_source():
    """
    Safely switch video source at runtime.
    Expects JSON: { "source": "camera" | "video" | "phone" }
    """
    global cap, SOURCE, current_source_name
    
    try:
        data = request.get_json()
        if not data or "source" not in data:
            return jsonify({
                "success": False, 
                "error": "Missing 'source' parameter"
            }), 400
        
        requested_source = data["source"]
        
        if requested_source not in SOURCE_MAP:
            return jsonify({
                "success": False,
                "error": f"Invalid source. Must be one of: {list(SOURCE_MAP.keys())}"
            }), 400
        
        new_source = SOURCE_MAP[requested_source]
        
        # Thread-safe source switching
        with cap_lock:
            # Try to open new source first
            new_cap, success = open_source(new_source)
            
            if not success:
                return jsonify({
                    "success": False,
                    "error": f"Could not open {requested_source} source"
                }), 500
            
            # Close old capture
            if cap is not None:
                cap.release()
                print(f"🔄 Released previous source: {current_source_name}")
            
            # Switch to new capture
            cap = new_cap
            SOURCE = new_source
            current_source_name = requested_source
            
            print(f"✅ Source switched to: {requested_source}")
        
        return jsonify({
            "success": True,
            "current_source": current_source_name,
            "message": f"Source switched to {requested_source}"
        })
        
    except Exception as e:
        print(f"❌ Error in set_source: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def run_flask():
    print(f"🌐 Starting Flask server on http://0.0.0.0:{STREAM_PORT}")
    app.run(host="0.0.0.0", port=STREAM_PORT, debug=False, threaded=True)

# Start Flask in background thread
Thread(target=run_flask, daemon=True).start()
time.sleep(1)

# ------------- MAIN DETECTION LOOP -------------
def update_status(fire_detected, lat, lon, confidence):
    """Thread-safe status update"""
    with status_lock:
        detection_status["fire_detected"] = fire_detected
        detection_status["location"]["lat"] = lat
        detection_status["location"]["lon"] = lon
        detection_status["confidence"] = confidence
        detection_status["timestamp"] = time.time()
        detection_status["alert_status"] = "🔥 Fire Detected!" if fire_detected else "✓ Monitoring"

print("🚀 Starting detection loop...")
print("📊 Access dashboard at: http://localhost:3000")
print("📹 Video stream at: http://localhost:5000/video")
print("🔌 API status at: http://localhost:5000/api/detection-status")
print("🔄 Switch source at: POST http://localhost:5000/api/set-source")
print("\nPress 'q' in the video window to quit\n")

frame_count = 0
last_best_box = None
last_best_conf = 0.0
last_fire_detected = False

while True:
    loop_start_time = time.time()
    
    # Thread-safe frame reading
    with cap_lock:
        if cap is None:
            print("⚠️ Capture is None, waiting...")
            time.sleep(0.1)
            continue
        
        ret, frame = cap.read()
        
        # Handle video loop
        if not ret:
            if current_source_name == "video":
                print("🔄 Video ended, restarting...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                print("⚠️ Failed to read frame, retrying...")
                time.sleep(0.1)
                continue

    frame_count += 1
    
    # Frame skipping: only process every 3rd frame (~10 FPS inference, 30 FPS display)
    if frame_count % 3 == 0 or frame_count == 1:
        # Use imgsz=320 for 4x faster processing than 640
        results = model(frame, conf=CONF_THRESH, imgsz=320)

        fire_detected_this_frame = False

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        best_conf = 0
        best_box = None

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])

                # AREA FILTER
                area = (x2 - x1) * (y2 - y1)
                frame_area = frame.shape[0] * frame.shape[1]
                if area < MIN_AREA_RATIO * frame_area:
                    continue

                # SATURATION FILTER
                roi = hsv[y1:y2, x1:x2]
                if roi.size == 0:
                    continue
                if np.mean(roi[:, :, 1]) < MIN_SATURATION:
                    continue

                fire_detected_this_frame = True

                if conf > best_conf:
                    best_conf = conf
                    best_box = (x1, y1, x2, y2)
                    
        # Update cache variables
        last_best_box = best_box
        last_best_conf = best_conf
        last_fire_detected = fire_detected_this_frame
    else:
        # Re-use last known frame inference
        best_box = last_best_box
        best_conf = last_best_conf
        fire_detected_this_frame = last_fire_detected

    # Draw detection
    if best_box:
        x1, y1, x2, y2 = best_box
        label = f"FIRE {best_conf:.2f}"
        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
        cv2.putText(frame, label, (x1,y1-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    # TEMPORAL CONFIRMATION
    if fire_detected_this_frame:
        fire_counter += 1
    else:
        fire_counter = max(0, fire_counter - 1)
        alert_sent = False

    lat, lon = get_gps()
    
    if fire_counter >= TEMPORAL_FRAMES:
        cv2.putText(frame, "REAL FIRE CONFIRMED", (20,40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)

        update_status(True, lat, lon, best_conf)

        if not alert_sent:
            send_alert(lat, lon)

            def _send_to_dashboard():
                try:
                    requests.post(DASHBOARD_API, json={
                        "lat": lat,
                        "lon": lon,
                        "confidence": round(best_conf, 3)
                    }, timeout=2)
                    print(f"📡 Fire detected: {lat}, {lon}, conf: {best_conf:.2%}")
                except Exception as e:
                    print(f"⚠️  Dashboard unreachable: {e}")

            Thread(target=_send_to_dashboard, daemon=True).start()

            alert_sent = True
    else:
        update_status(False, lat, lon, 0.0)

    if frame_count % 100 == 0:
        print(f"📊 Frames: {frame_count} | Fire counter: {fire_counter}/{TEMPORAL_FRAMES} | Source: {current_source_name}")

    # Push to live analytics history cache (sample every 10 frames to avoid JSON bloat)
    if frame_count % 10 == 0:
        with status_lock:
            # Universal Time Sync (IST)
            ist_tz = timezone(timedelta(hours=5, minutes=30))
            current_ist = datetime.now(ist_tz).strftime("%H:%M:%S")
            
            # Artificial Jitter to simulate an active telemetry noise floor (so it never looks frozen)
            jitter = random.uniform(-0.015, 0.02) if best_conf > 0.40 else random.uniform(0.02, 0.06)
            organic_conf = max(0.0, min(1.0, float(best_conf) + jitter))
            
            confidence_history.append({
                "time": current_ist,
                "confidence": organic_conf
            })

    # Add source indicator on frame
    cv2.putText(frame, f"Source: {current_source_name.upper()}", (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    display_frame = cv2.resize(frame, None, fx=DISPLAY_SCALE, fy=DISPLAY_SCALE)
    cv2.imshow("Fire Detection System", display_frame)

    latest_frame = display_frame.copy()

    # Dynamic frame delay to maintain buttery smooth 30FPS without compounding with YOLO inference latency
    processing_time_ms = (time.time() - loop_start_time) * 1000
    delay = max(1, int(33 - processing_time_ms))

    if cv2.waitKey(delay) & 0xFF == ord("q"):
        print("\n👋 Shutting down...")
        break

with cap_lock:
    if cap is not None:
        cap.release()
cv2.destroyAllWindows()
print("✅ Detection system stopped")