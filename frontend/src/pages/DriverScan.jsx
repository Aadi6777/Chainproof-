import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, QrCode, ArrowLeft, Truck, Package } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function DriverScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [shipmentId, setShipmentId] = useState('');
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setIsScanning(true);
    const html5QrCode = new Html5Qrcode("driver-reader");
    scannerRef.current = html5QrCode;
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setShipmentId(decodedText);
          stopCamera();
          // After scan, go to Face Verification step
          navigate(`/face-verify?id=${decodedText.trim()}`);
        },
        () => {}
      );
    } catch (err) {
      alert("Camera error: " + err);
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="login-root">
      {/* ── Cinematic Background ── */}
      <div className="login-video-container">
        <div className="login-video-overlay" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(6, 8, 18, 0.9) 100%)' }} />
      </div>

      <div style={{ position: 'relative', z-index: 10, width: '100%', maxWidth: '480px', padding: '20px' }}>
        <button onClick={() => navigate('/')} className="login-driver-btn" style={{ marginBottom: '24px', width: 'auto', padding: '10px 20px' }}>
          <ArrowLeft size={16} /> Back to Portal
        </button>

        <div className="login-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' }}>
            <Truck size={32} color="#3b82f6" />
          </div>

          <h1 className="login-title" style={{ fontSize: '1.8rem' }}>Logistics Scan</h1>
          <p className="login-subtitle" style={{ marginBottom: '32px' }}>Initialize handoff by scanning the package QR code.</p>

          <div id="driver-reader" style={{ width: '100%', marginBottom: isScanning ? '24px' : '0', borderRadius: '16px', overflow: 'hidden', border: isScanning ? '1px solid rgba(255,255,255,0.1)' : 'none' }}></div>

          {!isScanning ? (
            <button onClick={startCamera} className="login-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <Camera size={24} /> Start Secure Scan
            </button>
          ) : (
            <button onClick={stopCamera} className="login-driver-btn" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>Cancel Scan</button>
          )}

          <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '0.65rem', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: '4px' }}>
              <Package size={12} /> ENCRYPTED DATA CHANNEL
            </div>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'left' }}>
              Records initiated here will trigger mandatory **Biometric Identity Verification** before being anchored to the blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
