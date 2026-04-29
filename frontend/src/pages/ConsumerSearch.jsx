import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Package } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ConsumerSearch() {
  const [shipmentId, setShipmentId] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (shipmentId.trim()) {
      navigate(`/shipment/${shipmentId.trim()}`);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '20px' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', textAlign: 'center', padding: '48px 32px' }}>
        
        <div style={{ width: '64px', height: '64px', background: '#f0f4ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Search size={32} color="var(--color-accent)" />
        </div>

        <h1 style={{ marginBottom: '12px', fontSize: '1.75rem', fontWeight: '800' }}>Track Your Shipment</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>Enter the unique ID on your package to see the unedited Truth Trail.</p>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>SHIPMENT ID</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ padding: '14px', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px', fontWeight: '700' }} 
              placeholder="SHP-XXXXX" 
              value={shipmentId} 
              onChange={e => setShipmentId(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '54px', fontSize: '1.1rem' }}>
            Verify on Blockchain
          </button>
        </form>

        <div style={{ marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Shield size={14} color="var(--color-green)" />
          Secured by Blockchain Provenance
        </div>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
          <button onClick={() => navigate('/handoff')} className="btn btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Package size={18} /> Confirm Receipt / Log Handoff
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple internal helper for the icon
const CheckCircle = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
