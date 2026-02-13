import { useEffect, useRef } from 'react';
import marineData from '../data/MarineData.json';

const COLS = 60;
const ROWS = 40;

function buildField(p5, width, height, noiseOffset, mx, my, velocityBoost, isDragging) {
  const mxN = mx / width;
  const myN = my / height;
  const field = [];
  for (let r = 0; r <= ROWS; r++) {
    field[r] = [];
    for (let c = 0; c <= COLS; c++) {
      const nx = c / COLS;
      const ny = r / ROWS;
      let val = p5.noise(nx * 2.8 + noiseOffset * 0.04, ny * 2.2 + noiseOffset * 0.025, noiseOffset * 0.008);
      for (const sp of marineData.species) {
        const dx = nx - sp.x, dy = ny - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / sp.radius);
        const soft = influence * influence * (3 - 2 * influence);
        val += soft * sp.depth * 0.35;
      }
      // Replace the existing mouse displacement block with:
      if (!isDragging) {
        const mdx = nx - mxN;
        const mdy = ny - myN;
        const mDist = Math.sqrt(mdx*mdx + mdy*mdy);
        const mInfluence = Math.max(0, 1 - mDist / 0.22);
        const mSoft = mInfluence * mInfluence * (3 - 2 * mInfluence);
        const speed = Math.sqrt((velocityBoost / 0.006)**2);
        const velocityBoost2 = Math.min(speed * 0.006, 0.35);
        val -= mSoft * (0.65 + velocityBoost2);
      }
      field[r][c] = Math.max(0, Math.min(1, val));
    }
  }
  return field;
}

