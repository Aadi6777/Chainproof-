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
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', height: 'calc(100vh - 120px)' }}>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>📍 AI Logistics Command Center</h2>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-green)' }}></span> Safe</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-amber)' }}></span> Warning</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-red)' }}></span> Critical</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {shipments.map(s => (
              <React.Fragment key={s._id}>
                {s.currentLocation && (
                  <Marker position={[s.currentLocation.lat, s.currentLocation.lng]} icon={icons[s.status] || icons.green}>
                    <Popup>
                      <div style={{ minWidth: '150px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-accent)', marginBottom: '4px' }}>{s.shipmentId}</div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{s.goodsType.toUpperCase()}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Temp: <strong>{s.currentTemperature?.toFixed(1)}°C</strong><br/>
                          Est. Life: <strong>{s.shelfLifeDays} Days</strong>
                        </div>
                        <Link to={`/shipment/${s.shipmentId}`} style={{ display: 'block', marginTop: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>Detailed Analysis →</Link>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {s.destCoords && (
                  <Marker position={[s.destCoords.lat, s.destCoords.lng]} icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    shadowSize: [41, 41]
                  })}>
                    <Popup>Destination: {s.destination}</Popup>
                  </Marker>
                )}
                <RoadRoute shipment={s} />
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        {anomalies.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Action Required
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {anomalies.map(a => (
                <div key={a._id} className="glass-card" style={{ border: `1px solid var(--color-${a.status})`, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: `var(--color-${a.status})` }}>{a.shipmentId}</strong>
                    <span style={{ fontWeight: 'bold' }}>{a.currentTemperature?.toFixed(1)}°C</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {a.statusMessage}
                  </p>
                  
                  {a.status === 'red' && !a.isRerouted && (
                    <button className="btn" style={{ background: 'var(--color-amber)', color: 'black', width: '100%', fontSize: '0.85rem' }} onClick={() => handleReroute(a.shipmentId)}>
                      Approve Reroute to Cold Storage
                    </button>
                  )}
                  {a.isRerouted && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={14} /> Reroute Approved
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Active Fleet 
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '400' }}>Auto-cleans (30s)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shipments.map(s => {
              // Simple check: if shipment is older than 30s (simulated for demo)
              // In a real app, you'd compare with createdAt. For demo, we just show them.
              return (
                <div key={s._id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/shipment/${s.shipmentId}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{s.shipmentId}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.origin} → {s.destination}</span>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusBadge status={s.status} />
                    <button 
                      onClick={async () => {
                        if(window.confirm('Erase this fleet record permanently?')) {
                          await deleteShipment(s._id);
                          load();
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
