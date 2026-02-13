# Puget Sound Sonic Map — p5.js + CPX Controller Handoff

## Project Overview
Convert the React-based Puget Sound Sonic Map into a standalone p5.js sketch with Circuit Playground Express (CPX) as a physical controller for an interactive installation experience.

---

## Current Architecture (React Version)

### Core Components
1. **SonicMap.jsx** — Main p5 sketch embedded in React
   - Marching squares algorithm for topographic contours
   - Perlin noise field generation
   - Species markers with proximity detection
   - Bioluminescent glow effect
   - Mouse-based interaction

2. **AudioEngine.js** — Tone.js-based sound system
   - Base drone: `['D1', 'A1', 'E2', 'B2']` with sub-bass at `A0`
   - Zone-based ambient layers (5 categories)
   - Depth-mapped pitch transposition
   - Diamond ping sounds on click

3. **Data Structure** — MarineData.json
   - 24 marine species with coordinates, depth ranges, colors
   - Bounds: 47.0°N–48.8°N, -123.2°W–-122.0°W (Puget Sound/Salish Sea)

---

## Target: Standalone p5.js + CPX Version

### System Architecture

```
┌─────────────────────────────────────────────────┐
│  p5.js Sketch (index.html + sketch.js)          │
│  ├─ Topology visualization (marching squares)   │
│  ├─ Species markers & tooltips                  │
│  ├─ Mouse/touch input (desktop/mobile)          │
│  └─ Serial communication with CPX               │
└─────────────────────────────────────────────────┘
                      ↕ Serial USB
┌─────────────────────────────────────────────────┐
│  Circuit Playground Express (CircuitPython)     │
│  ├─ Accelerometer → depth control               │
│  ├─ Capacitive touch pads → zone selection      │
│  ├─ Light sensor → audio volume                 │
│  ├─ NeoPixels → visual feedback (species color) │
│  └─ Speaker → optional local audio feedback     │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
puget-sound-p5-cpx/
├── index.html                 # Main HTML file
├── sketch.js                  # p5 sketch (combines SonicMap logic)
├── audio.js                   # Tone.js audio engine
├── marineData.js              # Species data (converted from JSON)
├── cpx.py                     # CircuitPython code for CPX
├── assets/
│   └── fonts/                 # DM Mono, Fraunces fonts
└── README.md                  # Setup instructions
```

---

## Implementation Guide

### 1. p5.js Sketch (sketch.js)

**Key adaptations from React version:**

```javascript
// Global state (replaces React state)
let depth = 0.5;
let proximityMap = {};
let hoveredSpecies = null;
let pingTimestamps = {};

// Canvas setup
function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  // Initialize audio engine
  initAudio();

  // Initialize serial communication with CPX
  initSerial();

  // Create graphics buffers
  ghostLayer = createGraphics(width, height);
  contourLayer = createGraphics(width, height);
}

// Main draw loop
function draw() {
  // 1. Build Perlin noise field (same as buildField() in React)
  const field = buildField();

  // 2. Draw topology contours (same as drawContours())
  drawContours(field);

  // 3. Check CPX inputs and update state
  handleCPXInput();

  // 4. Update audio based on proximity/depth
  updateAudio();

  // 5. Render layers
  image(ghostLayer, 0, 0);
  image(contourLayer, 0, 0);

  // 6. Draw HUD
  drawHUD();
}

// Field generation (Perlin noise + species influence)
function buildField() {
  const COLS = 60, ROWS = 40;
  const field = [];

  for (let r = 0; r <= ROWS; r++) {
    field[r] = [];
    for (let c = 0; c <= COLS; c++) {
      const nx = c / COLS;
      const ny = r / ROWS;

      // Base Perlin noise
      let val = noise(nx * 2.8 + noiseOffset * 0.04,
                      ny * 2.2 + noiseOffset * 0.025,
                      noiseOffset * 0.008);

      // Add species depth influence
      for (const sp of marineData.species) {
        const dx = nx - sp.x;
        const dy = ny - sp.y;
        const dist = sqrt(dx * dx + dy * dy);
        const influence = max(0, 1 - dist / sp.radius);
        const soft = influence * influence * (3 - 2 * influence);
        val += soft * sp.depth * 0.35;
      }

      // Mouse displacement (skip if using CPX tilt control)
      const mxN = mouseX / width;
      const myN = mouseY / height;
      const mdx = nx - mxN;
      const mdy = ny - myN;
      const mDist = sqrt(mdx * mdx + mdy * mdy);
      if (mDist < 0.22) {
        const pull = (1 - mDist / 0.22);
        val -= pull * pull * 0.18;
      }

      field[r][c] = constrain(val, 0, 1);
    }
  }
  return field;
}
```

**Marching Squares (keep as-is from React):**
- LEVELS = 14 contour lines
- Bioluminescent glow with species colors
- Alpha values: 80-160, strokeWeight: 0.6-1.4
- Glow multiplier: 180, strokeWeight: 2.0

