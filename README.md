# IGNIS: Autonomous Forest Fire Detection & Monitoring System

IGNIS is an advanced, real-time surveillance and detection system designed to combat forest fires using Artificial Intelligence and Drone technology. By leveraging state-of-the-art computer vision and a dynamic analytics dashboard, IGNIS provides early detection, precise localization, and rapid alerting to minimize environmental damage.

## 🚀 Key Features

- **Real-Time AI Detection**: Utilizes YOLOv8 (Deep Learning) to detect fire and smoke with high precision in real-time video feeds.
- **Live Drone Stream Integration**: Seamlessly processes live RTSP/HTTP streams from surveillance drones for localized monitoring.
- **Interactive Geospatial Dashboard**: A React-based command center featuring:
  - **Live Map Visualization**: Real-time hotspot mapping using Leaflet and marker clustering.
  - **Emergency Mode**: Automatic system-wide escalation when fire confidence exceeds 70%.
  - **Dynamic Analytics**: Visualizes live fire trends and historical data using Chart.js.
- **Automated Alerting System**: Instant notifications and logging of detected incidents for emergency responders.
- **Simulation Environment**: Built-in GPS and video simulators for testing system performance in varied scenarios.

## 🛠️ Technology Stack

### Backend
- **Language**: Python 3.9+
- **ML Framework**: YOLOv8 (Ultralytics), PyTorch
- **Computer Vision**: OpenCV
- **Web Framework**: Flask, Flask-CORS
- **Processing**: NumPy, Requests

### Frontend
- **Framework**: React (Vite-powered)
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet.js
- **Graphs**: Chart.js

## 📦 Installation & Setup

## Data Sets
-Stage1(Small Fire and Medium Fires) - https://www.kaggle.com/datasets/azimjaan21/fire-and-smoke-dataset-object-detection-yolo
-Stage2(Indoor and Outdoor Fires ) - https://www.kaggle.com/datasets/rachadlakis/firedataset-jpg-224
-Stage3(Medium and large Fires) - https://www.kaggle.com/datasets/kutaykutlu/forest-fire

### Prerequisites
- Python 3.9+
- Node.js (v18+)
- NVIDIA GPU (Optional, for optimized AI inference)

### Backend Setup
1. Navigate to the root directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the detection server:
   ```bash
   python src/drone_stream.py
   ```

### Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🖥️ System Architecture

1. **Ingestion Layer**: Live drone feeds or simulated video files are captured.
2. **Inference Layer**: YOLOv8 models process frames to identify fire/smoke signatures.
3. **API & Logic Layer**: Flask backend serves detection data and telemetry.
4. **Presentation Layer**: React dashboard visualizes the data for command-and-control operations.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed for advanced forest conservation and rapid fire response.*
