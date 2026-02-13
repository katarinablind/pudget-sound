import { useState, useCallback, useRef, useEffect } from 'react';
import SonicMap from './components/SonicMap';
import HUD from './components/HUD';
import IntroScreen from './components/IntroScreen';
import Cursor from './components/Cursor';
import SonarBurst from './components/SonarBurst';
import { useAudioEngine } from './hooks/useAudioEngine';

function getOceanLayer(depth) {
  if (depth < 0.3) return 'PHOTIC';
  if (depth < 0.6) return 'MESOPELAGIC';
  if (depth < 0.85) return 'BATHYPELAGIC';
  return 'ABYSSAL';
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [depth, setDepth] = useState(0.5);
  const [sonarBurst, setSonarBurst] = useState({ active: false, x: 0, y: 0, color: [0, 180, 220] });

  const cursorRef = useRef({ x: 0, y: 0 });
  const sonarTimerRef = useRef(null);
  const pingTimestampsRef = useRef({});

  const { start, modulateFilter, updateZones, triggerDiamondPing } = useAudioEngine();

  // Track cursor position via ref
  useEffect(() => {
    const handleMouseMove = (e) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStart = useCallback(async () => {
    setStarted(true);
    await start();
  }, [start]);

  const handleDepthChange = useCallback((d) => {
    setDepth(d);
    modulateFilter(d);
  }, [modulateFilter]);

  // Called every frame with full proximity map from SonicMap
  const handleProximityUpdate = useCallback((proximityMap) => {
    updateZones(proximityMap);
  }, [updateZones]);

  // Called when cursor is within 18px of diamond center
  const handleDiamondCenter = useCallback((species) => {
    triggerDiamondPing(species);

    // Sonar burst visual
    setSonarBurst({
      active: true,
      x: cursorRef.current.x,
      y: cursorRef.current.y,
      color: species.color,
    });
    clearTimeout(sonarTimerRef.current);
    sonarTimerRef.current = setTimeout(() => setSonarBurst(prev => ({ ...prev, active: false })), 2000);

    // Record ping timestamp for diamond jump
    pingTimestampsRef.current[species.id] = Date.now();
  }, [triggerDiamondPing]);

  const freq = 80 + (1 - depth) * 2400;

  return (
    <>
      <style>{`
        @keyframes pulseOut {
          0% { transform: scale(0.3); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        * { cursor: none; }
      `}</style>

      {!started && <IntroScreen onStart={handleStart} />}

      <SonicMap
        audioStarted={started}
        onDepthChange={handleDepthChange}
        onProximityUpdate={handleProximityUpdate}
        onDiamondCenter={handleDiamondCenter}
        pingTimestampsRef={pingTimestampsRef}
      />

      {started && (
        <>
          <HUD
            depth={depth}
            freq={freq}
            layer={getOceanLayer(depth)}
          />
          <SonarBurst {...sonarBurst} />
        </>
      )}

      <Cursor nearSpecies={false} isDragging={false} />
    </>
  );
}
