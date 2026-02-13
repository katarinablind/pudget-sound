import { useState, useEffect, useRef } from 'react';

const emojiMap = {
  mammal: '\u{1F433}',
  cephalopod: '\u{1F991}',
  plant: '\u{1F33F}',
  crustacean: '\u{1F980}',
  fish: '\u{1F41F}',
};

function randomBlocks(color, count) {
  const [r, g, b] = color || [0, 180, 220];
  return Array.from({ length: count }, () => ({
    x: Math.random() * 180,
    y: Math.random() * 240,
    w: 8 + Math.random() * 32,
    h: 8 + Math.random() * 32,
    opacity: 0.1 + Math.random() * 0.4,
    isWhite: Math.random() > 0.7,
    color: [r, g, b],
  }));
}

export default function GlitchCard({ species }) {
  const [animKey, setAnimKey] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | flicker | emerge | decay | fadeout
  const intervalRef = useRef(null);
  const prevSpeciesId = useRef(null);

  useEffect(() => {
    if (!species) {
      setPhase('idle');
      prevSpeciesId.current = null;
      return;
    }

    if (species.id === prevSpeciesId.current) return;
    prevSpeciesId.current = species.id;

    setAnimKey(k => k + 1);
    setPhase('flicker');
    setBlocks(randomBlocks(species.color, 10));

    // Flicker phase: 0–300ms — rapid repositioning every 50ms
    const flickerInterval = setInterval(() => {
      setBlocks(randomBlocks(species.color, 10));
    }, 50);

    // Emergence phase: 300ms
    const emergeTimer = setTimeout(() => {
      clearInterval(flickerInterval);
      setPhase('emerge');
      // Slower blocks during emergence
      intervalRef.current = setInterval(() => {
        setBlocks(randomBlocks(species.color, 5));
      }, 120);
    }, 300);

    // Decay phase: 800ms
    const decayTimer = setTimeout(() => {
      setPhase('decay');
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setBlocks(randomBlocks(species.color, 3));
      }, 200);
    }, 800);

    // Fadeout phase: 2000ms
    const fadeTimer = setTimeout(() => {
      setPhase('fadeout');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 2000);

    // Cleanup: 2500ms
    const doneTimer = setTimeout(() => {
      setPhase('idle');
    }, 2500);

    return () => {
      clearInterval(flickerInterval);
      clearTimeout(emergeTimer);
      clearTimeout(decayTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [species]);

  if (phase === 'idle' || !species) return null;

  const emoji = emojiMap[species.category] || '\u{1F30A}';
  const [r, g, b] = species.color || [0, 180, 220];
  const showEmoji = phase === 'emerge' || phase === 'decay';
  const containerOpacity = phase === 'fadeout' ? 0 : 1;

  return (
    <div
      key={animKey}
      style={{
        position: 'fixed',
        bottom: 40, right: 360,
        width: 200, height: 260,
        zIndex: 150,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: containerOpacity,
        transition: phase === 'fadeout' ? 'opacity 0.5s ease' : 'none',
      }}
    >
      {/* Pixel blocks */}
      {blocks.map((block, i) => (
        <div
          key={`${animKey}-${i}-${block.x.toFixed(0)}`}
          style={{
            position: 'absolute',
            left: block.x,
            top: block.y,
            width: block.w,
            height: block.h,
            background: block.isWhite
              ? `rgba(255,255,255,${block.opacity * 0.3})`
              : `rgba(${block.color[0]},${block.color[1]},${block.color[2]},${block.opacity})`,
            transition: 'left 0.05s, top 0.05s',
          }}
        />
      ))}

      {/* Scan lines during decay */}
      {phase === 'decay' && (
        <>
          {[0, 1, 2].map(i => (
            <div
              key={`scan-${i}`}
              style={{
                position: 'absolute',
                top: 60 + i * 70,
                left: 0,
                width: '100%',
                height: 2,
                background: `rgba(${r},${g},${b},0.15)`,
                animation: `scanLine_${animKey} 0.8s ${i * 0.15}s linear infinite`,
              }}
            />
          ))}
          <style>{`
            @keyframes scanLine_${animKey} {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </>
      )}

      {/* Emoji silhouette */}
      {showEmoji && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 96,
          color: `rgb(${r},${g},${b})`,
          filter: 'contrast(0) brightness(2)',
          mixBlendMode: 'screen',
          opacity: phase === 'emerge' ? 0.6 : 0,
          transition: phase === 'decay'
            ? 'opacity 1.2s ease-out'
            : 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: phase === 'emerge' ? `emojiRise_${animKey} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards` : 'none',
        }}>
          {emoji}
        </div>
      )}

      <style>{`
        @keyframes emojiRise_${animKey} {
          0% { transform: translate(-50%, -30%) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
