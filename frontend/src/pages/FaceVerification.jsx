import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, User, Fingerprint, RefreshCcw, Camera } from 'lucide-react';
import './FaceVerification.css';

export default function FaceVerification() {
  const [searchParams] = useSearchParams();
  const shipmentId = searchParams.get('id');
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Position face in the frame');
  const [isVerified, setIsVerified] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        simulateScan();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setStatus("Camera access required");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const simulateScan = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        handleSuccess();
      }
      setProgress(current);
      if (current < 30) setStatus('Analyzing features...');
      else if (current < 60) setStatus('Matching biometric hash...');
      else if (current < 90) setStatus('Verifying Blockchain ID...');
      else setStatus('Finalizing...');
    }, 150);
  };

  const handleSuccess = () => {
    setIsVerified(true);
    setTimeout(() => {
      // Identity verified, now proceed to scan the package
      navigate('/driver-scan?verified=true');
    }, 2500);
  };

  return (
    <div className="face-root">
      <div className="face-hud-top">
        <Fingerprint size={16} style={{ marginBottom: 4 }} />
        <div>Biometric Identity Verification</div>
      </div>

      <div className="face-container">
        <video 
          ref={videoRef} 
          className="face-video" 
          autoPlay 
          muted 
          playsInline 
        />
        
        <div className="face-scanner-overlay">
          <div className="face-scan-line" />
          <div className="face-corners">
            <div className="face-corner-br" />
            <div className="face-corner-bl" />
          </div>
        </div>

        {isVerified && (
          <div className="face-success-overlay">
            <div className="face-check-icon">
              <ShieldCheck color="#fff" size={32} />
            </div>
            <div style={{ fontWeight: 800, letterSpacing: '0.1em' }}>VERIFIED</div>
            <div style={{ fontSize: '0.6rem', marginTop: 4, opacity: 0.8 }}>Identity Anchored to Chain</div>
          </div>
        )}

        <div className="face-hud-bottom">
          <div style={{ marginBottom: 4 }}>{status}</div>
          <div className="face-status-bar">
            <div className="face-status-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="face-driver-id">
        <div className="face-id-avatar">
          <User size={20} color="#3b82f6" />
        </div>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>AUTHORIZED OPERATOR</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{isVerified ? 'DRIVER #DR-4402' : 'Scanning...'}</div>
        </div>
      </div>

      {!cameraActive && (
        <button onClick={startCamera} className="login-btn" style={{ marginTop: 30, maxWidth: 200 }}>
          <Camera size={18} /> Enable Camera
        </button>
      )}
      
      <p style={{ marginTop: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 280 }}>
        Ensure your face is clearly visible and centered. This verification is required for high-value shipment handoffs.
      </p>
    </div>
  );
}
