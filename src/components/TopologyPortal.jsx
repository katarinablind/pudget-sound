import { useEffect, useRef } from 'react';

// A self-contained p5 sketch for the entry screen right panel.
// Shows a small marching-squares topographic field that follows the cursor.
// Clicking triggers an expand animation then calls onEnter().
export default function TopologyPortal({ onEnter }) {
  const containerRef = useRef(null);
  const expandingRef = useRef(false);

  useEffect(() => {
    let p5instance;
    import('p5').then(({ default: P5 }) => {
      const sketch = (p) => {
        // Smaller grid — this is a preview, not the full map
        const COLS = 32, ROWS = 22;
        let mx = 0, my = 0;
        let expandT = 0; // 0 = normal, 1 = fully expanded
        let ghostLayer;

        p.setup = () => {
          const cnv = p.createCanvas(
            containerRef.current.offsetWidth,
            containerRef.current.offsetHeight
          );
          cnv.parent(containerRef.current);
          ghostLayer = p.createGraphics(p.width, p.height);
          ghostLayer.background(0, 3, 13, 0);
          p.frameRate(60);
        };

        p.mouseMoved = () => {
          // Convert to canvas-local coordinates
          mx = p.mouseX;
          my = p.mouseY;
        };

        p.draw = () => {
          const W = p.width, H = p.height;
          const cellW = W / COLS, cellH = H / ROWS;
          const t = p.frameCount * 0.012;

          // If expanding: grow expandT toward 1
          if (expandingRef.current && expandT < 1) {
            expandT = Math.min(1, expandT + 0.03);
          }

          // Build field — same logic as main map but cursor-centered
          const field = [];
          for (let r = 0; r <= ROWS; r++) {
            field[r] = [];
            for (let c = 0; c <= COLS; c++) {
              const nx = c / COLS;
              const ny = r / ROWS;
              let val = p.noise(nx * 2.5 + t * 0.04, ny * 2.0 + t * 0.03, t * 0.01);

              // Mouse depression
              const mxN = mx / W;
              const myN = my / H;
              const mdx = nx - mxN, mdy = ny - myN;
              const mDist = Math.sqrt(mdx*mdx + mdy*mdy);
              const mSoft = Math.max(0, 1 - mDist / 0.25) ** 2;
              val -= mSoft * 0.5;

              // Expand effect: as expandT grows, push topology outward from center
              if (expandT > 0) {
                const cx = nx - 0.5, cy = ny - 0.5;
                const cDist = Math.sqrt(cx*cx + cy*cy);
                val -= expandT * (1 - cDist) * 0.8;
              }

              field[r][c] = Math.max(0, Math.min(1, val));
            }
          }

          // Ghost fade
          ghostLayer.noStroke();
          ghostLayer.fill(0, 3, 13, expandingRef.current ? 30 : 18);
          ghostLayer.rect(0, 0, W, H);
          p.image(ghostLayer, 0, 0);

          // Draw contours
          const LEVELS = 10;
          for (let level = 0; level < LEVELS; level++) {
            const iso = 0.15 + (level / LEVELS) * 0.65;
            const lv = level / LEVELS;

            // Color shifts toward white/bright as expandT grows (portal opening)
            const alpha = p.lerp(p.lerp(80, 160, lv), 220, expandT); // Increased from 30-100 to 80-160
            p.stroke(
              p.lerp(0, p.lerp(20, 180, expandT), lv),
              p.lerp(100, p.lerp(180, 220, expandT), lv), // Increased from 60 to 100
              p.lerp(180, p.lerp(255, 255, expandT), lv), // Increased from 140 to 180
              alpha
            );
            p.strokeWeight(p.lerp(0.6, 1.4, lv)); // Increased from 0.3-0.8 to 0.6-1.4
            p.noFill();

            for (let r = 0; r < ROWS; r++) {
              for (let c = 0; c < COLS; c++) {
                const x0 = c * cellW, y0 = r * cellH;
                const v00 = field[r][c], v10 = field[r][c+1];
                const v01 = field[r+1][c], v11 = field[r+1][c+1];
                const idx = (v00>iso?8:0)|(v10>iso?4:0)|(v11>iso?2:0)|(v01>iso?1:0);
                if (idx === 0 || idx === 15) continue;

                const it = (a, b, v) => (iso-a)/(b-a)*v;
                const top    = {x: x0+it(v00,v10,cellW), y: y0};
                const bottom = {x: x0+it(v01,v11,cellW), y: y0+cellH};
                const left   = {x: x0, y: y0+it(v00,v01,cellH)};
                const right  = {x: x0+cellW, y: y0+it(v10,v11,cellH)};

                const lm = {
                  1: [[left, bottom]], 2: [[right, bottom]], 3: [[left, right]],
                  4: [[top, right]], 5: [[top, left], [right, bottom]], 6: [[top, bottom]],
                  7: [[top, left]], 8: [[top, left]], 9: [[top, bottom]],
                  10: [[top, right], [left, bottom]], 11: [[top, right]],
                  12: [[left, right]], 13: [[right, bottom]], 14: [[left, bottom]]
                };
                const segs = lm[idx];
                if (!segs) continue;
                for (const [a, b2] of segs) p.line(a.x, a.y, b2.x, b2.y);
              }
            }
          }

          // If fully expanded, call onEnter
          if (expandT >= 1) {
            p5instance?.remove();
            onEnter();
          }
        };
      };

      p5instance = new P5(sketch);
    });

    return () => p5instance?.remove();
  }, [onEnter]);

  const handleEnterClick = () => {
    expandingRef.current = true;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The live topology canvas */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Enter button — positioned bottom-right of this panel */}
      <div
        onClick={handleEnterClick}
        style={{
          position: 'absolute',
          bottom: 48,
          right: 52,
          fontFamily: "'DM Mono', monospace",
          fontSize: 13,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(0, 210, 255, 0.85)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 10,
          userSelect: 'none',
          padding: '12px 24px',
          border: '1px solid rgba(0, 210, 255, 0.4)',
          borderRadius: '2px',
          backdropFilter: 'blur(8px)',
          background: 'rgba(0, 40, 80, 0.2)',
          textShadow: '0 0 12px rgba(0, 210, 255, 0.6)',
          boxShadow: '0 0 20px rgba(0, 210, 255, 0.15)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'rgba(0, 230, 255, 1.0)';
          e.currentTarget.style.borderColor = 'rgba(0, 230, 255, 0.8)';
          e.currentTarget.style.background = 'rgba(0, 60, 100, 0.3)';
          e.currentTarget.style.textShadow = '0 0 20px rgba(0, 230, 255, 1)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 230, 255, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(0, 210, 255, 0.85)';
          e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)';
          e.currentTarget.style.background = 'rgba(0, 40, 80, 0.2)';
          e.currentTarget.style.textShadow = '0 0 12px rgba(0, 210, 255, 0.6)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 210, 255, 0.15)';
        }}
      >
        Enter ↓
      </div>
    </div>
  );
}
