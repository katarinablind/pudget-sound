import { useState, useEffect, useRef } from 'react';

const glassStyle = {
  background: 'rgba(0,8,24,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,180,220,0.12)',
};

export default function IntroPanel() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const autoHideRef = useRef(null);

  useEffect(() => {
    const mountTimer = setTimeout(() => setMounted(true), 2000);
    autoHideRef.current = setTimeout(() => setVisible(false), 14000);
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(autoHideRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    clearTimeout(autoHideRef.current);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 28, right: 28,
      width: 320,
      ...glassStyle,
      padding: 24,
      fontFamily: "'DM Mono', 'Courier New', monospace",
      zIndex: 100,
      opacity: visible && mounted ? 1 : 0,
      pointerEvents: visible && mounted ? 'auto' : 'none',
      transition: 'opacity 1.5s ease',
    }}>
      {/* Close button */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', top: 12, right: 14,
          color: 'rgba(0,180,220,0.4)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        &times;
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: 14,
        fontWeight: 200,
        fontStyle: 'italic',
        fontOpticalSizing: 'auto',
        color: 'rgba(160,220,255,0.9)',
        marginBottom: 16,
      }}>
        Salish Sea Field Notes
      </div>

      {/* Body */}
      <div style={{
        fontSize: 10,
        lineHeight: 1.85,
        color: 'rgba(100,180,220,0.6)',
      }}>
        <p style={{ marginBottom: 12 }}>
          An inland sea — 1,020 km² of glacier-carved channels
          where freshwater meets Pacific saltwater at invisible
          halocline boundaries.
        </p>
        <p style={{ marginBottom: 12 }}>
          Sixteen species mapped here. Each a node in a web
          where losing one pulls threads through all the others.
        </p>
        <p style={{ marginBottom: 0, color: 'rgba(100,180,220,0.5)' }}>
          — Move through the field to listen.<br />
          — Approach a signal to hear it speak.
        </p>
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '1px solid rgba(0,180,220,0.08)',
        margin: '16px 0',
      }} />

      {/* Footer */}
      <div style={{
        fontSize: 9,
        color: 'rgba(0,180,220,0.3)',
        lineHeight: 1.7,
      }}>
        Data: OBIS &middot; WDFW &middot; NOAA &middot; 2024<br />
        Coordinates: 47.0–48.8°N, 122.0–123.2°W
      </div>

      {/* Attribution */}
      <div style={{
        fontFamily: "'DM Mono', 'Courier New', monospace",
        fontSize: 8,
        color: 'rgba(0,180,220,0.25)',
        marginTop: 6,
      }}>
        Interpretive visualization — geographic positions approximate
      </div>
    </div>
  );
}
