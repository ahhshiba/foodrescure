// Asset-free synthesized SFX via the Web Audio API.

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

/** Descending electronic blip for the Lidar ping. */
export function playPing(): void {
  const ac = context();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(0.18, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.36);
}

/** Rising chord for a successful unlock. */
export function playUnlock(): void {
  const ac = context();
  if (!ac) return;
  [330, 494, 660].forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, ac.currentTime + i * 0.05);
    gain.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + i * 0.05);
    osc.stop(ac.currentTime + 0.62);
  });
}
