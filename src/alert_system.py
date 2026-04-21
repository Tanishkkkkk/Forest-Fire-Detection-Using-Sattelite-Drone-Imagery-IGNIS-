import time
import requests

# Put your Discord Channel Webhook URL here
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1489340125912764556/mJFzLTuFTiWdH1xHi7RJCx2R_q_swfeX8qvrBVtLK-lKQZs04mnunf8lPIBvS7asDgO4" 

# Prevent spamming - wait X seconds before allowing another Discord alert
ALERT_COOLDOWN_SECONDS = 60 
last_alert_time = 0

def send_alert(lat, lon):
    global last_alert_time
    print("🚨 FIRE ALERT!")
    print(f"Location: {lat}, {lon}")

    # Log to file (always log immediately)
    with open("fire_log.txt", "a") as f:
        f.write(f"{time.ctime()} - FIRE at {lat}, {lon}\n")
        
    # Check cooldown
    current_time = time.time()
    if current_time - last_alert_time < ALERT_COOLDOWN_SECONDS:
        print("⏳ Alert skipped (Cooldown active)")
        return
        
    last_alert_time = current_time

    # Send Discord Alert to Team
    if DISCORD_WEBHOOK_URL and "http" in DISCORD_WEBHOOK_URL:
        google_maps_url = f"https://www.google.com/maps?q={lat},{lon}"
        payload = {
            "content": "🚨 **EMERGENCY: FOREST FIRE DETECTED** 🚨",
            "embeds": [
                {
                    "title": "🔥 Drone Command Dispatch",
                    "description": "A high-confidence anomaly was confirmed by the edge-AI system. Immediate response required.",
                    "color": 16711680, # Hex Red
                    "fields": [
                        { "name": "Latitude", "value": str(lat), "inline": True },
                        { "name": "Longitude", "value": str(lon), "inline": True },
                        { "name": "Tracking", "value": f"[View Coordinates on Google Maps]({google_maps_url})", "inline": False }
                    ],
                    "footer": { "text": "Project Backend Real-Time Alert System" }
                }
            ]
        }
        
        try:
            res = requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=3)
            res.raise_for_status()
            print("🚀 Discord push notification sent to team!")
        except Exception as e:
            print(f"❌ Failed to reach Discord: {e}")
