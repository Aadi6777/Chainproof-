import { createShipmentOnChain, logHandoffOnChain, approveHandoffOnChain } from './blockchain';

// STANDALONE MOCK API WITH 1-HOUR TTL AND PERSISTENCE
const CITY_COORDS = {
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'trichy': { lat: 10.7905, lng: 78.7047 }
};

const getStored = (key, initial) => {
  const stored = localStorage.getItem(key);
  let data = stored ? JSON.parse(stored) : initial;
  if (key === 'cp_shipments') {
    const now = Date.now();
    // EXPIRATION SET TO 1 HOUR (3600000 ms)
    const filtered = data.filter(s => (now - s.createdAt) < 3600000);
    if (filtered.length !== data.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
      data = filtered;
    }
  }
  if (!stored) localStorage.setItem(key, JSON.stringify(initial));
  return data;
};

const saveStored = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const predictShelfLife = (type, temp, threshold) => {
  let baseLife = 10;
  const t = type.toLowerCase();
  if (t === 'spinach') baseLife = 3;
  else if (t === 'tomato') baseLife = 7;
  else if (t === 'carrot') baseLife = 15;
  const deviation = temp - threshold;
  const finalLife = Math.max(0.5, baseLife - Math.max(0, deviation * 2));
  return { days: Math.round(finalLife * 10) / 10, confidence: Math.min(99, Math.round(temp > threshold ? 75 : 15)), status: temp > threshold + 2 ? 'red' : (temp > threshold ? 'amber' : 'green') };
};

export const loginUser = async (email) => {
  return new Promise(r => setTimeout(() => {
    let role = email.includes('mediator') ? 'mediator' : (email.includes('customer') ? 'customer' : 'manager');
    r({ token: 'mock-token-123', role, name: 'Demo User', email });
  }, 500));
};

export const fetchShipments = async () => {
  const all = getStored('cp_shipments', []);
  return new Promise(r => r(all.filter(s => s.isApproved)));
};

export const fetchShipmentDetails = async (id) => {
  return new Promise(resolve => {
    const all = getStored('cp_shipments', []);
    const s = all.find(x => x.shipmentId === id || x._id === id);
    if (s) {
      const handoffs = getStored('cp_history', []).filter(h => h.shipmentId === s.shipmentId);
      resolve({ shipment: s, handoffs });
    } else {
      resolve(null);
    }
  });
};

export const createShipment = async (data) => {
  const shipments = getStored('cp_shipments', []);
  const pending = getStored('cp_pending', []);
  
  const originKey = data.origin.toLowerCase();
  const destKey = data.destination.toLowerCase();
  const originCoords = CITY_COORDS[originKey] || { lat: 13.0827, lng: 80.2707 };
  const destCoords = CITY_COORDS[destKey] || { lat: 28.7041, lng: 77.1025 };

  const ml = predictShelfLife(data.goodsType, parseFloat(data.initialTemperature), parseFloat(data.temperatureThreshold));
  const newS = {
    _id: Math.random().toString(36).substr(2, 9),
    shipmentId: data.shipmentId || `SHP-${Math.floor(Math.random() * 900) + 100}-NEW`,
    producerName: data.producerName,
    goodsType: data.goodsType,
    origin: data.origin,
    destination: data.destination,
    currentLocation: originCoords,
    originCoords: originCoords,
    destCoords: destCoords,
    currentTemperature: parseFloat(data.initialTemperature),
    temperatureThreshold: parseFloat(data.temperatureThreshold),
    status: ml.status,
    shelfLifeDays: ml.days,
    spoilageConfidence: ml.confidence,
    statusMessage: ml.status === 'green' ? 'Optimal.' : 'Alert!',
    createdAt: Date.now(),
    isApproved: false
  };
  
  shipments.push(newS);
  saveStored('cp_shipments', shipments);
  
  pending.push({
    _id: 'h_init_' + newS._id,
    shipmentId: newS.shipmentId,
    locationName: newS.origin + " (Origin)",
    temperature: newS.currentTemperature,
    timestamp: new Date(),
    mediatorName: "System (Auto-Init)",
    isInit: true
  });
  saveStored('cp_pending', pending);
  
  return { success: true, shipmentId: newS.shipmentId };
};

export const logHandoff = async (formData) => {
  const pending = getStored('cp_pending', []);
  pending.push({ 
    _id: 'h'+Date.now(), 
    shipmentId: formData.get('shipmentId'), 
    locationName: 'Warehouse / Transit', // Use a default for location
    temperature: parseFloat(formData.get('temperature')), 
    timestamp: new Date(), 
    mediatorName: formData.get('locationName') // This field holds the Driver Name
  });
  saveStored('cp_pending', pending);
  return { success: true };
};

export const fetchPendingHandoffs = async () => new Promise(r => r(getStored('cp_pending', [])));

