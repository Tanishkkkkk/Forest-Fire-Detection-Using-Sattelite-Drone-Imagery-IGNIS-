// All API endpoint constants — change ports here if needed
export const ML_BASE        = 'http://localhost:5000';
export const DATA_BASE      = 'http://localhost:3000';

export const DETECTION_API  = `${ML_BASE}/api/detection-status`;
export const AI_PRED_API    = `${ML_BASE}/api/ai-prediction`;
export const VIDEO_API      = `${ML_BASE}/video`;
export const SOURCE_API     = `${ML_BASE}/api/set-source`;
export const HEALTH_API     = `${ML_BASE}/api/health`;

export const FIRMS_API      = `/api/firms`;           // proxied via Vite → :3000
export const LOCAL_FIRES_API= `/api/local-fires`;     // proxied via Vite → :3000
export const STATUS_API     = `/api/status`;          // proxied via Vite → :3000

export const UPDATE_INTERVAL     = 500;   // ms — ML backend poll
export const LOCAL_FIRES_INTERVAL= 3000;  // ms
export const STATUS_INTERVAL     = 4000;  // ms
