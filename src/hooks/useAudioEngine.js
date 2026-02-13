import { useRef, useCallback } from 'react';
import AudioEngine from '../audio/AudioEngine';

export function useAudioEngine() {
  const engineRef = useRef(null);

  const start = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    await engineRef.current.start();
  }, []);

  const modulateFilter = useCallback((depth) => {
    engineRef.current?.modulateFilter(depth);
  }, []);

  const updateZones = useCallback((proximityMap) => {
    engineRef.current?.updateZones(proximityMap);
  }, []);

  const triggerDiamondPing = useCallback((species) => {
    engineRef.current?.triggerDiamondPing(species);
  }, []);

  return { start, modulateFilter, updateZones, triggerDiamondPing };
}
