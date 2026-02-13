export default function HUD({ depth, freq, layer }) {
  return (
    <>
      {/* Top-left readout */}
      <div style={{
        position: 'fixed', top: 24, left: 28,
        zIndex: 50, opacity: 0.7,
        letterSpacing: '0.12em', fontSize: 10,
        lineHeight: 1.9, textTransform: 'uppercase',
        fontFamily: "'DM Mono', 'Courier New', monospace",
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 16, letterSpacing: 'normal', color: 'rgba(160,220,255,0.95)',
          textShadow: '0 0 20px rgba(0,212,255,0.4)',
          marginBottom: 6,
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 200,
          fontStyle: 'italic',
          fontOpticalSizing: 'auto',
        }}>
          Puget Sound
        </div>
        <div style={{ color: 'rgba(100,180,220,0.5)', fontSize: 9, marginBottom: 12 }}>
          47.6°N — 122.3°W
        </div>
        {[
          ['DEPTH', `${(depth * 300).toFixed(0)}m`],
          ['FREQ',  `${freq.toFixed(0)}Hz`],
          ['LAYER', layer],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', gap: 8, color: 'rgba(100,180,220,0.5)' }}>
            <span>{label}</span>
            <span style={{ color: 'rgba(160,220,255,0.85)', minWidth: 60 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* North indicator — top right */}
      <div style={{
        position: 'fixed', top: 24, right: 24,
        zIndex: 50,
        fontFamily: "'DM Mono', 'Courier New', monospace",
        fontSize: 10,
        color: 'rgba(0,180,220,0.3)',
        pointerEvents: 'none',
      }}>
        N↑
      </div>

    </>
  );
}