function drawContours(pg, p5, field, width, height, proximityMap, frameCount, pingTimestamps) {
  const cellW = width / COLS;
  const cellH = height / ROWS;
  pg.clear();

  const LEVELS = 14;
  for (let level = 0; level < LEVELS; level++) {
    const iso = 0.12 + (level / LEVELS) * 0.72;
    const t = level / LEVELS;
    pg.stroke(
      p5.lerp(0, 20, t),
      p5.lerp(60, 180, t),
      p5.lerp(140, 255, t),
      p5.lerp(40, 120, t)
    );
    pg.strokeWeight(p5.lerp(0.3, 0.9, t));
    pg.noFill();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x0 = c * cellW, y0 = r * cellH;
        const v00 = field[r][c], v10 = field[r][c + 1];
        const v01 = field[r + 1][c], v11 = field[r + 1][c + 1];
        const idx = (v00 > iso ? 8 : 0) | (v10 > iso ? 4 : 0) | (v11 > iso ? 2 : 0) | (v01 > iso ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        const it = (a, b, v) => (iso - a) / (b - a) * v;
        const top    = { x: x0 + it(v00, v10, cellW), y: y0 };
        const bottom = { x: x0 + it(v01, v11, cellW), y: y0 + cellH };
        const left   = { x: x0, y: y0 + it(v00, v01, cellH) };
        const right  = { x: x0 + cellW, y: y0 + it(v10, v11, cellH) };

        const lineMap = {
          1: [[left, bottom]], 2: [[right, bottom]], 3: [[left, right]],
          4: [[top, right]], 5: [[top, left], [right, bottom]], 6: [[top, bottom]],
          7: [[top, left]], 8: [[top, left]], 9: [[top, bottom]],
          10: [[top, right], [left, bottom]], 11: [[top, right]],
          12: [[left, right]], 13: [[right, bottom]], 14: [[left, bottom]]
        };
        const segs = lineMap[idx];
        if (!segs) continue;
        for (const [a, b2] of segs) pg.line(a.x, a.y, b2.x, b2.y);
      }
    }
  }

  // Bioluminescent glow pass — colored contour lines near species in proximity
  for (const entry of Object.values(proximityMap)) {
    const { species: sp, proximity } = entry;
    if (proximity < 0.1) continue;
    const [sr, sg, sb] = sp.color;
    const glowRadius = sp.radius * 1.5;

    for (let level = 0; level < LEVELS; level++) {
      const iso = 0.12 + (level / LEVELS) * 0.72;
      const t = level / LEVELS;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          // Check if this cell is near the species
          const cellNx = (c + 0.5) / COLS;
          const cellNy = (r + 0.5) / ROWS;
          const dx = cellNx - sp.x, dy = cellNy - sp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > glowRadius) continue;

          const glowStrength = (1 - dist / glowRadius) * proximity;

          const x0 = c * cellW, y0 = r * cellH;
          const v00 = field[r][c], v10 = field[r][c + 1];
          const v01 = field[r + 1][c], v11 = field[r + 1][c + 1];
          const idx2 = (v00 > iso ? 8 : 0) | (v10 > iso ? 4 : 0) | (v11 > iso ? 2 : 0) | (v01 > iso ? 1 : 0);
          if (idx2 === 0 || idx2 === 15) continue;

          const it2 = (a, b, v) => (iso - a) / (b - a) * v;
          const top2    = { x: x0 + it2(v00, v10, cellW), y: y0 };
          const bottom2 = { x: x0 + it2(v01, v11, cellW), y: y0 + cellH };
          const left2   = { x: x0, y: y0 + it2(v00, v01, cellH) };
          const right2  = { x: x0 + cellW, y: y0 + it2(v10, v11, cellH) };

          const lineMap2 = {
            1: [[left2, bottom2]], 2: [[right2, bottom2]], 3: [[left2, right2]],
            4: [[top2, right2]], 5: [[top2, left2], [right2, bottom2]], 6: [[top2, bottom2]],
            7: [[top2, left2]], 8: [[top2, left2]], 9: [[top2, bottom2]],
            10: [[top2, right2], [left2, bottom2]], 11: [[top2, right2]],
            12: [[left2, right2]], 13: [[right2, bottom2]], 14: [[left2, bottom2]]
          };
          const segs2 = lineMap2[idx2];
          if (!segs2) continue;

          const cellProx = glowStrength;
          const prox = proximity;
          const glowAlpha = cellProx * cellProx * prox * 180; // Increased from 110 for better visibility
          pg.stroke(sr, sg, sb, glowAlpha * (0.6 + t * 0.4)); // Boosted base alpha from 0.5
          pg.strokeWeight(2.0); // Increased from 1.4 for more prominence
          for (const [a, b2] of segs2) pg.line(a.x, a.y, b2.x, b2.y);
        }
      }
    }
  }

  // Species discovery markers
  marineData.species.forEach((sp, index) => {
    const sx = sp.x * width, sy_base = sp.y * height;
    const [sr, sg, sb] = sp.color;
    const entry = proximityMap[sp.id];
    const near = entry ? entry.proximity : 0;

    // Diamond jump on ping
    const timeSincePing = Date.now() - (pingTimestamps[sp.id] || 0);
    const jumpT = Math.max(0, 1 - timeSincePing / 600);
    const jumpOffset = Math.sin(jumpT * Math.PI) * 12 * jumpT;
    const sy = sy_base - jumpOffset;

    // Check if hovering this diamond
    const dx = p5.mouseX - sx;
    const dy = p5.mouseY - sy;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);
    const isHovering = distToMouse < 50;

    // 1. Subtle breath pulse — boosted visibility for darker colors
    const breathRadius = 6 + 4 * ((Math.sin(frameCount * 0.02 + index * 1.3) + 1) * 0.5);
    pg.noFill();
    pg.stroke(sr, sg, sb, 40 + near * 80);
    pg.strokeWeight(1.0);
    pg.ellipse(sx, sy, breathRadius * 2, breathRadius * 2);

    // 2. Center diamond marker — brighter and more visible
    const size = 5 + near * 4;
    const alpha = 180 + near * 75;
    pg.noStroke();
    pg.fill(sr, sg, sb, 70);
    pg.quad(sx, sy - size * 2, sx + size * 2, sy, sx, sy + size * 2, sx - size * 2, sy);
    pg.fill(sr, sg, sb, alpha);
    pg.quad(sx, sy - size, sx + size, sy, sx, sy + size, sx - size, sy);

    // 3. Sonar ping ripples when near — more visible
    if (near > 0.3) {
      for (let ring = 0; ring < 2; ring++) {
        const t = ((frameCount + ring * 60) % 120) / 120;
        const ringRadius = t * 60;
        const ringAlpha = (1 - t) * 140 * near;
        pg.noFill();
        pg.stroke(sr, sg, sb, ringAlpha);
        pg.strokeWeight(1.0);
        pg.ellipse(sx, sy, ringRadius * 2, ringRadius * 2);
      }
    }

    // 4. Tooltip on hover
    if (isHovering) {
      const text = `${sp.name} — ${sp.latin} — ${sp.depthRange}`;
      pg.textFont('DM Mono, monospace');
      pg.textSize(10);

      // Calculate tooltip dimensions
      const txtWidth = pg.textWidth(text);
      const padding = 8;
      const tooltipWidth = txtWidth + padding * 2;
      const tooltipHeight = 22;

      // Smart positioning: default to right and above diamond
      let tooltipX = sx + 15;
      let tooltipY = sy - 35;

      // If tooltip goes off right edge, position to the left of diamond
      if (tooltipX + tooltipWidth > width - 10) {
        tooltipX = sx - tooltipWidth - 15;
      }

      // If tooltip goes off left edge, clamp to left margin
      if (tooltipX < 10) {
        tooltipX = 10;
      }

      // If tooltip goes off top edge, position below diamond
      if (tooltipY < 10) {
        tooltipY = sy + 35;
      }

      // If tooltip goes off bottom edge, clamp to bottom margin
      if (tooltipY + tooltipHeight > height - 10) {
        tooltipY = height - tooltipHeight - 10;
      }

      // Text background
      pg.noStroke();
      pg.fill(0, 3, 13, 220);
      pg.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 3);

      // Text with species color
      pg.textAlign(p5.LEFT, p5.BOTTOM);
      pg.fill(sr, sg, sb, 230);
      pg.text(text, tooltipX + padding, tooltipY + tooltipHeight - 6);

      // Reset alignment
      pg.textAlign(p5.LEFT, p5.BASELINE);
    }
  });
}

