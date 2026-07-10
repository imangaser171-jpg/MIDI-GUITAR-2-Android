import { PitchData } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts frequency to MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

/**
 * Converts MIDI note to fundamental frequency in Hz
 */
export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Converts MIDI note to its musical name
 */
export function midiToNoteName(midiNote: number): string {
  const noteIndex = (midiNote % 12 + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * High-performance autocorrelation algorithm optimized for guitar frequency ranges.
 * Includes parabolic peak interpolation for sub-cent tuning dial precision.
 */
export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
  thresholdDb = -45, // noise gate
  minClarity = 0.85   // confidence threshold
): PitchData | null {
  // 1. Calculate signal power/root-mean-square (RMS)
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  const db = 20 * Math.log10(rms || 1e-5);

  // If signal is too quiet, it's silence/noise
  if (db < thresholdDb) {
    return null;
  }

  // 2. Downsample buffer by a factor of 4 to boost performance by ~16x
  const downsampleFactor = 4;
  const dsSampleRate = sampleRate / downsampleFactor; // e.g. 11025Hz
  const dsLength = Math.floor(buffer.length / downsampleFactor);
  
  if (dsLength < 32) {
    return null;
  }
  
  const dsBuffer = new Float32Array(dsLength);
  for (let i = 0; i < dsLength; i++) {
    // Simple 4-point moving average acts as an anti-aliasing lowpass filter
    const idx = i * downsampleFactor;
    dsBuffer[i] = (buffer[idx] + buffer[idx + 1] + buffer[idx + 2] + buffer[idx + 3]) / 4;
  }

  // 3. Perform center clipping to boost fundamental frequency peaks and suppress harmonics
  const clippedBuffer = new Float32Array(dsLength);
  let maxVal = 0;
  for (let i = 0; i < dsLength; i++) {
    maxVal = Math.max(maxVal, Math.abs(dsBuffer[i]));
  }
  const clipLevel = maxVal * 0.3; // 30% center clip
  for (let i = 0; i < dsLength; i++) {
    if (Math.abs(dsBuffer[i]) > clipLevel) {
      clippedBuffer[i] = dsBuffer[i] > 0 ? dsBuffer[i] - clipLevel : dsBuffer[i] + clipLevel;
    } else {
      clippedBuffer[i] = 0;
    }
  }

  // 4. Autocorrelation over the guitar frequency range (50Hz to 1600Hz)
  const maxPeriod = Math.floor(dsSampleRate / 50);    // ~220 samples at 11025Hz
  const minPeriod = Math.floor(dsSampleRate / 1600);  // ~6 samples at 11025Hz
  
  const r = new Float32Array(maxPeriod + 2);
  let bestPeriod = -1;

  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (tau >= dsLength) break;
    let sum = 0;
    for (let i = 0; i < dsLength - tau; i++) {
      sum += clippedBuffer[i] * clippedBuffer[i + tau];
    }
    r[tau] = sum;
  }

  // 5. Find the absolute peak in the search range
  let peakThreshold = 0;
  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (tau >= dsLength) break;
    peakThreshold = Math.max(peakThreshold, r[tau]);
  }
  
  // Peak must be at least 35% of absolute max correlation
  const cutoff = peakThreshold * 0.35;

  for (let tau = minPeriod; tau < maxPeriod - 1; tau++) {
    if (tau >= dsLength - 1) break;
    // Is local maximum?
    if (r[tau] > r[tau - 1] && r[tau] > r[tau + 1] && r[tau] > cutoff) {
      if (bestPeriod === -1 || r[tau] > r[bestPeriod]) {
        bestPeriod = tau;
      }
    }
  }

  if (bestPeriod === -1 || bestPeriod <= minPeriod || bestPeriod >= maxPeriod - 1) {
    return null;
  }

  // 6. Parabolic interpolation of the peak for sub-sample accuracy
  const alpha = r[bestPeriod - 1];
  const beta = r[bestPeriod];
  const gamma = r[bestPeriod + 1];
  
  const denominator = 2 * beta - alpha - gamma;
  let periodAdjustment = 0;
  if (denominator !== 0) {
    periodAdjustment = 0.5 * (alpha - gamma) / denominator;
  }
  
  const exactPeriodDs = bestPeriod + periodAdjustment;
  const exactPeriod = exactPeriodDs * downsampleFactor;
  const frequency = sampleRate / exactPeriod;

  // 7. Calculate clarity (normalized correlation coefficient)
  let normDenom = 0;
  let sumClippedSq = 0;
  let sumShiftedSq = 0;
  const intPeriod = Math.round(exactPeriodDs);
  
  if (intPeriod < dsLength) {
    for (let i = 0; i < dsLength - intPeriod; i++) {
      sumClippedSq += clippedBuffer[i] * clippedBuffer[i];
      sumShiftedSq += clippedBuffer[i + intPeriod] * clippedBuffer[i + intPeriod];
    }
    normDenom = Math.sqrt(sumClippedSq * sumShiftedSq);
  }
  
  const clarity = normDenom > 0 ? r[intPeriod] / normDenom : 0;

  // Filter out noisy/unclear signals
  if (clarity < minClarity) {
    return null;
  }

  // 8. Calculate MIDI info
  const midiNote = frequencyToMidi(frequency);
  const targetFreq = midiToFrequency(midiNote);
  const centsDeviation = 1200 * Math.log2(frequency / targetFreq);
  const noteName = midiToNoteName(midiNote);

  return {
    frequency,
    noteName,
    midiNote,
    centsDeviation,
    clarity,
    db
  };
}

