import pickle
import pandas as pd
import os
import json
from http.server import BaseHTTPRequestHandler

# Set path to the directory containing the models
# In Vercel, the directory structure is preserved relative to the root
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'test model')

# Real-world shelf life limits
REAL_SHELF_LIFE = {
    "beans":        {"ambient": 4,   "refrigerated": 7,   "cold_storage": 12,  "controlled_atmosphere": 14},
    "beetroot":     {"ambient": 5,   "refrigerated": 21,  "cold_storage": 90,  "controlled_atmosphere": 100},
    "bitter_gourd": {"ambient": 3,   "refrigerated": 7,   "cold_storage": 10,  "controlled_atmosphere": 12},
    "broccoli":     {"ambient": 2,   "refrigerated": 7,   "cold_storage": 14,  "controlled_atmosphere": 21},
    "cabbage":      {"ambient": 5,   "refrigerated": 21,  "cold_storage": 60,  "controlled_atmosphere": 90},
    "capsicum":     {"ambient": 4,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 28},
    "carrot":       {"ambient": 5,   "refrigerated": 21,  "cold_storage": 60,  "controlled_atmosphere": 90},
    "cauliflower":  {"ambient": 3,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 30},
    "cucumber":     {"ambient": 3,   "refrigerated": 10,  "cold_storage": 14,  "controlled_atmosphere": 21},
    "eggplant":     {"ambient": 3,   "refrigerated": 10,  "cold_storage": 14,  "controlled_atmosphere": 18},
    "okra":         {"ambient": 2,   "refrigerated": 7,   "cold_storage": 10,  "controlled_atmosphere": 12},
    "onion":        {"ambient": 60,  "refrigerated": 60,  "cold_storage": 120, "controlled_atmosphere": 150},
    "peas":         {"ambient": 2,   "refrigerated": 5,   "cold_storage": 14,  "controlled_atmosphere": 21},
    "potato":       {"ambient": 60,  "refrigerated": 90,  "cold_storage": 120, "controlled_atmosphere": 180},
    "radish":       {"ambient": 3,   "refrigerated": 14,  "cold_storage": 28,  "controlled_atmosphere": 35},
    "spinach":      {"ambient": 2,   "refrigerated": 6,   "cold_storage": 10,  "controlled_atmosphere": 14},
    "tomato":       {"ambient": 7,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 28},
}

TEMP_HARD_CAPS = [(40, 1), (35, 2), (30, 4), (25, 7)]
AMBIENT_TOLERANT = {"onion", "potato"}

# Global variables for models to benefit from warm starts
MODELS = None

def load_models():
    global MODELS
    if MODELS:
        return MODELS
    
    with open(os.path.join(MODEL_DIR, "encoders.pkl"), "rb") as f:
        encoders = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb") as f:
        scaler = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "spoilage_model.pkl"), "rb") as f:
        clf = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "shelf_life_model.pkl"), "rb") as f:
        reg = pickle.load(f)
    
    MODELS = (encoders, scaler, clf, reg)
    return MODELS

def predict_logic(input_dict):
    encoders, scaler, clf, reg = load_models()
    
    CATEGORICAL  = ['vegetable_type', 'storage_condition', 'packaging_type']
    NUMERICAL    = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
                    'damage_score', 'microbial_load_log_cfu', 'ethylene_ppm']
    FEATURE_COLS = NUMERICAL + CATEGORICAL

    df_in = pd.DataFrame([input_dict])
    
    for col in CATEGORICAL:
        if input_dict[col] not in list(encoders[col].classes_):
             input_dict[col] = list(encoders[col].classes_)[0]
        df_in[col] = encoders[col].transform(df_in[col])
        
    df_in[NUMERICAL] = scaler.transform(df_in[NUMERICAL])
    X_in = df_in[FEATURE_COLS]

    spoilage   = int(clf.predict(X_in)[0])
    confidence = round(float(clf.predict_proba(X_in)[0][spoilage]) * 100, 2)
    days       = round(float(reg.predict(X_in)[0]), 1)
    
    veg       = input_dict["vegetable_type"]
    condition = input_dict["storage_condition"]
    temp      = input_dict["storage_temp_c"]
    damage    = input_dict["damage_score"]
    microbes  = input_dict["microbial_load_log_cfu"]
    
    overrides = []
    real_max = REAL_SHELF_LIFE.get(veg, {}).get(condition, 30)
    
    if days > real_max:
        days = real_max
        overrides.append(f"Capped to real-world max ({real_max} days)")

    if veg not in AMBIENT_TOLERANT:
        for threshold, cap in TEMP_HARD_CAPS:
            if temp > threshold:
                if days > cap:
                    days = cap
                    overrides.append(f"Heat stress cap: {cap} day(s)")
                if temp > 35:
                    spoilage = 1
                break
    
    if microbes >= 7.0:
        days = min(days, 2.0)
        spoilage = 1
        overrides.append("Critical microbial load")
    
    if damage >= 8.0:
        days = min(days, 1.5)
        spoilage = 1
        overrides.append("Severe physical damage")

    days = round(max(days, 0.5), 1)
    
    return {
        "spoilage_status": spoilage,
        "spoilage_label": "Spoiled" if spoilage == 1 else "Fresh",
        "days_remaining": days,
        "confidence_pct": confidence,
        "overrides": overrides
    }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        # We expect features to be passed directly in the body
        features = data.get('features')
        
        try:
            result = predict_logic(features)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