**Species Markers:**
- Breath pulse: alpha `40 + near * 80`, strokeWeight `1.0`
- Diamond center: alpha `180 + near * 75`
- Sonar ripples: alpha `140 * near` when `near > 0.3`
- Tooltip on hover (50px radius) with smart edge detection

---

### 2. CPX Controller (cpx.py)

**CircuitPython code for Circuit Playground Express:**

```python
import time
import board
import digitalio
import touchio
from adafruit_circuitplayground import cp

# Serial output to p5.js
while True:
    # 1. ACCELEROMETER → Depth control
    x, y, z = cp.acceleration
    # Tilt forward/back controls depth (0-300m)
    depth_val = constrain(map_range(y, -10, 10, 0, 1), 0, 1)

    # 2. CAPACITIVE TOUCH → Zone selection
    # A1-A7 pads mapped to species categories
    touch_zones = {
        "mammals": cp.touch_A1,
        "fish": cp.touch_A2,
        "cephalopods": cp.touch_A3,
        "crustaceans": cp.touch_A4,
        "plants": cp.touch_A5,
    }

    active_zone = None
    for zone, pad in touch_zones.items():
        if pad:
            active_zone = zone
            break

    # 3. LIGHT SENSOR → Volume control
    light_level = cp.light
    volume = map_range(light_level, 0, 320, 0, 1)

    # 4. BUTTON A → Ping nearest species
    ping = cp.button_a

    # Send data as JSON over serial
    import json
    data = {
        "depth": depth_val,
        "zone": active_zone,
        "volume": volume,
        "ping": ping
    }
    print(json.dumps(data))

    time.sleep(0.05)  # 20Hz update rate

def map_range(x, in_min, in_max, out_min, out_max):
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

def constrain(val, min_val, max_val):
    return max(min_val, min(max_val, val))
```

**CPX → p5.js Serial Communication:**

```javascript
// In sketch.js
let serial;
let cpxData = { depth: 0.5, zone: null, volume: 0.5, ping: false };

function initSerial() {
  serial = new p5.SerialPort();
  serial.on('data', serialEvent);
  serial.open('/dev/tty.usbmodem14201'); // Adjust port
}

function serialEvent() {
  const str = serial.readStringUntil('\n');
  if (str) {
    try {
      cpxData = JSON.parse(str);

      // Update sketch state
      depth = cpxData.depth;

      // Update audio volume
      Tone.Destination.volume.value = map(cpxData.volume, 0, 1, -20, 0);

      // Trigger ping if button pressed
      if (cpxData.ping && !lastPingState) {
        triggerNearestPing();
      }
      lastPingState = cpxData.ping;

    } catch (e) {
      console.log('Parse error:', e);
    }
  }
}
```

---

### 3. Audio System (audio.js)

**Simplified from React version using Tone.js:**

```javascript
// Base drone
const drone = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'sine' },
  envelope: { attack: 4, decay: 0, sustain: 1, release: 8 }
}).toDestination();

const subDrone = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 6, decay: 0, sustain: 1, release: 10 }
}).toDestination();

// Start drones
drone.volume.value = -32;
subDrone.volume.value = -28;
drone.triggerAttack(['D1', 'A1', 'E2', 'B2']);
subDrone.triggerAttack('A0');

// Zone layers (5 categories)
const zoneLayers = {
  mammals: createZoneLayer(['C2', 'E2', 'G2'], -2),
  fish: createZoneLayer(['A1', 'C2', 'E2'], -3),
  cephalopods: createZoneLayer(['F2', 'A2', 'C3'], -3),
  crustaceans: createZoneLayer(['D2', 'F2', 'A2'], -5),
  plants: createZoneLayer(['E1', 'G1', 'B1'], 0)
};

function createZoneLayer(notes, volumeDb) {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 2, decay: 0, sustain: 1, release: 3 }
  }).toDestination();

  synth.volume.value = volumeDb;
  synth.triggerAttack(notes);
  synth.volume.value = -Infinity; // Start muted

  return synth;
}

// Update based on proximity (called every frame)
function updateAudio() {
  for (const [category, layer] of Object.entries(zoneLayers)) {
    let maxProx = 0;

    for (const entry of Object.values(proximityMap)) {
      if (entry.species.category === category) {
        maxProx = Math.max(maxProx, entry.proximity);
      }
    }

    // Smooth volume transition
    const targetVol = maxProx > 0 ? map(maxProx, 0, 1, -40, layer.baseVolume) : -Infinity;
    layer.volume.rampTo(targetVol, 0.5);
  }

  // Depth-based filter modulation
  const filterFreq = 80 + (1 - depth) * 2400;
  droneFilter.frequency.rampTo(filterFreq, 0.3);
}

// Diamond ping sound
function triggerPing(species) {
  const ping = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 }
  }).toDestination();

  // Depth-based pitch
  const octaveOffset = species.depth < 0.3 ? 1 : species.depth > 0.7 ? -1 : 0;
  const baseNote = 'C4';
  const freq = Tone.Frequency(baseNote).transpose(octaveOffset * 12);

  ping.volume.value = -24;
  ping.triggerAttackRelease(freq, '0.5s');
}
```

