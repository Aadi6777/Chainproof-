import React, { useEffect, useState, useRef } from 'react';
import { fetchPendingHandoffs, signHandoff, signCreation, predictSpoilage } from '../api/api';
import { CheckCircle, XCircle, MapPin, Thermometer, FileText, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';

// A SIMPLE, ROBUST MANUAL SIGNATURE PAD TO AVOID LIBRARY CONFLICTS
const ManualSignaturePad = ({ onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas 
        ref={canvasRef}
        width={630}
        height={140}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
        style={{ cursor: 'crosshair', display: 'block', background: 'white' }}
        id="signature-canvas"
      />
      <button type="button" onClick={clear} style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Clear Canvas</button>
    </div>
  );
};

export default function ManagerSignoff() {
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingHandoffs();
      setPending(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const fetchPred = async () => {
      if (!selected) {
        setPrediction(null);
        return;
      }
      setPredLoading(true);
      try {
        const res = await predictSpoilage(selected._id);
        setPrediction(res);
      } catch (e) {
        console.error(e);
      }
      setPredLoading(false);
    };
    fetchPred();
  }, [selected]);

  const handleSignoff = async (status) => {
    if (!selected) return;
    
    try {
      let signature = null;
      if (status === 'approved') {
        const canvas = document.getElementById('signature-canvas');
        signature = canvas.toDataURL('image/png');
      }
      
      let res;
      if (selected.isInit) {
        // Initial shipment sign-off is Manager-only
        res = await signCreation(selected._id, { status, managerSignature: signature });
      } else {
        // Handoff requires Dual approval (Manager role)
        res = await signHandoff(selected._id, { 
          status, 
          role: 'manager',
          managerSignature: signature 
        });
      }
      
      if (res.success) {
        if (res.finalized) {
          alert('✅ Record Fully Verified & Locked to Blockchain');
        } else {
          alert('⌛ Manager Approval Recorded. Waiting for Consumer Authorization.');
        }
        load();
        setSelected(null);
      }
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading pending reviews...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>🏢 Manager Sign-off</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Final Audit & Blockchain Authorization</p>
        </div>
        <div style={{ background: 'var(--color-accent)', color: 'white', padding: '10px 20px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '700' }}>
          {pending.length} Pending Actions
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '350px 1fr' : '1fr', gap: '32px' }}>
        
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', background: '#f8f9fa', borderBottom: '1px solid var(--border-light)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>Sign-off Queue</div>
          {pending.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <CheckCircle size={40} color="var(--color-green)" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>All clear! No pending audits.</div>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {pending.map(p => (
                <div 
                  key={p._id} 
                  onClick={() => setSelected(p)}
                  style={{ 
                    padding: '20px 24px', 
                    borderBottom: '1px solid var(--border-light)', 
                    cursor: 'pointer',
                    background: selected?._id === p._id ? '#eef2ff' : 'transparent',
                    borderLeft: selected?._id === p._id ? '4px solid var(--color-accent)' : '4px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--color-accent)' }}>{p.shipmentId}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.isInit ? 'INITIAL LOG' : 'HANDOFF'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} /> {p.locationName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="glass-card animate-fade-in" style={{ padding: '32px', border: '1px solid var(--color-accent)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <ShieldCheck size={24} color="var(--color-accent)" /> Audit {selected.isInit ? 'Sign-off' : 'Handoff'}: {selected.shipmentId}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Role</div>
                <div style={{ fontWeight: '700' }}>{selected.isInit ? 'System / Manager' : 'Mediator / Driver'}</div>
              </div>
              <div style={{ background: selected.temperature > 8 ? '#fff1f2' : '#f0fdf4', padding: '16px', borderRadius: '12px' }}>
                <div style={{ color: selected.temperature > 8 ? '#b91c1c' : '#15803d', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Temp</div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>{selected.temperature}°C</div>
              </div>
            </div>

            {/* AI PREDICTION CARD */}
            <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '24px', borderRadius: '16px', marginBottom: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="var(--color-accent)" />
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', color: '#475569' }}>AI Spoilage Analysis</span>
                </div>
                {prediction && (
                  <div style={{ 
                    background: prediction.spoilage_status === 0 ? '#dcfce7' : '#fee2e2', 
                    color: prediction.spoilage_status === 0 ? '#166534' : '#991b1b',
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: '700' 
                  }}>
                    {prediction.spoilage_label}
                  </div>
                )}
              </div>

              {predLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '10px' }}>Analyzing shipment health...</div>
              ) : prediction && !prediction.error ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Spoilage Risk</span>
                    <span style={{ fontWeight: '700', color: prediction.confidence_pct > 80 ? '#ef4444' : '#10b981' }}>
                      {100 - prediction.confidence_pct}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ 
                      width: `${100 - prediction.confidence_pct}%`, 
                      height: '100%', 
                      background: prediction.confidence_pct > 80 ? '#ef4444' : '#10b981',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Shelf Life</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{prediction.days_remaining} Days</div>
                    </div>
                    {prediction.overrides && prediction.overrides.length > 0 && (
                      <div style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: '12px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>AI Insights</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
                          {prediction.overrides[0]}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> AI Analysis currently unavailable
                </div>
              )}
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <UserCheck size={16} /> Manager Authorization
              </label>
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)', marginTop: '8px' }}>
                <ManualSignaturePad />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '16px', marginTop: '32px' }}>
              <button onClick={() => handleSignoff('rejected')} className="btn btn-outline" style={{ color: 'var(--color-red)', borderColor: 'var(--color-red)' }}>
                <XCircle size={20} /> Reject
              </button>
              <button onClick={() => handleSignoff('approved')} className="btn btn-primary" style={{ background: '#10b981' }}>
                <ShieldCheck size={20} /> {selected.isInit ? 'Finalize Sign-off' : 'Verify & Authorize'}
              </button>
            </div>
            {!selected.isInit && (
               <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                 ℹ️ Handoffs require secondary approval from the Consumer before anchoring.
               </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
