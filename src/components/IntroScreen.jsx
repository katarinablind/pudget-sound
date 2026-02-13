import { useState } from 'react';
import TopologyPortal from './TopologyPortal';

export default function IntroScreen({ onStart }) {
  const [fading, setFading] = useState(false);

  const handleClick = () => {
    setFading(true);
    setTimeout(onStart, 1000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#00030d',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,30,80,0.4) 0%, transparent 70%)',
      zIndex: 200,
      display: 'flex',
      transition: 'opacity 1s ease',
      opacity: fading ? 0 : 1,
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      {/* Left side — text content */}
      <div style={{
        width: '40%',
        minWidth: 320,
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Coordinates label */}
        <div style={{
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: 9,
          color: 'rgba(0,180,220,0.4)',
          letterSpacing: '0.2em',
          marginBottom: 24,
        }}>
          47.0–48.8°N / 122.0–123.2°W
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(36px, 4vw, 52px)',
          fontWeight: 200,
          fontStyle: 'italic',
          fontOpticalSizing: 'auto',
          color: 'rgba(160,220,255,0.95)',
          lineHeight: 1.1,
          marginBottom: 12,
          letterSpacing: '-0.01em',
        }}>
          Puget Sound
        </h1>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 18,
          fontWeight: 200,
          fontOpticalSizing: 'auto',
          color: 'rgba(100,180,220,0.55)',
          marginBottom: 8,
        }}>
          A Sonic Field Study
        </div>

        {/* Explanation */}
        <div style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 13,
          fontWeight: 200,
          fontStyle: 'italic',
          fontOpticalSizing: 'auto',
          color: 'rgba(100,180,220,0.45)',
          marginBottom: 32,
        }}>
          of the Salish Sea
        </div>

        {/* Poetic body text */}
        <div style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 14,
          fontWeight: 200,
          lineHeight: 1.7,
          color: 'rgba(140,200,230,0.75)',
          maxWidth: 360,
          fontOpticalSizing: 'auto',
        }}>
          <p style={{ marginBottom: 20, marginTop: 0 }}>
            Between forest and mountain, the Sound breathes—<br/>
            a long, glacial memory filled with salt and light.<br/>
            Its surface mirrors sky, but below, another world unfolds:<br/>
            kelp cathedrals swaying in green hush,<br/>
            salmon threading silver paths home,<br/>
            orcas calling through blue corridors of time.
          </p>
          <p style={{ marginBottom: 20 }}>
            Every depth holds a voice.<br/>
            Every tide carries a story.
          </p>
          <p style={{ marginBottom: 0 }}>
            Enter, and listen—<br/>
            not just to water,<br/>
            but to the living orchestra beneath it.
          </p>
        </div>

        {/* Attribution */}
        <div style={{
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: 8,
          color: 'rgba(0,180,220,0.25)',
          marginTop: 32,
        }}>
          Data: OBIS · WDFW · NOAA · 2024<br />
          Interpretive visualization — geographic positions approximate
        </div>
      </div>

      {/* Right side — TopologyPortal */}
      <div style={{
        width: '60%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <TopologyPortal onEnter={handleClick} />
      </div>
    </div>
  );
}