---

### 4. Lower-Fi Simplifications

**Visual Optimizations:**
- Reduce `COLS` from 60 → 40, `ROWS` from 40 → 30 (fewer marching squares)
- Drop bioluminescent glow pass (significant performance gain)
- Simplify species markers: just diamond + tooltip (skip breath pulse, sonar ripples)
- Use flat colors instead of gradients

**Audio Optimizations:**
- Use Web Audio API instead of Tone.js (lighter weight)
- Pre-render zone loops as audio buffers (avoid real-time synthesis)
- Single drone tone instead of polyphonic chord

**CPX-Specific:**
- Use tilt instead of mouse for depth control
- Touch pads for manual zone focus/muting
- NeoPixels show nearest species color
- Optional: CPX speaker plays ping sounds locally

---

## Key Data Reference

### Species Categories
- **mammals** (5 species): Orcas, Harbor Seals, Sea Lions
- **fish** (8 species): Salmon, Herring, Rockfish, Lingcod
- **cephalopods** (4 species): Giant Pacific Octopus, Market Squid
- **crustaceans** (4 species): Dungeness Crab, Spot Prawns
- **plants** (3 species): Bull Kelp, Eelgrass, Sea Lettuce

### Audio Settings
- **Drone**: -32dB (D1, A1, E2, B2), Sub -28dB (A0)
- **Zone volumes**: mammals -2dB, fish -3dB, cephalopods -3dB, crustaceans -5dB, plants 0dB
- **Ping volumes**: -22dB to -28dB (reduced ~14dB from zones)
- **Filter range**: 80Hz (deep) to 2480Hz (shallow)

### Visual Settings
- **Contour levels**: 14 (iso 0.12–0.84)
- **Base topology**: stroke alpha 80-160, weight 0.6-1.4
- **Bioluminescence**: alpha × 180, weight 2.0
- **Species markers**: hover radius 50px, ping radius 18px

---

## CPX Hardware Setup

### Pin Mapping
- **A1**: Mammals zone
- **A2**: Fish zone
- **A3**: Cephalopods zone
- **A4**: Crustaceans zone
- **A5**: Plants zone
- **A6**: (spare)
- **A7**: (spare)
- **Button A**: Trigger nearest species ping
- **Button B**: (spare - could reset/home)
- **Accelerometer**: Tilt Y-axis for depth
- **Light sensor**: Ambient light → master volume
- **NeoPixels**: Show nearest species color

### Power
- USB powered (serial + power)
- Optional: Battery pack for portable installations

---

## Installation Flow

### Desktop/Kiosk Mode
1. CPX connected via USB to computer
2. p5 sketch runs fullscreen in browser
3. Tilt CPX forward/back to dive deeper/shallower
4. Touch pads to focus on specific zones
5. Press Button A to ping nearest species

### Projection Installation
1. CPX mounted on handheld controller or podium
2. p5 projected on wall/floor
3. Visitors interact with physical controller
4. NeoPixels provide haptic feedback (species colors)

---

## Testing Checklist

- [ ] Serial communication CPX ↔ p5 working
- [ ] Depth control (tilt) updates topology in real-time
- [ ] Touch pads trigger zone audio changes
- [ ] Light sensor adjusts master volume smoothly
- [ ] Species tooltips display on hover (mouse) or nearest (CPX)
- [ ] Diamond pings play correct depth-transposed notes
- [ ] NeoPixels show correct species colors
- [ ] Performance: 60fps on target hardware
- [ ] Fullscreen mode works without UI chrome
- [ ] Graceful degradation if CPX disconnected (fallback to mouse)

---

## Future Enhancements

- **Multi-touch**: Mobile/tablet version with touch gestures
- **MIDI**: Alternative to CPX using MIDI controller
- **OSC**: Network control for multi-screen installations
- **Data logging**: Record visitor interaction patterns
- **Species audio**: Real recordings of orca calls, herring, etc.
- **Seasonal variations**: Different species populations by season

---

## Resources

- **p5.js**: https://p5js.org
- **p5.serialport**: https://github.com/p5-serial/p5.serialport
- **Circuit Playground Express**: https://learn.adafruit.com/adafruit-circuit-playground-express
- **Tone.js**: https://tonejs.github.io
- **Marching Squares**: https://en.wikipedia.org/wiki/Marching_squares
- **Puget Sound species data**: NOAA Fisheries, WA Dept. Fish & Wildlife

---

## Contact & Support

For questions about the original React version, see `/Users/katarina/puget-sound/`

**Original features to preserve:**
- Poetic entry screen text (Salish Sea passage)
- "of the Salish Sea" subtitle
- Glass-morphic UI design language
- Species data accuracy and scientific names
- Depth-mapped audio (shallow +1 octave, deep -1 octave)

**Good luck with the installation! 🌊🐋**
