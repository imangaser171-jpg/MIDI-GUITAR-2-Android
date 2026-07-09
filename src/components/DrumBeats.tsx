import { useEffect, useRef, useState } from 'react';
import { Play, Square, Music, Activity } from 'lucide-react';

interface DrumBeatsProps {
  onPlayStatusChange?: (isPlaying: boolean) => void;
}

const STEPS = 8;

// Define pre-programmed drum loops (Rows: Kick, Snare, Hihat; Cols: 8 steps)
const PATTERNS: Record<string, { kick: boolean[]; snare: boolean[]; hihat: boolean[] }> = {
  'Rock/Pop': {
    kick:  [true,  false, false, false, true,  false, false, false],
    snare: [false, false, true,  false, false, false, true,  false],
    hihat: [true,  true,  true,  true,  true,  true,  true,  true],
  },
  'Funk': {
    kick:  [true,  false, false, true,  false, false, true,  false],
    snare: [false, false, true,  false, false, true,  true,  false],
    hihat: [true,  true,  true,  true,  true,  true,  true,  true],
  },
  'Metronome': {
    kick:  [true,  false, true,  false, true,  false, true,  false],
    snare: [false, false, false, false, false, false, false, false],
    hihat: [true,  true,  true,  true,  true,  true,  true,  true],
  },
  'Practice Click': {
    kick:  [true,  false, false, false, false, false, false, false],
    snare: [false, false, false, false, false, false, false, false],
    hihat: [true,  false, true,  false, true,  false, true,  false],
  }
};

export function DrumBeats({ onPlayStatusChange }: DrumBeatsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(110);
  const [activePattern, setActivePattern] = useState('Rock/Pop');
  const [currentStep, setCurrentStep] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const stepRef = useRef<number>(0);

  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const activePatternRef = useRef(activePattern);
  useEffect(() => {
    activePatternRef.current = activePattern;
  }, [activePattern]);

  // Audio synthesis helper for synthesized drum sounds
  const playKick = (ctx: AudioContext, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.start(time);
    osc.stop(time + 0.15);
  };

  const playHiHat = (ctx: AudioContext, time: number) => {
    // White noise generator
    const bufferSize = ctx.sampleRate * 0.04; // 40ms of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start(time);
    noiseNode.stop(time + 0.04);
  };

  const playSnare = (ctx: AudioContext, time: number) => {
    // Combination of white noise (filtered) and triangle thump
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Body of the snare
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noiseNode.start(time);
    noiseNode.stop(time + 0.12);

    osc.start(time);
    osc.stop(time + 0.08);
  };

  // Clock Scheduler Loop
  const scheduleNextNote = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Beats per minute converted to steps per second (Assuming eighth notes)
    const secondsPerStep = 60 / bpmRef.current / 2;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const playTime = nextNoteTimeRef.current;
      const stepIndex = stepRef.current;

      const pattern = PATTERNS[activePatternRef.current] || PATTERNS['Rock/Pop'];

      // Play hits if programmed
      if (pattern.kick[stepIndex]) playKick(ctx, playTime);
      if (pattern.snare[stepIndex]) playSnare(ctx, playTime);
      if (pattern.hihat[stepIndex]) playHiHat(ctx, playTime);

      // Advance step state visually using callback
      const targetStep = stepIndex;
      setTimeout(() => {
        setCurrentStep(targetStep);
      }, (playTime - ctx.currentTime) * 1000);

      // Advance scheduler states
      nextNoteTimeRef.current += secondsPerStep;
      stepRef.current = (stepRef.current + 1) % STEPS;
    }

    // Call scheduler again in 25ms
    schedulerTimerRef.current = window.setTimeout(scheduleNextNote, 25);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      // Stop
      if (schedulerTimerRef.current) {
        clearTimeout(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
      setIsPlaying(false);
      onPlayStatusChange?.(false);
    } else {
      // Initialize Audio context safely
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      setIsPlaying(true);
      onPlayStatusChange?.(true);

      // Start clock scheduler
      nextNoteTimeRef.current = ctx.currentTime + 0.05;
      stepRef.current = 0;
      setCurrentStep(0);
      scheduleNextNote();
    }
  };

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) {
        clearTimeout(schedulerTimerRef.current);
      }
    };
  }, []);

  return (
    <div id="drum-beats-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-full">
      <div>
        <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2 mb-4">
          <Music className="w-4 h-4 text-rose-400" />
          Rhythm Companion & Loop Practice
        </h2>

        {/* Style selection */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
            Rhythm Preset Style
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(PATTERNS).map((style) => (
              <button
                id={`drum-style-${style.replace(/\s+/g, '-').toLowerCase()}`}
                key={style}
                onClick={() => setActivePattern(style)}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition ${
                  activePattern === style
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                    : 'bg-neutral-950 border-neutral-850 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* BPM selection */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-neutral-400">Tempo / Speed</span>
            <span className="font-mono text-rose-400 font-bold">{bpm} BPM</span>
          </div>
          <input
            id="drum-bpm-slider"
            type="range"
            min="60"
            max="180"
            step="1"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full accent-rose-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Sequencer step visual lights */}
        <div className="mb-4 bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-neutral-500">BEAT GRID</span>
            <span className="text-[9px] font-mono text-rose-500/60 flex items-center gap-1">
              <Activity className="w-3 h-3 animate-pulse" />
              1/8 SEQ
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: STEPS }).map((_, stepIdx) => {
              const isActiveStep = currentStep === stepIdx && isPlaying;
              const hasKick = PATTERNS[activePattern]?.kick[stepIdx];
              const hasSnare = PATTERNS[activePattern]?.snare[stepIdx];

              let borderLight = 'border-neutral-850 bg-neutral-900/40';
              if (hasKick) borderLight = 'border-neutral-700 bg-neutral-800/60';
              if (hasSnare) borderLight = 'border-rose-950 bg-rose-950/20';

              return (
                <div
                  id={`seq-step-${stepIdx}`}
                  key={stepIdx}
                  className={`h-6 rounded flex items-center justify-center transition-all border ${borderLight} ${
                    isActiveStep
                      ? 'bg-rose-500 border-rose-400 scale-105 shadow-[0_0_8px_#f43f5e]'
                      : ''
                  }`}
                >
                  <span className={`text-[9px] font-mono ${isActiveStep ? 'text-black font-bold' : 'text-neutral-600'}`}>
                    {stepIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <button
        id="toggle-drums-btn"
        onClick={handleTogglePlay}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition duration-150 shadow-md ${
          isPlaying
            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
            : 'bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-rose-400 hover:text-rose-300'
        }`}
      >
        {isPlaying ? (
          <>
            <Square className="w-4 h-4 fill-current" />
            Stop Rhythm Loop
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            Start Rhythm Companion
          </>
        )}
      </button>
    </div>
  );
}
