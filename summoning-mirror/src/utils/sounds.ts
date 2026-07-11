type SoundProfile = {
  frequency: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  sweep?: number;
  harmonics?: number[];
};

const FANDOM_SOUNDS: Record<string, SoundProfile> = {
  'harry-potter': { frequency: 523, type: 'sine', duration: 0.6, gain: 0.12, sweep: 659, harmonics: [784] },
  'fantastic-beasts': { frequency: 440, type: 'sine', duration: 0.5, gain: 0.1, sweep: 587 },
  'marvel': { frequency: 330, type: 'square', duration: 0.4, gain: 0.08, sweep: 440 },
  'star-wars': { frequency: 392, type: 'sawtooth', duration: 0.7, gain: 0.06, sweep: 523 },
  'dc-comics': { frequency: 294, type: 'square', duration: 0.5, gain: 0.08, sweep: 392 },
  'lord-of-the-rings': { frequency: 349, type: 'sine', duration: 0.8, gain: 0.1, sweep: 466 },
  'game-of-thrones': { frequency: 262, type: 'sawtooth', duration: 0.6, gain: 0.06, sweep: 349 },
  'disney': { frequency: 523, type: 'sine', duration: 0.5, gain: 0.12, sweep: 784 },
  'pokemon': { frequency: 587, type: 'square', duration: 0.3, gain: 0.08, sweep: 784 },
  'naruto': { frequency: 440, type: 'triangle', duration: 0.5, gain: 0.1, sweep: 587 },
  'dragon-ball': { frequency: 392, type: 'sawtooth', duration: 0.4, gain: 0.08, sweep: 523 },
  'studio-ghibli': { frequency: 523, type: 'sine', duration: 0.7, gain: 0.1, sweep: 659, harmonics: [880] },
};

const DEFAULT_SOUND: SoundProfile = { frequency: 440, type: 'sine', duration: 0.4, gain: 0.1, sweep: 554 };

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playFandomSound(fandomId: string): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const profile = FANDOM_SOUNDS[fandomId] || DEFAULT_SOUND;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.frequency, now);
    if (profile.sweep) {
      osc.frequency.exponentialRampToValueAtTime(profile.sweep, now + profile.duration * 0.6);
    }

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(profile.gain, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (profile.harmonics) {
      for (const freq of profile.harmonics) {
        const h = ctx.createOscillator();
        const hGain = ctx.createGain();
        h.type = 'sine';
        h.frequency.setValueAtTime(freq, now);
        hGain.gain.setValueAtTime(0, now);
        hGain.gain.linearRampToValueAtTime(profile.gain * 0.3, now + 0.1);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);
        h.connect(hGain);
        hGain.connect(ctx.destination);
        h.start(now + 0.05);
        h.stop(now + profile.duration);
      }
    }

    osc.start(now);
    osc.stop(now + profile.duration);
  } catch {
    // Audio not available
  }
}

export function playRevealSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch {
    // Audio not available
  }
}

export function playCountdownBeep(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Audio not available
  }
}

export function playShutterSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Audio not available
  }
}