export default function SonicMap({ audioStarted, onDepthChange, onProximityUpdate, onDiamondCenter, pingTimestampsRef }) {
  const containerRef = useRef(null);
  const p5Ref = useRef(null);
  const stateRef = useRef({
    mx: 0, my: 0, pmx: 0, pmy: 0,
    vx: 0, vy: 0,
    noiseOffset: 0, frameCount: 0,
  });

  // Store callbacks in refs so p5 draw() always has latest versions
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onDepthChange,
    onProximityUpdate,
    onDiamondCenter,
  };

  useEffect(() => {
    let p5instance;
    import('p5').then(({ default: P5 }) => {
      const sketch = (p) => {
        let ghostLayer, contourLayer;
        const s = stateRef.current;

        p.setup = () => {
          const W = window.innerWidth, H = window.innerHeight;
          const cnv = p.createCanvas(W, H);
          cnv.parent(containerRef.current);
          ghostLayer = p.createGraphics(W, H);
          contourLayer = p.createGraphics(W, H);
          ghostLayer.background(0, 3, 13);
          p.frameRate(60);
        };

        p.windowResized = () => {
          p.resizeCanvas(window.innerWidth, window.innerHeight);
          ghostLayer = p.createGraphics(window.innerWidth, window.innerHeight);
          contourLayer = p.createGraphics(window.innerWidth, window.innerHeight);
          ghostLayer.background(0, 3, 13);
        };


        p.draw = () => {
          s.noiseOffset += 0.04;
          s.frameCount++;
          s.mx = p.mouseX; s.my = p.mouseY;

          // Calculate mouse velocity
          s.vx = s.mx - s.pmx;
          s.vy = s.my - s.pmy;
          const speed = Math.sqrt(s.vx ** 2 + s.vy ** 2);
          const velocityBoost = Math.min(speed * 0.006, 0.35);

          const W = p.width, H = p.height;

          const field = buildField(p, W, H, s.noiseOffset, s.mx, s.my, velocityBoost, false);

          // Build full proximity map for ALL species
          const proximityMap = {};

          for (const sp of marineData.species) {
            const dx = s.mx - (sp.x * W);
            const dy = s.my - (sp.y * H);
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Diamond center detection — within 18px triggers ping
            if (dist < 18) {
              callbacksRef.current.onDiamondCenter(sp);
            }

            // Proximity zone detection for audio
            const threshold = sp.radius * W * 1.2;
            if (dist < threshold) {
              const prox = 1 - dist / threshold;
              proximityMap[sp.id] = { species: sp, proximity: prox };
            }
          }

          // Send proximity map to App for audio zones
          callbacksRef.current.onProximityUpdate(proximityMap);

          // Cursor depth sample
          const cx = Math.floor(Math.max(0, Math.min(s.mx / (W / COLS), COLS - 1)));
          const cy = Math.floor(Math.max(0, Math.min(s.my / (H / ROWS), ROWS - 1)));
          const depth = field[cy]?.[cx] ?? 0.5;
          callbacksRef.current.onDepthChange(depth);

          drawContours(contourLayer, p, field, W, H, proximityMap, s.frameCount, pingTimestampsRef?.current || {});

          ghostLayer.noStroke();
          ghostLayer.fill(0, 3, 13, 20);
          ghostLayer.rect(0, 0, W, H);

          p.image(ghostLayer, 0, 0);
          p.image(contourLayer, 0, 0);

          ghostLayer.drawingContext.globalAlpha = 0.55;
          ghostLayer.image(contourLayer, 0, 0);
          ghostLayer.drawingContext.globalAlpha = 1.0;

          // Draw an extra blurred copy of contourLayer for bloom boost
          p.drawingContext.globalAlpha = 0.25;
          p.drawingContext.filter = 'blur(6px)';
          p.image(contourLayer, 0, 0);
          p.drawingContext.filter = 'blur(16px)';
          p.drawingContext.globalAlpha = 0.12;
          p.image(contourLayer, 0, 0);
          p.drawingContext.filter = 'none';
          p.drawingContext.globalAlpha = 1.0;

          // Store previous mouse position at end of draw
          s.pmx = s.mx;
          s.pmy = s.my;
        };
      };
      p5instance = new P5(sketch);
      p5Ref.current = p5instance;
    });

    return () => { p5instance?.remove(); };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />;
}
