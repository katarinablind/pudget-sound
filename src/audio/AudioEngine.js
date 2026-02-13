export default class AudioEngine {
  constructor() {
    this.started = false;
    this.Tone = null;
    this.drone = null;
    this.subDrone = null;
    this.filter = null;
    this.reverb = null;
    this.chorus = null;
    this.zoneLayers = {};   // { [speciesId]: { synth, gain, category } }
    this.lastPingTime = {};  // { [speciesId]: timestamp } — 3s cooldown
    this.pingSynths = {};    // { [category]: Synth }
  }

  async start() {
    if (this.started) return;
    const Tone = await import('tone');
    await Tone.start();
    this.Tone = Tone;
    this.started = true;

    // Master chain: filter → chorus → reverb → limiter → destination
    this.limiter = new Tone.Limiter(-3).toDestination(); // Prevent clipping
    this.reverb = new Tone.Reverb({ decay: 12, wet: 0.6 }).connect(this.limiter);
    this.chorus = new Tone.Chorus({ frequency: 0.3, delayTime: 3.5, depth: 0.7, wet: 0.4 });
    this.chorus.start();
    this.filter = new Tone.Filter({ frequency: 400, type: 'lowpass', rolloff: -24 });
    this.filter.connect(this.chorus);
    this.chorus.connect(this.reverb);

    // Drone — held pad (much quieter to let zone sounds shine)
    this.drone = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 3, decay: 2, sustain: 0.8, release: 6 },
      volume: -32 // Much quieter (was -23)
    });

    // Add AutoFilter for organic movement
    const droneFilter = new Tone.AutoFilter({
      frequency: 0.08, // very slow
      baseFrequency: 200,
      octaves: 2,
      wet: 0.4
    }).start();
    this.drone.connect(droneFilter);
    droneFilter.connect(this.filter);

    this.subDrone = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 4, decay: 3, sustain: 1, release: 8 },
      volume: -28 // Quieter (was -20)
    });
    this.subDrone.connect(this.filter);

    // NEW — open fifth + second, no minor third = ambiguous, not dark
    this.drone.triggerAttack(['D1', 'A1', 'E2', 'B2']);
    this.subDrone.triggerAttack('A0'); // root shift to A — warmer, less ominous

    // Zone layer bus — separate reverb for zone tones
    this.zoneBus = new Tone.Gain(1).connect(this.reverb);

    // Ping synths — one per category, quieter now
    this.pingSynths = {
      mammal: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.6, sustain: 0.0, release: 2.0 },
        volume: -24 // Much quieter (was -10)
      }).connect(this.reverb),

      cephalopod: new Tone.Synth({
        oscillator: { type: 'fmsine', modulationIndex: 8 },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.0, release: 1.5 },
        volume: -26 // Much quieter (was -12)
      }).connect(this.reverb),

      plant: new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.0, release: 1.2 },
        volume: -22 // Much quieter (was -8)
      }).connect(this.reverb),

      crustacean: new Tone.Synth({
        oscillator: { type: 'square', partialCount: 3 },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.0, release: 1.0 },
        volume: -28 // Much quieter (was -14)
      }).connect(this.reverb),

      fish: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.8, sustain: 0.0, release: 2.5 },
        volume: -25 // Much quieter (was -11)
      }).connect(this.reverb),
    };
  }

  // Zone layer definitions per category
  _zoneConfig(category) {
    const configs = {
      mammal: {
        oscillator: { type: 'sine' },
        envelope: { attack: 2.0, decay: 1, sustain: 1, release: 3 },
        note: 'C2',  // Lower, warm tone - depth mapped
        maxVol: -12, // Reduced from -2 to prevent distortion
      },
      cephalopod: {
        oscillator: { type: 'fmsine', modulationIndex: 8 }, // More modulation
        envelope: { attack: 1.5, decay: 1, sustain: 1, release: 2.5 },
        note: 'G#3', // Eerie dissonant tone - depth mapped
        maxVol: -14, // Reduced from -3 to prevent distortion
      },
      plant: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 3.0, decay: 1.5, sustain: 1, release: 4 }, // Slower attack
        note: 'E5',  // High, airy - depth mapped
        maxVol: -10, // Reduced from 0 to prevent distortion
      },
      crustacean: {
        oscillator: { type: 'square', partialCount: 5 }, // More harmonics
        envelope: { attack: 1.8, decay: 1, sustain: 1, release: 2 },
        note: 'D3',  // Mid-range, buzzy - depth mapped
        maxVol: -16, // Reduced from -5 to prevent distortion
      },
      fish: {
        oscillator: { type: 'sawtooth' }, // Richer tone
        envelope: { attack: 2.5, decay: 1.2, sustain: 0.9, release: 3.5 },
        note: 'A3',  // Brighter mid-range - depth mapped
        maxVol: -14, // Reduced from -3 to prevent distortion
      },
    };
    return configs[category] || configs.mammal;
  }

  _createZoneLayer(species) {
    const Tone = this.Tone;
    const config = this._zoneConfig(species.category);

    // Map species depth to octave offset
    // depth 0.0–0.3 (shallow: eelgrass, kelp) → +1 octave (brighter)
    // depth 0.3–0.7 (mid: salmon, crab, seal) → 0 octave (base register)
    // depth 0.7–1.0 (deep: orca, octopus) → -1 octave (darker)
    const octaveOffset = species.depth < 0.3 ? 1 : species.depth > 0.7 ? -1 : 0;

    // Parse the note letter and number, add octaveOffset to the number
    const transposeNote = (note, offset) => {
      const letter = note.replace(/[0-9]/g, '');
      const octave = parseInt(note.replace(/[^0-9]/g, '')) + offset;
      return `${letter}${Math.max(0, Math.min(8, octave))}`;
    };

    const transposedNote = transposeNote(config.note, octaveOffset);

    // Volume by depth — shallow species get slightly higher volume
    const depthVolumeOffset = (1 - species.depth) * 4; // +4dB at surface, 0 at depth
    const adjustedVolume = config.maxVol + depthVolumeOffset;

    // Create gain node (starts at 0) and connect to master filter chain
    const gain = new Tone.Gain(0);
    gain.connect(this.filter); // synth → gain → filter → chorus → reverb → destination

    const synth = new Tone.Synth({
      oscillator: config.oscillator,
      envelope: config.envelope,
      volume: adjustedVolume,
    });
    synth.connect(gain);
    synth.triggerAttack(transposedNote);

    return { synth, gain, category: species.category, maxVol: adjustedVolume, octaveOffset };
  }

  /**
   * Called every frame with proximity map:
   * { [speciesId]: { species, proximity (0-1) } }
   * Fades zone layers in/out based on proximity.
   */
  updateZones(proximityMap) {
    if (!this.started) return;

    // Create layers for new species in range
    for (const [id, { species, proximity }] of Object.entries(proximityMap)) {
      if (!this.zoneLayers[id] && proximity > 0) {
        this.zoneLayers[id] = this._createZoneLayer(species);
      }
    }

    // Count species per category to prevent stacking distortion
    const categoryProximities = {};
    for (const [id, { species, proximity }] of Object.entries(proximityMap)) {
      const cat = species.category;
      if (!categoryProximities[cat]) {
        categoryProximities[cat] = { total: 0, count: 0, max: 0 };
      }
      categoryProximities[cat].total += proximity;
      categoryProximities[cat].count += 1;
      categoryProximities[cat].max = Math.max(categoryProximities[cat].max, proximity);
    }

    // Update gain for all active layers
    for (const [id, layer] of Object.entries(this.zoneLayers)) {
      const entry = proximityMap[id];

      if (entry) {
        const cat = layer.category;
        const catData = categoryProximities[cat];

        // Use a blend of max proximity and average to prevent harsh stacking
        // When multiple species are near, use max but reduce overall gain
        const stackingFactor = Math.min(1, 1.5 / catData.count); // Reduces as more species stack
        const blendedProximity = catData.max * stackingFactor;

        // Apply smoothed gain curve to make it less aggressive
        const smoothGain = Math.pow(blendedProximity, 1.5); // Softer curve

        // Smooth ramp to target gain
        try {
          layer.gain.gain.linearRampTo(smoothGain, 0.2);
        } catch (_) {
          // Safety: if node is disposed
        }
      } else {
        // Cleanup layers that have been silent for a while
        try {
          layer.gain.gain.linearRampTo(0, 0.5);
        } catch (_) {}

        // Don't dispose immediately — let release tail finish
        setTimeout(() => {
          if (this.zoneLayers[id] === layer) {
            try {
              layer.synth.triggerRelease();
              setTimeout(() => {
                try {
                  layer.synth.dispose();
                  layer.gain.dispose();
                } catch (_) {}
              }, 4000);
            } catch (_) {}
            delete this.zoneLayers[id];
          }
        }, 1000);
      }
    }
  }

  /**
   * Diamond ping — only fires when cursor is within 18px of diamond center.
   * 3-second cooldown per species.
   */
  triggerDiamondPing(species) {
    if (!this.started) return;
    const now = Date.now();
    if (this.lastPingTime[species.id] && now - this.lastPingTime[species.id] < 3000) return;
    this.lastPingTime[species.id] = now;

    const synth = this.pingSynths[species.category];
    if (!synth) return;

    const pitchMap = {
      mammal:     ['D3', 'A3', 'D4', 'F4', 'A4'],
      cephalopod: ['A4', 'C5', 'E5', 'G5', 'A5'],
      plant:      ['D5', 'F5', 'A5', 'C6', 'D6'],
      crustacean: ['G3', 'B3', 'D4', 'F4'],
      fish:       ['E3', 'G3', 'B3', 'D4', 'E4'],
    };
    const pitches = pitchMap[species.category] || ['A4'];
    const pitch = pitches[Math.floor(Math.random() * pitches.length)];
    synth.triggerAttackRelease(pitch, '8n');
  }

  modulateFilter(depth) {
    if (!this.filter) return;
    const freq = 80 + (1 - depth) * 2400;
    this.filter.frequency.linearRampTo(freq, 0.3);
  }

  dispose() {
    // Release drone
    try { this.drone?.releaseAll(); } catch (_) {}
    try { this.subDrone?.triggerRelease(); } catch (_) {}

    // Dispose zone layers
    for (const [id, layer] of Object.entries(this.zoneLayers)) {
      try { layer.synth.triggerRelease(); } catch (_) {}
      try { layer.synth.dispose(); } catch (_) {}
      try { layer.gain.dispose(); } catch (_) {}
    }
    this.zoneLayers = {};

    // Dispose ping synths
    for (const synth of Object.values(this.pingSynths)) {
      try { synth.dispose(); } catch (_) {}
    }
  }
}