export const signCreation = async (id, data) => {
  const pending = getStored('cp_pending', []);
  const shipments = getStored('cp_shipments', []);
  const history = getStored('cp_history', []);
  
  const pIdx = pending.findIndex(x => x._id === id);
  if (pIdx === -1) return { success: false, message: 'Record not found' };
  const p = pending[pIdx];

  if (data.status === 'rejected') {
    // If initial creation is rejected, delete the shipment record entirely
    const filteredShipments = shipments.filter(s => s.shipmentId !== p.shipmentId);
    saveStored('cp_shipments', filteredShipments);
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, message: 'Shipment Creation Rejected' };
  }
  
  // Sign-off (Creation) is Manager Only
  const sIdx = shipments.findIndex(s => s.shipmentId === p.shipmentId);
  let txHash = null;
  if (sIdx !== -1) {
    const s = shipments[sIdx];
    // 1. Anchor Creation on Blockchain
    txHash = await createShipmentOnChain(s.shipmentId, s.goodsType);
    s.isApproved = true;
    s.blockchainTx = txHash;
    saveStored('cp_shipments', shipments);
  }
  history.push({ ...p, managerApproved: true, finalized: true, blockchainTx: txHash, createdAt: new Date() });
  saveStored('cp_history', history);
  saveStored('cp_pending', pending.filter(x => x._id !== id));
  
  return { success: true, finalized: true };
};

export const signHandoff = async (id, data) => {
  const pending = getStored('cp_pending', []);
  const shipments = getStored('cp_shipments', []);
  const history = getStored('cp_history', []);
  
  const pIdx = pending.findIndex(x => x._id === id);
  if (pIdx === -1) return { success: false, message: 'Handoff not found' };
  const p = pending[pIdx];

  if (data.status === 'rejected') {
    // If handoff is rejected, just remove it from pending
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, message: 'Handoff Rejected' };
  }
  
  // Handoff requires Dual Approval
  if (data.role === 'manager') {
    // 1. Anchor Manager Approval on Chain
    const currentHandoffs = history.filter(h => h.shipmentId === p.shipmentId);
    await approveHandoffOnChain(p.shipmentId, currentHandoffs.length, true);
    
    p.managerApproved = true;
    p.managerSignature = data.managerSignature;
  } else if (data.role === 'consumer') {
    // 1. Anchor Consumer Approval on Chain
    const currentHandoffs = history.filter(h => h.shipmentId === p.shipmentId);
    await approveHandoffOnChain(p.shipmentId, currentHandoffs.length, false);

    p.consumerApproved = true;
    p.consumerSignature = data.consumerSignature;
  }

  if (p.managerApproved && p.consumerApproved) {
    const sIdx = shipments.findIndex(s => s.shipmentId === p.shipmentId);
    if (sIdx !== -1) {
      const s = shipments[sIdx];
      s.currentTemperature = p.temperature;
      
      // Update ML prediction based on new temperature
      const ml = predictShelfLife(s.goodsType, p.temperature, s.temperatureThreshold);
      s.status = ml.status;
      s.shelfLifeDays = ml.days;
      s.spoilageConfidence = ml.confidence;
      
      saveStored('cp_shipments', shipments);
    }
    history.push({ ...p, finalized: true, createdAt: new Date() });
    saveStored('cp_history', history);
    saveStored('cp_pending', pending.filter(x => x._id !== id));
    return { success: true, finalized: true };
  } else {
    saveStored('cp_pending', pending);
    return { success: true, finalized: false };
  }
};

export const fetchAnomalies = async () => {
  const shipments = getStored('cp_shipments', []);
  return shipments.filter(s => s.status !== 'green' && s.isApproved);
};

export const approveReroute = async (id) => {
  const shipments = getStored('cp_shipments', []);
  const s = shipments.find(x => x.shipmentId === id);
  if (s) { s.isRerouted = true; s.status = 'amber'; saveStored('cp_shipments', shipments); }
  return { success: true };
};

export const deleteShipment = async (id) => {
  const shipments = getStored('cp_shipments', []);
  const filtered = shipments.filter(s => s._id !== id && s.shipmentId !== id);
  saveStored('cp_shipments', filtered);
  return { success: true };
};

export const predictSpoilage = async (handoffId) => {
  try {
    const pending = getStored('cp_pending', []);
    const shipments = getStored('cp_shipments', []);
    
    const handoff = pending.find(h => h._id === handoffId);
    if (!handoff) throw new Error('Handoff not found in local storage');
    
    const shipment = shipments.find(s => s.shipmentId === handoff.shipmentId);
    if (!shipment) throw new Error('Shipment not found in local storage');

    const features = {
      vegetable_type: (shipment.goodsType || 'tomato').toLowerCase(),
      storage_condition: 'ambient',
      packaging_type: 'loose',
      storage_temp_c: handoff.temperature,
      temp_deviation_c: Math.abs(handoff.temperature - (shipment.temperatureThreshold || 20)),
      humidity_pct: 70.0,
      damage_score: 1.0,
      microbial_load_log_cfu: 2.0,
      ethylene_ppm: 1.0
    };

    const response = await fetch('/api/ai/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handoffId, features })
    });
    return await response.json();
  } catch (err) {
    console.error('AI Prediction API failed:', err);
    return { error: 'Prediction service unavailable' };
  }
};
