export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'unison' | 'nylon' | 'sax' | 'strings' | 'violin' | 'piano' | 'bass';

export type HarmonizerMode = 'off' | 'octave-up' | 'octave-down' | 'fifth' | 'fourth' | 'power' | 'major-triad' | 'minor-triad';

export interface SynthSettings {
  oscType: OscillatorType;
  cutoff: number;
  Q: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  volume: number;
  glide: number;
  // Latency & performance optimization setting
  latencyLevel?: 'ultra-low' | 'low' | 'balanced' | 'high';
  // Audio Polyphony / String Ringout
  audioPolyphonyEnabled?: boolean;
  audioPolyphonyDecay?: number; // 0.5 to 3.0s ringout duration
  // Pitch Shifter / Transposition
  pitchShift?: number; // coarse tune in semitones (-24 to +24)
  fineTune?: number; // fine tune in cents (-100 to +100)
  // Harmonizer
  harmonizerMode?: HarmonizerMode;
  // Pinch Harmonics
  pinchHarmonicsEnabled?: boolean;
  pinchHarmonicsLevel?: number; // 0 to 1
  // Delay / Space Echo Effect
  delayEnabled?: boolean;
  delayTime?: number; // 0.1 to 1.0s
  delayFeedback?: number; // 0 to 0.95
  delayWet?: number; // 0 to 0.8
  // Noise Gate Threshold
  noiseGate?: number; // -45 to -20 dB
  // Feedback protection and noise suppression
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
}

export interface PitchData {
  frequency: number;
  noteName: string;
  midiNote: number;
  centsDeviation: number;
  clarity: number; // 0 to 1, representing confidence of autocorrelation
  db: number; // amplitude in dB
}

export interface MidiLogMessage {
  id: string;
  timestamp: string;
  type: 'Note On' | 'Note Off' | 'Pitch Bend';
  note: number;
  noteName: string;
  velocity: number;
  extra?: string;
}

export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
}

export interface ActiveNote {
  note: number;
  frequency: number;
  startTime: number;
  source: 'audio' | 'keyboard' | 'fretboard';
}
