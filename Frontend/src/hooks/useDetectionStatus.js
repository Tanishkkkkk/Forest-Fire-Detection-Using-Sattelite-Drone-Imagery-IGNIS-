import { useState, useEffect, useRef, useCallback } from 'react';
import { DETECTION_API, AI_PRED_API, UPDATE_INTERVAL } from '../constants/api.js';

const MAX_RETRIES = 5;

export function useDetectionStatus() {
  const [data, setData]             = useState(null);
  const [connected, setConnected]   = useState(false);
  const [aiPrediction, setAiPred]   = useState('Awaiting fire detection...');
  const retriesRef                  = useRef(0);
  const aiLoadedRef                 = useRef(false);

  const fetchAI = useCallback(async () => {
    if (aiLoadedRef.current) return;
    try {
      const res  = await fetch(AI_PRED_API);
      const json = await res.json();
      if (json.prediction) {
        setAiPred(json.prediction);
        aiLoadedRef.current = true;
      }
    } catch {
      setAiPred('AI prediction unavailable. Ensure backend is running.');
    }
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch(DETECTION_API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        retriesRef.current = 0;
        setConnected(true);
        setData(json);
        if (json.fire_detected) fetchAI();
        if (json.ai_prediction) setAiPred(json.ai_prediction);
      } catch {
        retriesRef.current++;
        setConnected(false);
        if (retriesRef.current >= MAX_RETRIES) {
          setData(prev => prev ? { ...prev, fire_detected: false } : null);
        }
      }
    };

    poll();
    const id = setInterval(poll, UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAI]);

  return { data, connected, aiPrediction };
}
