import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Package, MapPin, Navigation, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { fetchShipments, fetchAnomalies, approveReroute, deleteShipment } from '../api/api';
import StatusBadge from '../components/StatusBadge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const icons = { green: createIcon('green'), amber: createIcon('orange'), red: createIcon('red') };

// COMPONENT TO FETCH AND RENDER REAL ROAD ROUTING (OSRM)
const RoadRoute = ({ shipment }) => {
  const [path, setPath] = useState([]);

  useEffect(() => {
    if (!shipment.originCoords || !shipment.destCoords) return;
    
    const getRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${shipment.originCoords.lng},${shipment.originCoords.lat};${shipment.destCoords.lng},${shipment.destCoords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setPath(coords);
        }
      } catch (e) {
        // Fallback to straight line if API fails
        setPath([[shipment.originCoords.lat, shipment.originCoords.lng], [shipment.destCoords.lat, shipment.destCoords.lng]]);
      }
    };
    getRoute();
  }, [shipment]);

  if (path.length === 0) return null;

  return (
    <Polyline 
      positions={path}
      pathOptions={{ 
        color: shipment.status === 'red' ? '#ef4444' : (shipment.status === 'amber' ? '#f59e0b' : '#3b82f6'),
        weight: 4,
        opacity: 0.7,
        lineJoin: 'round'
      }}
    />
  );
};

export default function Dashboard() {
  const [shipments, setShipments] = useState([]);
  const [anomalies, setAnomalies] = useState([]);

  const load = async () => {
    try {
      const shps = await fetchShipments();
      const anom = await fetchAnomalies();
      
      // Add a timestamp to each new shipment for the 30s auto-delete demo
      const shpsWithTime = shps.map(s => ({
        ...s,
        addedAt: s.addedAt || Date.now()
      }));

      setShipments(shpsWithTime || []);
      setAnomalies(anom || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  // 30s Auto-Cleanup Effect (Permanent)
  useEffect(() => {
    const cleanup = setInterval(async () => {
      const now = Date.now();
      const toDelete = shipments.filter(s => (now - s.addedAt) / 1000 >= 30);
      
      for (const s of toDelete) {
        await deleteShipment(s._id);
      }
      
      if (toDelete.length > 0) load();
    }, 2000);
    return () => clearInterval(cleanup);
  }, [shipments]);

  const handleReroute = async (id) => {
    try {
      await approveReroute(id);
      load();
    } catch (e) { alert('Failed to approve reroute'); }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', color: '#fff' }}>
      {/* ── Top Header ── */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="login-title" style={{ fontSize: '2.4rem', margin: 0 }}>Global Command</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontFamily: 'Space Mono', letterSpacing: '0.1em' }}>Strategic Overview — Active Fleet #AF-88</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: '#3b82f6', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Satellite Link</div>
          <div style={{ color: '#22c55e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="login-dot" style={{ width: 8, height: 8 }} /> Multi-Node Connected
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
        
        {/* ── LEFT: GLOBAL FLEET MAP ── */}
        <div className="login-card" style={{ padding: 0, height: '650px', position: 'relative', overflow: 'hidden' }}>
          {/* HUD Overlay */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(6, 8, 18, 0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.6rem', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: 4 }}>STRATEGIC OVERVIEW</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>REAL-TIME FLEET TELEMETRY</div>
          </div>

          <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, background: 'rgba(6, 8, 18, 0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Mono' }}>
             FLEET NODES: {shipments.length} <br />
             ACTIVE ALERTS: {anomalies.length}
          </div>

          {/* SVG Map Simulation */}
          <div style={{ width: '100%', height: '100%', background: '#0a0c1a', position: 'relative' }}>
             <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
             
             <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ position: 'relative', zIndex: 1 }}>
                {shipments.map((s, idx) => (
                  <g key={s._id}>
                    {/* Simplified connection line for every 2nd shipment for visual flair */}
                    {idx % 2 === 0 && (
                      <path d={`M${150 + idx*50},${400 - idx*20} Q400,300 ${600 - idx*30},${200 + idx*20}`} stroke="#3b82f6" strokeWidth="1" fill="none" strokeDasharray="5 5" opacity="0.2">
                        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="4s" repeatCount="indefinite" />
                      </path>
                    )}
                    
                    {/* Shipment Node */}
                    <circle cx={200 + (idx * 40 % 400)} cy={150 + (idx * 60 % 300)} r="3" fill={s.status === 'red' ? '#ef4444' : '#3b82f6'} />
                    <circle cx={200 + (idx * 40 % 400)} cy={150 + (idx * 60 % 300)} r="10" fill="none" stroke={s.status === 'red' ? '#ef4444' : '#3b82f6'} strokeWidth="1">
                      <animate attributeName="r" from="3" to="15" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="1" to="0" dur="3s" repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
             </svg>
          </div>
        </div>

        {/* ── RIGHT: OPERATIONAL HUD ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', maxHeight: '650px' }}>
          
          {/* Action Alerts HUD */}
          {anomalies.length > 0 && (
            <div className="login-card" style={{ padding: '24px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ color: '#ef4444', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: '12px' }}>CRITICAL ANOMALIES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {anomalies.map(a => (
                  <div key={a._id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{a.shipmentId}</div>
                      <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{a.currentTemperature?.toFixed(1)}°C</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>{a.statusMessage}</div>
                    
                    {!a.isRerouted && a.status === 'red' && (
                      <button onClick={() => handleReroute(a.shipmentId)} className="login-btn" style={{ height: 'auto', padding: '8px', fontSize: '0.6rem', background: '#f59e0b', color: '#000' }}>REROUTE TO COLD STORAGE</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Fleet List */}
          <div className="login-card" style={{ padding: '24px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ fontSize: '0.9rem', letterSpacing: '0.1em', margin: 0 }}>ACTIVE FLEET</h3>
               <Link to="/handoff" className="login-btn" style={{ height: 'auto', width: 'auto', padding: '6px 12px', fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}>NEW RECORD</Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shipments.map(s => (
                <div 
                  key={s._id} 
                  className="login-driver-btn" 
                  style={{ justifyContent: 'space-between', padding: '16px', textAlign: 'left', height: 'auto' }}
                  onClick={() => navigate(`/shipment/${s.shipmentId}`)}
                >
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>{s.shipmentId}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{s.origin} → {s.destination}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: s.status === 'red' ? '#ef4444' : '#3b82f6', fontSize: '0.7rem' }}>{s.status.toUpperCase()}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{s.shelfLifeDays} DAYS LIFE</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer Branding */}
      <div style={{ marginTop: '40px', textAlign: 'center', opacity: 0.3 }}>
         <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>AI-Logistics Nexus · Enterprise Grade · Multi-Node Blockchain</div>
      </div>
    </div>
  );
}
