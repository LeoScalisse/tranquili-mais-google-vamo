
// services/soundService.ts

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (typeof window === 'undefined' || audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.setValueAtTime(0.5, audioContext.currentTime);
  } catch (e) {
    console.error("Web Audio API is not supported in this browser.", e);
  }
};

const resumeAudioContext = async () => {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
};

export const setMasterVolume = (volume: number) => {
    if (!masterGain || !audioContext) initAudio();
    if (masterGain && audioContext) {
        masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.05);
    }
};

export type SoundType = 
  | 'navigation' | 'select' | 'confirm' | 'toggle' | 'send' | 'receive' | 'error'
  | 'flip' | 'match' | 'win' | 'click' | 'chime' | 'victory';

export const playSound = async (type: SoundType) => {
    initAudio();
    await resumeAudioContext();
  
    const ctx = audioContext;
    if (!ctx || !masterGain) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    
    const now = ctx.currentTime;
    // Evita cliques começando em zero
    gainNode.gain.setValueAtTime(0, now);

    switch (type) {
        case 'navigation':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            break;
        case 'toggle':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            break;
        case 'select':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            break;
        case 'send':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            break;
        case 'receive':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(900, now);
            oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            break;
        case 'error':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.linearRampToValueAtTime(100, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            break;
        case 'confirm':
            oscillator.type = 'sine';
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            oscillator.frequency.setValueAtTime(523.25, now);
            oscillator.frequency.setValueAtTime(659.25, now + 0.08);
            oscillator.frequency.setValueAtTime(783.99, now + 0.16);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            break;
        case 'flip':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1200, now);
            oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.08);
            gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            break;
        case 'match':
            oscillator.type = 'sine';
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            oscillator.frequency.setValueAtTime(783.99, now);
            oscillator.frequency.setValueAtTime(1046.50, now + 0.08);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            break;
        case 'click':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1800, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            break;
        case 'win':
            oscillator.type = 'sine';
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            [440, 554.37, 659.25, 880].forEach((f, i) => {
                oscillator.frequency.setValueAtTime(f, now + i * 0.1);
            });
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            break;
        case 'victory':
            oscillator.type = 'sine';
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((f, i) => {
                oscillator.frequency.setValueAtTime(f, now + i * 0.1);
            });
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            break;
    }

    oscillator.start(now);
    oscillator.stop(now + 2.0);
};

initAudio();
