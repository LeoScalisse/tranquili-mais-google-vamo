// services/soundService.ts

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;


const initAudio = () => {
  // Prevent running in non-browser environments or if already initialized
  if (typeof window === 'undefined' || audioContext) return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);

    setMasterVolume(0.5); // Default volume, will be overwritten by app settings
  } catch (e) {
    console.error("Web Audio API is not supported in this browser.", e);
  }
};

// The browser may suspend the audio context after a period of inactivity
const resumeAudioContext = () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(e => console.error("Could not resume audio context", e));
    }
}

export const setMasterVolume = (volume: number) => {
    if (!masterGain || !audioContext) {
        initAudio();
    }
    if (masterGain && audioContext) {
        // Use a ramp for smooth volume transitions and to prevent clicks
        masterGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    }
};

export type SoundType = 
  // General UI sounds
  'navigation' | 'select' | 'confirm' | 'toggle' | 'send' | 'receive' | 'error' |
  // Game-specific sounds
  'flip' | 'match' | 'win' | 'click' | 'chime' | 'victory';

export const playSound = (type: SoundType) => {
    initAudio(); // Ensure context is ready
    resumeAudioContext(); // Resume if suspended
  
    const ctx = audioContext;
    if (!ctx || !masterGain) return;

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);

        switch (type) {
            case 'navigation': // Subtle tick
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);
                gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
                break;
            case 'toggle': // Soft, quick chirp
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.linearRampToValueAtTime(1000, now + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
                break;
            case 'select': // Quicker, pleasant tone
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                break;
            case 'send': // More pronounced upward sweep
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.linearRampToValueAtTime(1200, now + 0.1);
                gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
                break;
            case 'receive': // Short descending "plink"
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1200, now);
                oscillator.frequency.linearRampToValueAtTime(900, now + 0.1);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                break;
            case 'error': // Low, short buzz
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(120, now);
                oscillator.frequency.linearRampToValueAtTime(100, now + 0.15);
                gainNode.gain.linearRampToValueAtTime(0.12, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                break;
            case 'confirm': // Brighter, quick arpeggio
                oscillator.type = 'triangle';
                gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.setValueAtTime(659.25, now + 0.08); // E5
                oscillator.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
                break;
            case 'flip': // "Plink" sound
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.linearRampToValueAtTime(600, now + 0.1);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
                break;
            case 'click': // Sharp, high-pitched click
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(1500, now);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.03);
                break;
            case 'match': // Brighter, quick C-E-G arpeggio
                oscillator.type = 'triangle';
                gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
                oscillator.frequency.setValueAtTime(523.25, now); // C5
                oscillator.frequency.setValueAtTime(659.25, now + 0.05); // E5
                oscillator.frequency.setValueAtTime(783.99, now + 0.1); // G5
                gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
                break;
            case 'win': // Faster, brighter arpeggio
                oscillator.type = 'triangle';
                const fundamental = 392; // G4
                gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
                oscillator.frequency.setValueAtTime(fundamental, now + 0.0);
                oscillator.frequency.setValueAtTime(fundamental * 5/4, now + 0.07);
                oscillator.frequency.setValueAtTime(fundamental * 3/2, now + 0.14);
                oscillator.frequency.setValueAtTime(fundamental * 2, now + 0.21);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
                break;
            case 'chime':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, now); // A high, pleasant pitch (A5)
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05); // Quick attack
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5); // Slow decay
                break;
            case 'victory': // More impactful win sound
                oscillator.type = 'sine';
                const baseFreq = 261.63; // C4
                gainNode.gain.linearRampToValueAtTime(0.18, now + 0.01);
                // C4 -> G4 -> C5 -> E5 -> G5 -> C6
                oscillator.frequency.setValueAtTime(baseFreq, now);
                oscillator.frequency.setValueAtTime(baseFreq * 1.5, now + 0.1);
                oscillator.frequency.setValueAtTime(baseFreq * 2, now + 0.2);
                oscillator.frequency.setValueAtTime(baseFreq * 2.5, now + 0.3);
                oscillator.frequency.setValueAtTime(baseFreq * 3, now + 0.4);
                oscillator.frequency.setValueAtTime(baseFreq * 4, now + 0.5);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
                break;
        }

        oscillator.start(now);
        oscillator.stop(now + 1.6); 
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const colorFrequencies: Record<string, number> = {
  '#FFADAD': 261.63, '#FFD6A5': 293.66, '#FDFFB6': 329.63, '#CAFFBF': 392.00,
  '#9BF6FF': 440.00, '#A0C4FF': 523.25, '#BDB2FF': 587.33, '#FFC6FF': 659.25,
  '#EAEAEA': 783.99, '#FFFFFF': 880.00,
};

export const playColorSound = (color: string) => {
    const frequency = colorFrequencies[color];
    if (!frequency) return;
    
    initAudio();
    resumeAudioContext();
    const ctx = audioContext;
    if (!ctx || !masterGain) return;

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
    } catch(e) {
        console.error("Could not play color sound", e);
    }
};

// Initialize on module load
initAudio();