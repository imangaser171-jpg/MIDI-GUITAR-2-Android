// Pitch Detection Utilities

/**
 * Perform autocorrelation-based pitch detection on a buffer of audio samples.
 * Returns the estimated fundamental frequency in Hz, and a confidence score.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): { frequency: number; confidence: number } {
  const size = buffer.length;
  
  // Calculate root-mean-square (RMS) amplitude to detect silence/noise gate
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  
  // Silence threshold: If signal is too quiet, do not attempt pitch detection
  if (rms < 0.005) {
    return { frequency: -1, confidence: 0 };
  }

  // Clip buffer to ignore silent leading/trailing edges and highlight peaks (Center clipping)
  // This is a common pre-processing step for pitch detection
  const clippedBuffer = new Float32Array(size);
  let maxVal = 0;
  for (let i = 0; i < size; i++) {
    maxVal = Math.max(maxVal, Math.abs(buffer[i]));
  }
  const clipThreshold = maxVal * 0.15;
  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    if (Math.abs(val) > clipThreshold) {
      clippedBuffer[i] = val > 0 ? val - clipThreshold : val + clipThreshold;
    } else {
      clippedBuffer[i] = 0;
    }
  }

  // Define search bounds for guitar pitch (approx 50Hz to 1600Hz)
  const minFreq = 50;
  const maxFreq = 1600;
  const maxPeriod = Math.round(sampleRate / minFreq); // max delay
  const minPeriod = Math.round(sampleRate / maxFreq); // min delay
  
  const r = new Float32Array(maxPeriod + 1);
  
  // Compute autocorrelation for relevant delays
  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let sum = 0;
    for (let t = 0; t < size - tau; t++) {
      sum += clippedBuffer[t] * clippedBuffer[t + tau];
    }
    r[tau] = sum;
  }

  // Find the primary peak in the autocorrelation array
  let bestPeriod = -1;
  let maxR = -1;
  
  // A peak is a local maximum
  for (let tau = minPeriod + 1; tau < maxPeriod; tau++) {
    if (r[tau] > r[tau - 1] && r[tau] > r[tau + 1]) {
      if (bestPeriod === -1 || r[tau] > maxR) {
        bestPeriod = tau;
        maxR = r[tau];
      }
    }
  }

  if (bestPeriod === -1 || maxR <= 0) {
    return { frequency: -1, confidence: 0 };
  }

  // Calculate self-similarity score (confidence)
  let sumSquare0 = 0;
  let sumSquarePeriod = 0;
  for (let t = 0; t < size - bestPeriod; t++) {
    sumSquare0 += clippedBuffer[t] * clippedBuffer[t];
    sumSquarePeriod += clippedBuffer[t + bestPeriod] * clippedBuffer[t + bestPeriod];
  }
  const denominator = Math.sqrt(sumSquare0 * sumSquarePeriod);
  const confidence = denominator > 0 ? maxR / denominator : 0;

  // We require a minimum confidence to avoid spurious noise-matching
  if (confidence < 0.4) {
    return { frequency: -1, confidence };
  }

  // Parabolic interpolation for sub-sample accuracy
  let interpolatedPeriod = bestPeriod;
  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const alpha = r[bestPeriod - 1];
    const beta = r[bestPeriod];
    const gamma = r[bestPeriod + 1];
    
    const denom = alpha - 2 * beta + gamma;
    if (denom !== 0) {
      const delta = 0.5 * (alpha - gamma) / denom;
      interpolatedPeriod = bestPeriod + delta;
    }
  }

  const frequency = sampleRate / interpolatedPeriod;
  
  // Sanity check frequency
  if (frequency >= minFreq && frequency <= maxFreq) {
    return { frequency, confidence: Math.min(1, confidence) };
  }

  return { frequency: -1, confidence: 0 };
}

/**
 * Standard note names in an octave.
 */
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Convert frequency in Hz to MIDI note number and cents offset.
 */
export function frequencyToMidi(frequency: number): { midiNote: number; noteName: string; centsOffset: number } {
  // MIDI Note 69 is A4 (440Hz)
  const noteNum = 12 * Math.log2(frequency / 440) + 69;
  const midiNote = Math.round(noteNum);
  const centsOffset = Math.round((noteNum - midiNote) * 100);
  
  const octave = Math.floor(midiNote / 12) - 1;
  const noteNameIndex = (midiNote % 12 + 12) % 12;
  const noteName = `${NOTE_NAMES[noteNameIndex]}${octave}`;
  
  return { midiNote, noteName, centsOffset };
}

/**
 * Standard guitar string frequencies (Standard E-tuning)
 */
export const STANDARD_TUNING_FREQS = [
  { note: "E4", freq: 329.63, stringName: "1st (E)" },
  { note: "B3", freq: 246.94, stringName: "2nd (B)" },
  { note: "G3", freq: 196.00, stringName: "3rd (G)" },
  { note: "D3", freq: 146.83, stringName: "4th (D)" },
  { note: "A2", freq: 110.00, stringName: "5th (A)" },
  { note: "E2", freq: 82.41,  stringName: "6th (E)" },
];

/**
 * Map a MIDI Note number back to the closest guitar string and fret
 */
export function getFretboardPosition(midiNote: number, tuningMidi: number[]): { stringIndex: number; fret: number }[] {
  const positions: { stringIndex: number; fret: number }[] = [];
  
  // Check each string to see if the note can be played on it
  // standard tuningMidi: [64, 59, 55, 50, 45, 40]
  for (let stringIndex = 0; stringIndex < tuningMidi.length; stringIndex++) {
    const stringBaseMidi = tuningMidi[stringIndex];
    const fret = midiNote - stringBaseMidi;
    
    // Guitar fretboards usually have 21-24 frets. Let's assume open string (0) to 24 frets.
    if (fret >= 0 && fret <= 24) {
      positions.push({ stringIndex, fret });
    }
  }
  
  return positions;
}