/**
 * Polyphonic pitch detection using frequency domain peak-picking and greedy harmonic grouping.
 * Optimized for real-time guitar strumming and chord recognition.
 */
export function detectMultiplePitches(
  freqData: Float32Array,
  sampleRate: number,
  noiseGateDb = -50,
  maxNotes = 6
): PitchData[] {
  const binCount = freqData.length;
  const fftSize = binCount * 2;
  const binResolution = sampleRate / fftSize;

  interface SpectralPeak {
    binIndex: number;
    interpolatedBin: number;
    frequency: number;
    db: number;
    magnitude: number;
    isHarmonic: boolean;
    claimedBy?: number;
  }

  const peaks: SpectralPeak[] = [];

  // Guitar pitch range: E2 (~82Hz) to E6 (~1318Hz)
  // Let's search bins corresponding to ~70Hz to ~1500Hz
  const minFreq = 70;
  const maxFreq = 1500;
  const minBin = Math.max(1, Math.floor(minFreq / binResolution));
  const maxBin = Math.min(binCount - 2, Math.ceil(maxFreq / binResolution));

  // Find the highest decibel peak in the search range
  let maxDbInRange = -100;
  for (let i = minBin; i <= maxBin; i++) {
    if (freqData[i] > maxDbInRange) {
      maxDbInRange = freqData[i];
    }
  }

  // If the spectrum is extremely quiet, return empty
  if (maxDbInRange < noiseGateDb) {
    return [];
  }

  // Dynamic gate threshold: peaks must be within 24 dB of the maximum peak to filter out noise
  const dynamicGate = Math.max(noiseGateDb, maxDbInRange - 24);

  for (let i = minBin; i <= maxBin; i++) {
    const val = freqData[i];
    
    // Check if it's a local maximum (peak)
    if (val > freqData[i - 1] && val > freqData[i + 1] && val > dynamicGate) {
      // Parabolic interpolation for high-precision peak frequency
      const alpha = freqData[i - 1];
      const beta = freqData[i];
      const gamma = freqData[i + 1];
      
      const denominator = 2 * beta - alpha - gamma;
      let p = 0;
      if (denominator !== 0) {
        p = 0.5 * (alpha - gamma) / denominator;
      }
      
      const interpolatedBin = i + p;
      const frequency = interpolatedBin * binResolution;
      
      if (frequency >= minFreq && frequency <= maxFreq) {
        peaks.push({
          binIndex: i,
          interpolatedBin,
          frequency,
          db: beta,
          magnitude: Math.pow(10, beta / 20),
          isHarmonic: false
        });
      }
    }
  }

  if (peaks.length === 0) {
    return [];
  }

  // Sort peaks by frequency (ascending) so we process lower fundamentals first
  peaks.sort((a, b) => a.frequency - b.frequency);

  const detectedNotes: PitchData[] = [];

  // Greedy Harmonic Elimination / Grouping
  for (let i = 0; i < peaks.length; i++) {
    const p1 = peaks[i];
    if (p1.isHarmonic) continue;

    // Convert peak frequency to MIDI note
    const midiNote = frequencyToMidi(p1.frequency);
    if (midiNote < 24 || midiNote > 96) continue;

    const targetFreq = midiToFrequency(midiNote);
    const centsDeviation = 1200 * Math.log2(p1.frequency / targetFreq);

    // This is a new fundamental! Mark all higher peaks that are integer harmonics of this note.
    p1.isHarmonic = false;
    
    // Search for its integer harmonics: 2x, 3x, 4x, 5x, 6x within a tolerance (e.g., 40 cents)
    const harmonicToleranceCents = 40;
    
    for (let j = i + 1; j < peaks.length; j++) {
      const p2 = peaks[j];
      if (p2.isHarmonic) continue;

      const harmonicRatio = p2.frequency / p1.frequency;
      const nearestInteger = Math.round(harmonicRatio);

      if (nearestInteger >= 2 && nearestInteger <= 6) {
        const perfectHarmonicFreq = p1.frequency * nearestInteger;
        const diffCents = Math.abs(1200 * Math.log2(p2.frequency / perfectHarmonicFreq));

        if (diffCents <= harmonicToleranceCents) {
          // If the higher octave peak is exceptionally strong (e.g., within 12 dB of the fundamental),
          // it might be a genuine separate played string (like E2 and E4 strummed together).
          // Otherwise, it is just a harmonic peak and should be suppressed.
          if (nearestInteger === 2 || nearestInteger === 4) {
            if (p2.db < p1.db - 12) {
              p2.isHarmonic = true;
              p2.claimedBy = midiNote;
            }
          } else {
            p2.isHarmonic = true;
            p2.claimedBy = midiNote;
          }
        }
      }
    }

    detectedNotes.push({
      frequency: p1.frequency,
      noteName: midiToNoteName(midiNote),
      midiNote,
      centsDeviation,
      clarity: 1.0, // High clarity since it's a confirmed spectral peak
      db: p1.db
    });

    if (detectedNotes.length >= maxNotes) {
      break;
    }
  }

  return detectedNotes;
}

