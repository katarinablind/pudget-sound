import { useState, useEffect, useRef } from 'react';

const rings = [
  { maxSize: 160, duration: 1.2, delay: 0, startOpacity: 0.8 },
  { maxSize: 240, duration: 1.6, delay: 0.15, startOpacity: 0.5 },
  { maxSize: 120, duration: 0.9, delay: 0.05, startOpacity: 0.3 },
];

export default function SonarBurst({ active, x, y, color }) {
  const [animKey, setAnimKey] = useState(0);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      setAnimKey(k => k + 1);
    }
    prevActive.current = active;
  }, [active]);

  if (animKey === 0) return null;

  const [r = 0, g = 180, b = 220] = color || [];

  return (
    <div
      key={animKey}
      style={{
        position: 'fixed',
        left: x, top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 140,
        width: 0, height: 0,
      }}
    >
      <style>{`
        @keyframes sonarExpand_${animKey}_0 {
          0% { width: 0; height: 0; opacity: ${rings[0].startOpacity}; }
          100% { width: ${rings[0].maxSize}px; height: ${rings[0].maxSize}px; opacity: 0; }
        }
        @keyframes sonarExpand_${animKey}_1 {
          0% { width: 0; height: 0; opacity: ${rings[1].startOpacity}; }
          100% { width: ${rings[1].maxSize}px; height: ${rings[1].maxSize}px; opacity: 0; }
        }
        @keyframes sonarExpand_${animKey}_2 {
          0% { width: 0; height: 0; opacity: ${rings[2].startOpacity}; }
          100% { width: ${rings[2].maxSize}px; height: ${rings[2].maxSize}px; opacity: 0; }
        }
      `}</style>
      {rings.map((ring, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1px solid rgba(${r},${g},${b},1)`,
            animation: `sonarExpand_${animKey}_${i} ${ring.duration}s ${ring.delay}s ease-out forwards`,
            width: 0, height: 0,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
