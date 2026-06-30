import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Minus, Music } from 'lucide-react';

interface DrumBeatsProps {
  audioContext: AudioContext | null;
}

export const DrumBeats: React.FC<DrumBeatsProps> = ({ audioContext }) => {
  const [bpm, setBpm] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number>(-1); // 0, 1, 2, 3
  const [beatPattern, setBeatPattern] = useState<'metronome' | 'rock' | 'dance'>('metronome');

  const timerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle play toggle
  const togglePlay = () => {
    if (!audioContext) return;
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    if (isPlaying) {
      stopScheduler();
    } else {
      startScheduler();
    }
  };

  const startScheduler = () => {
    if (!audioContext) return;
    setIsPlaying(true);
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime + 0.05;

    // Run scheduling ticks every 25ms
    timerRef.current = window.setInterval(() => {
      scheduler();
    }, 25);
  };

  const stopScheduler = () => {
    setIsPlaying(false);
    setActiveBeat(-1);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduler = () => {
    if (!audioContext) return;
    
    // Schedule beat events slightly ahead of time to prevent audio glitches
    while (nextNoteTimeRef.current < audioContext.currentTime + 0.1) {
      const time = nextNoteTimeRef.current;
      const beat = currentBeatRef.current;

      scheduleAudioBeat(beat, time);
      
      // Update visual indicator in sync with the audio
      const delay = (time - audioContext.currentTime) * 1000;
      setTimeout(() => {
        if (isPlaying) {
          setActiveBeat(beat);
        }
      }, Math.max(0, delay));

      // Calculate next note time based on BPM (quarter notes)
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
      currentBeatRef.current = (beat + 1) % 4;
    }
  };

  // Synthesis helpers for drum sounds
  const playKick = (time: number) => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Pitch envelope: drops rapidly from 150Hz to 40Hz
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    
    // Volume envelope: decays exponentially
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    osc.start(time);
    osc.stop(time + 0.22);
  };

  const playSnare = (time: number) => {
    if (!audioContext) return;
    
    // Create snare noise buffer
    const bufferSize = audioContext.sampleRate * 0.15; // 0.15 seconds
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Highpass filter for snare crispness
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    
    const gain = audioContext.createGain();
    
    // Noise routing
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    // Snare tone (short body oscillator at 180Hz)
    const toneOsc = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.connect(toneGain);
    toneGain.connect(audioContext.destination);
    
    // Envelopes
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    toneGain.gain.setValueAtTime(0.4, time);
    toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.15);
    
    toneOsc.start(time);
    toneOsc.stop(time + 0.1);
  };

  const playHiHat = (time: number) => {
    if (!audioContext) return;
    
    const bufferSize = audioContext.sampleRate * 0.04; // Very short
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.setValueAtTime(10, time);
    
    const gain = audioContext.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.035);
    
    noise.start(time);
    noise.stop(time + 0.04);
  };

  const playTick = (time: number, isDownbeat: boolean) => {
    if (!audioContext) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Metronome click: High pitch woodblock style
    osc.frequency.setValueAtTime(isDownbeat ? 1000 : 600, time);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.06);
  };

  const scheduleAudioBeat = (beat: number, time: number) => {
    if (beatPattern === 'metronome') {
      // Beat 0 is accent downbeat, others are ticks
      playTick(time, beat === 0);
    } else if (beatPattern === 'rock') {
      // Standard rock beat:
      // Beat 0: Kick + HiHat
      // Beat 1: HiHat
      // Beat 2: Snare + HiHat
      // Beat 3: HiHat
      if (beat === 0) {
        playKick(time);
        playHiHat(time);
      } else if (beat === 1) {
        playHiHat(time);
      } else if (beat === 2) {
        playSnare(time);
        playHiHat(time);
      } else if (beat === 3) {
        playHiHat(time);
      }
    } else if (beatPattern === 'dance') {
      // Four-on-the-floor dance beat:
      // Kick on every beat
      // Snare on beat 2
      // Off-beat HiHat (we can schedule hat slightly shifted or simplified)
      playKick(time);
      playHiHat(time);
      if (beat === 2) {
        playSnare(time);
      }
    }
  };

  const adjustBpm = (amount: number) => {
    setBpm((prev) => Math.max(40, Math.min(240, prev + amount)));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2">
          <Music className="w-5 h-5 text-indigo-400" /> Rhythm & Practice Loop
        </h3>
        
        {/* Pattern Selectors */}
        <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-850">
          {(['metronome', 'rock', 'dance'] as const).map((pattern) => (
            <button
              key={pattern}
              onClick={() => setBeatPattern(pattern)}
              className={`text-[10px] px-2.5 py-1 rounded-lg border border-transparent font-mono transition cursor-pointer capitalize ${
                beatPattern === pattern
                  ? 'bg-zinc-800 text-indigo-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {pattern}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
          <button
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)] text-white'
            }`}
            id="rhythm-play-btn"
            title={isPlaying ? 'Stop metronome' : 'Start metronome'}
          >
            {isPlaying ? <Square className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>

          {/* BPM display & modifiers */}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-zinc-500">Practice Speed</span>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => adjustBpm(-5)}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                id="bpm-decrease"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-display font-bold text-2xl text-zinc-100 w-14 text-center font-mono select-none">
                {bpm}
              </span>
              <button
                onClick={() => adjustBpm(5)}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                id="bpm-increase"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-zinc-500">BPM</span>
            </div>
          </div>
        </div>

        {/* Beats Slider and Visual Indicator */}
        <div className="flex-1 w-full flex flex-col gap-3">
          {/* Slider */}
          <input
            type="range"
            min="40"
            max="220"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />

          {/* Beat visual display dots */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((beatIdx) => (
              <div
                key={beatIdx}
                className={`h-4 rounded-xl border transition-all duration-100 flex items-center justify-center font-mono text-[9px] ${
                  activeBeat === beatIdx
                    ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] text-white scale-102 font-bold'
                    : isPlaying
                      ? 'bg-zinc-950 border-zinc-850 text-zinc-700'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-800'
                }`}
              >
                {beatIdx === 0 ? 'Down' : beatIdx + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
