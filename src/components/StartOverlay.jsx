import { useState } from 'react';

export default function StartOverlay({ onStart }) {
  const [fading, setFading] = useState(false);

  const handleClick = () => {
    setFading(true);
    setTimeout(onStart, 800);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed', inset: 0,
        background: '#00050a',
        zIndex: 200,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'opacity 0.8s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: 200, height: 200,
          border: '1px solid rgba(0,255,204,0.08)',
          borderRadius: '50%',
          animation: `pulseOut 4s ${i * 1.3}s infinite ease-out`,
        }} />
      ))}

      <h1 style={{
        fontSize: 'clamp(18px, 3vw, 32px)',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: '#00ffcc',
        textShadow: '0 0 40px rgba(0,255,204,0.5)',
        marginBottom: 12,
        fontFamily: 'Courier New, monospace',
      }}>Puget Sound</h1>

      <p style={{
        fontSize: 10, letterSpacing: '0.2em',
        color: 'rgba(0,200,160,0.5)',
        textTransform: 'uppercase',
        marginBottom: 48,
      }}>Marine Biodiversity Depth Map</p>

      <button style={{
        border: '1px solid rgba(0,255,204,0.3)',
        padding: '14px 36px',
        fontFamily: 'Courier New, monospace',
        fontSize: 11, letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'rgba(0,255,204,0.7)',
        background: 'transparent',
        cursor: 'pointer',
        boxShadow: '0 0 30px rgba(0,255,204,0.05)',
        transition: 'all 0.3s ease',
      }}>Enter the Deep</button>
    </div>
  );
}
