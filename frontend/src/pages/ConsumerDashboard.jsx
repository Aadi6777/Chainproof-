import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, MapPin, Clock, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { fetchPendingHandoffs, signHandoff } from '../api/api';

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [showSignoff, setShowSignoff] = useState(null);
  
  const loadPending = async () => {
    const data = await fetchPendingHandoffs();
    // Only show ones where consumer hasn't approved yet
    setPending(data.filter(p => !p.consumerApproved));
  };

  useEffect(() => { loadPending(); }, []);

  const handleConsumerApprove = async () => {
    if (!showSignoff) return;
    const res = await signHandoff(showSignoff._id, { 
      status: 'approved', 
      role: 'consumer',
      consumerSignature: 'MOCK_CONSUMER_SIG' 
    });
    if (res.success) {
      alert(res.finalized ? '✅ Shipment Fully Verified & Blockchain Anchored!' : '⌛ Approval Recorded. Waiting for Manager sign-off.');
      setShowSignoff(null);
      loadPending();
    }
  };

  // Mock data for the consumer's active orders
  const myOrders = [
    { id: 'SHP-229697', item: 'Tomato - Apple', status: 'In Transit', location: 'Banglore', lastUpdate: '2 mins ago' },
    { id: 'SHP-884122', item: 'Potato', status: 'Delivered', location: 'Chennai', lastUpdate: '2 days ago' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px', color: '#fff' }}>
      {/* ── Top Header ── */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="login-title" style={{ fontSize: '2.4rem', margin: 0 }}>Command Center</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontFamily: 'Space Mono', letterSpacing: '0.1em' }}>Welcome, Authorized Consumer #C-229</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: '#3b82f6', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Satellite Link</div>
          <div style={{ color: '#22c55e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="login-dot" style={{ width: 8, height: 8 }} /> Connected
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
        
        {/* ── LEFT: LIVE TRACKING MAP ── */}
        <div className="login-card" style={{ padding: 0, height: '600px', position: 'relative', overflow: 'hidden' }}>
          {/* HUD Overlay */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(6, 8, 18, 0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.6rem', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: 4 }}>LIVE TELEMETRY</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>ACTIVE TRANSIT MAPPING</div>
          </div>

          <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, background: 'rgba(6, 8, 18, 0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Mono' }}>
             LAT: 12.9716° N <br />
             LNG: 77.5946° E
          </div>

          {/* SVG Map Simulation */}
          <div style={{ width: '100%', height: '100%', background: '#0a0c1a', position: 'relative' }}>
             {/* Grid */}
             <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
             
             <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ position: 'relative', zIndex: 1 }}>
                {/* Simulated Transit Paths */}
                <path d="M200,400 Q400,300 600,200" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.3">
                   <animate attributeName="stroke-dashoffset" from="120" to="0" dur="5s" repeatCount="indefinite" />
                </path>
                <path d="M150,200 Q300,400 500,500" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="8 4" opacity="0.3">
                   <animate attributeName="stroke-dashoffset" from="120" to="0" dur="5s" repeatCount="indefinite" />
                </path>

                {/* Pulsing Nodes */}
                <g>
                  <circle cx="200" cy="400" r="4" fill="#3b82f6" />
                  <circle cx="200" cy="400" r="10" fill="none" stroke="#3b82f6" strokeWidth="1">
                    <animate attributeName="r" from="4" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="215" y="405" fill="#fff" fontSize="10" fontFamily="Space Mono">ORGIN: CHENNAI</text>
                </g>

                <g>
                  <circle cx="600" cy="200" r="4" fill="#22c55e" />
                  <circle cx="600" cy="200" r="10" fill="none" stroke="#22c55e" strokeWidth="1">
                    <animate attributeName="r" from="4" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="615" y="205" fill="#fff" fontSize="10" fontFamily="Space Mono">CURRENT: BANGLORE</text>
                </g>
             </svg>
          </div>
        </div>

        {/* ── RIGHT: HUD PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tracking Form */}
          <div className="login-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', letterSpacing: '0.1em' }}>QUICK TRACK</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = e.target.shipId.value;
              if(id) navigate(`/shipment/${id}`);
            }} style={{ display: 'flex', gap: '10px' }}>
              <input name="shipId" type="text" className="login-input" placeholder="SHIPMENT ID" style={{ padding: '10px 14px', fontSize: '0.8rem' }} />
              <button type="submit" className="login-btn" style={{ height: 'auto', width: 'auto', padding: '0 16px', fontSize: '0.7rem' }}>SYNC</button>
            </form>
          </div>

          {/* Pending Approvals HUD */}
          {pending.length > 0 && (
            <div className="login-card" style={{ padding: '24px', border: '1px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
              <div style={{ color: '#3b82f6', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: '12px' }}>PENDING VERIFICATION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pending.map(p => (
                  <div key={p._id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem' }}>{p.shipmentId}</div>
                    <button onClick={() => setShowSignoff(p)} className="login-btn" style={{ height: 'auto', width: 'auto', padding: '6px 12px', fontSize: '0.6rem' }}>AUTHORIZE</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipment List HUD */}
          <div className="login-card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ marginBottom: '20px', fontSize: '0.9rem', letterSpacing: '0.1em' }}>MY SHIPMENTS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myOrders.map(order => (
                <div 
                  key={order.id} 
                  className="login-driver-btn" 
                  style={{ justifyContent: 'space-between', padding: '16px', textAlign: 'left', height: 'auto' }}
                  onClick={() => navigate(`/shipment/${order.id}`)}
                >
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>{order.id}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{order.item}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: order.status === 'Delivered' ? '#22c55e' : '#3b82f6', fontSize: '0.7rem' }}>{order.status}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{order.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Signature Modal Overlay */}
      {showSignoff && (
        <div className="face-success-overlay" style={{ background: 'rgba(6, 8, 18, 0.95)' }}>
          <div className="login-card" style={{ maxWidth: '440px', width: '90%', padding: '40px' }}>
            <div className="face-hud-top" style={{ position: 'static', marginBottom: 20 }}>CRYPTO-SIGNATURE REQUIRED</div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 30 }}>Authorize provenance audit for <strong>{showSignoff.shipmentId}</strong>?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSignoff(null)} className="login-driver-btn" style={{ flex: 1 }}>ABORT</button>
              <button onClick={handleConsumerApprove} className="login-btn" style={{ flex: 2 }}>GENERATE SIGNATURE</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div style={{ marginTop: '40px', textAlign: 'center', opacity: 0.3 }}>
         <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Blockchain Verified · Real-Time Provenance · IoT Integrated</div>
      </div>
    </div>
  );
}
