export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface SynthSettings {
  preset: string;
  waveType: WaveType;
  attack: number;  // seconds
  decay: number;   // seconds
  sustain: number; // 0 to 1
  release: number; // seconds
  filterCutoff: number; // Hz
  filterResonance: number; // Q factor
  distortion: number; // 0 to 1
  delayTime: number; // seconds
  delayFeedback: number; // 0 to 1
  reverbWet: number; // 0 to 1
  volume: number; // 0 to 1
  polyphonic: boolean;
  octaveOffset: number; // -2 to 2
}

export interface MidiMessageLog {
  id: string;
  type: 'Note On' | 'Note Off' | 'Pitch Bend';
  channel: number;
  note?: number;
  noteName?: string;
  value: number; // velocity for Note On, bend amount for Pitch Bend
  timestamp: string;
}

export interface PitchData {
  frequency: number;
  noteName: string;
  midiNote: number;
  centsOffset: number;
  confidence: number;
  amplitude: number;
}

export interface FretboardPosition {
  stringIndex: number; // 0 = high E, 5 = low E
  fret: number;
}

export interface Tuning {
  name: string;
  notes: string[]; // e.g. ["E4", "B3", "G3", "D3", "A2", "E2"]
  midiNumbers: number[]; // e.g. [64, 59, 55, 50, 45, 40]
}

export interface InstrumentPreset {
  id: string;
  name: string;
  settings: Partial<SynthSettings>;
}

export interface MidiOutput {
  id: string;
  name?: string;
  send: (data: number[] | Uint8Array) => void;
}

