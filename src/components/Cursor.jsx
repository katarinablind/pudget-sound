import { useEffect, useRef } from 'react';

export default function Cursor({ nearSpecies, isDragging }) {
  const cursorRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // Update cursor style when dragging state changes
    document.body.style.cursor = isDragging ? 'grabbing' : 'none';
    return () => { document.body.style.cursor = 'none'; };
  }, [isDragging]);

  const ringSize = isDragging ? 36 : 28;
  const ringOpacity = isDragging ? 0.2 : 0.3;
  const showCrosshair = !isDragging;

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        left: 0, top: 0,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      {/* Outer ring — constant size, no species expansion */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: ringSize, height: ringSize,
        borderRadius: '50%',
        border: `1px solid rgba(0,212,255,${ringOpacity})`,
        transition: 'all 0.25s ease',
      }} />

      {/* Crosshair — horizontal line (hidden when dragging) */}
      {showCrosshair && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12, height: 1,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <div style={{ width: 4, height: 1, background: 'rgba(0,212,255,0.9)' }} />
          <div style={{ width: 4, height: 1, background: 'rgba(0,212,255,0.9)' }} />
        </div>
      )}

      {/* Crosshair — vertical line (hidden when dragging) */}
      {showCrosshair && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1, height: 12,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ width: 1, height: 4, background: 'rgba(0,212,255,0.9)' }} />
          <div style={{ width: 1, height: 4, background: 'rgba(0,212,255,0.9)' }} />
        </div>
      )}

      {/* Center dot */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 3, height: 3,
        borderRadius: '50%',
        background: '#00d4ff',
        boxShadow: '0 0 8px rgba(0,212,255,0.6), 0 0 16px rgba(0,212,255,0.3)',
      }} />
    </div>
  );
}
