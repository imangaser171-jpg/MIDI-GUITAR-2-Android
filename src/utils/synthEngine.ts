import { SynthSettings } from '../types';

interface ActiveVoiceOscillator {
  node: OscillatorNode;
  initialFreq: number;
}

interface ActiveVoice {
  oscs: ActiveVoiceOscillator[];
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  startTime: number;
  modulators?: AudioNode[];
  baseMidiNote: number;
}

export class PolySynth {
  private ctx: AudioContext | null = null;
  private settings: SynthSettings;
  private voices: Map<number, ActiveVoice> = new Map();
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayGain: GainNode | null = null;

  constructor(settings: SynthSettings) {
    this.settings = settings;
  }

  private initAudio() {
    if (this.ctx) return;
    
    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.volume, this.ctx.currentTime);
    
    // Setup Delay Echo effect Nodes
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayGain = this.ctx.createGain();
    
    const dTime = this.settings.delayTime !== undefined ? this.settings.delayTime : 0.35;
    const dFb = this.settings.delayFeedback !== undefined ? this.settings.delayFeedback : 0.4;
    const dWet = this.settings.delayWet !== undefined ? this.settings.delayWet : 0.25;
    const dEnabled = this.settings.delayEnabled !== undefined ? this.settings.delayEnabled : false;
    
    this.delayNode.delayTime.setValueAtTime(dTime, this.ctx.currentTime);
    this.delayFeedback.gain.setValueAtTime(dFb, this.ctx.currentTime);
    this.delayGain.gain.setValueAtTime(dEnabled ? dWet : 0, this.ctx.currentTime);
    
    // Connect Delay feedback loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    // Dry Out
    this.masterGain.connect(this.ctx.destination);
    
    // Wet Out
    this.masterGain.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.ctx.destination);
  }

  public updateSettings(newSettings: SynthSettings) {
    this.settings = newSettings;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.settings.volume, this.ctx.currentTime, 0.02);
    }
    
    // Update Delay parameters in real-time
    if (this.ctx && this.delayNode && this.delayFeedback && this.delayGain) {
      const dTime = this.settings.delayTime !== undefined ? this.settings.delayTime : 0.35;
      const dFb = this.settings.delayFeedback !== undefined ? this.settings.delayFeedback : 0.4;
      const dWet = this.settings.delayWet !== undefined ? this.settings.delayWet : 0.25;
      const dEnabled = this.settings.delayEnabled !== undefined ? this.settings.delayEnabled : false;
      
      const now = this.ctx.currentTime;
      this.delayNode.delayTime.setTargetAtTime(dTime, now, 0.05);
      this.delayFeedback.gain.setTargetAtTime(dFb, now, 0.05);
      this.delayGain.gain.setTargetAtTime(dEnabled ? dWet : 0, now, 0.05);
    }
  }

  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  private getHarmonizerOffsets(mode: string): number[] {
    switch (mode) {
      case 'octave-up': return [12];
      case 'octave-down': return [-12];
      case 'fifth': return [7];
      case 'fourth': return [5];
      case 'power': return [7, 12];
      case 'major-triad': return [4, 7];
      case 'minor-triad': return [3, 7];
      default: return [];
    }
  }

  private generateOscillatorsForPitch(
    freq: number,
    type: string,
    filterNode: BiquadFilterNode,
    oscs: ActiveVoiceOscillator[],
    modulators: AudioNode[],
    now: number
  ) {
    if (!this.ctx) return;

    if (type === 'unison') {
      const detunes = [-15, 0, 15];
      detunes.forEach((detuneVal) => {
        const o = this.ctx!.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, now);
        o.detune.setValueAtTime(detuneVal, now);
        o.connect(filterNode);
        o.start(now);
        oscs.push({ node: o, initialFreq: freq });
      });
    } else if (type === 'strings') {
      const detunes = [-10, 0, 10];
      detunes.forEach((detuneVal) => {
        const o = this.ctx!.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, now);
        o.detune.setValueAtTime(detuneVal, now);
        o.connect(filterNode);
        o.start(now);
        oscs.push({ node: o, initialFreq: freq });
      });
    } else if (type === 'sax') {
      const o1 = this.ctx.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(freq, now);
      o1.connect(filterNode);
      o1.start(now);
      oscs.push({ node: o1, initialFreq: freq });

      const o2 = this.ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(freq, now);
      o2.connect(filterNode);
      o2.start(now);
      oscs.push({ node: o2, initialFreq: freq });

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(5.5, now);
      lfoGain.gain.setValueAtTime(3.8, now);

      lfo.connect(lfoGain);
      lfoGain.connect(o1.frequency);
      lfoGain.connect(o2.frequency);

      lfo.start(now);
      modulators.push(lfo);
    } else if (type === 'violin') {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, now);
      o.connect(filterNode);
      o.start(now);
      oscs.push({ node: o, initialFreq: freq });

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(6.0, now);
      lfoGain.gain.setValueAtTime(2.8, now);

      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);

      lfo.start(now);
      modulators.push(lfo);
    } else if (type === 'nylon') {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq * 1.015, now);
      o.frequency.exponentialRampToValueAtTime(freq, now + 0.035);
      o.connect(filterNode);
      o.start(now);
      oscs.push({ node: o, initialFreq: freq * 1.015 });

      const oPluck = this.ctx.createOscillator();
      oPluck.type = 'sine';
      oPluck.frequency.setValueAtTime(freq * 3, now);
      
      const pluckGain = this.ctx.createGain();
      pluckGain.gain.setValueAtTime(0.2, now);
      pluckGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      oPluck.connect(pluckGain);
      pluckGain.connect(filterNode);
      oPluck.start(now);
      oscs.push({ node: oPluck, initialFreq: freq * 3 });
    } else if (type === 'piano') {
      const o1 = this.ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.setValueAtTime(freq, now);
      o1.connect(filterNode);
      o1.start(now);
      oscs.push({ node: o1, initialFreq: freq });

      const o2 = this.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(freq * 2, now);
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.35, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o2.connect(g2);
      g2.connect(filterNode);
      o2.start(now);
      oscs.push({ node: o2, initialFreq: freq * 2 });

      const o3 = this.ctx.createOscillator();
      o3.type = 'sine';
      o3.frequency.setValueAtTime(freq * 3, now);
      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.18, now);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o3.connect(g3);
      g3.connect(filterNode);
      o3.start(now);
      oscs.push({ node: o3, initialFreq: freq * 3 });
    } else if (type === 'bass') {
      const oSub = this.ctx.createOscillator();
      oSub.type = 'sine';
      oSub.frequency.setValueAtTime(freq * 0.5, now);
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.45, now);
      oSub.connect(subGain);
      subGain.connect(filterNode);
      oSub.start(now);
      oscs.push({ node: oSub, initialFreq: freq * 0.5 });

      const oCharacter = this.ctx.createOscillator();
      oCharacter.type = 'triangle';
      oCharacter.frequency.setValueAtTime(freq, now);
      const charGain = this.ctx.createGain();
      charGain.gain.setValueAtTime(0.3, now);
      oCharacter.connect(charGain);
      charGain.connect(filterNode);
      oCharacter.start(now);
      oscs.push({ node: oCharacter, initialFreq: freq });

      const oPluck = this.ctx.createOscillator();
      oPluck.type = 'sawtooth';
      oPluck.frequency.setValueAtTime(freq * 3, now);
      const pluckGain = this.ctx.createGain();
      pluckGain.gain.setValueAtTime(0.15, now);
      pluckGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      oPluck.connect(pluckGain);
      pluckGain.connect(filterNode);
      oPluck.start(now);
      oscs.push({ node: oPluck, initialFreq: freq * 3 });
    } else {
      const o = this.ctx.createOscillator();
      o.type = type as any;
      o.frequency.setValueAtTime(freq, now);
      o.connect(filterNode);
      o.start(now);
      oscs.push({ node: o, initialFreq: freq });
    }
  }

  public noteOn(note: number, velocity = 100) {
    this.initAudio();
    if (!this.ctx || !this.masterGain) return;

    // If note is already playing, release it first
    if (this.voices.has(note)) {
      this.noteOff(note);
    }

    const now = this.ctx.currentTime;
    
    // Apply Pitch Shifter / Transposition here
    const shiftedBaseNote = note + (this.settings.pitchShift || 0);

    // Create components
    const filterNode = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    // Arrays to track all created audio nodes for this voice
    const oscs: ActiveVoiceOscillator[] = [];
    const modulators: AudioNode[] = [];

    // Configure Filter
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(this.settings.cutoff, now);
    filterNode.Q.setValueAtTime(this.settings.Q, now);

    const type = this.settings.oscType;

    // Harmonizer Offsets
    const offsets = [0, ...this.getHarmonizerOffsets(this.settings.harmonizerMode || 'off')];

    // Generate oscillators for fundamental note + harmonizer notes
    offsets.forEach((offset) => {
      const currentNote = shiftedBaseNote + offset;
      const freq = this.midiToFreq(currentNote) * Math.pow(2, (this.settings.fineTune || 0) / 1200);
      this.generateOscillatorsForPitch(freq, type, filterNode, oscs, modulators, now);
    });

    // Handle instrument-specific filter sweeps
    if (type === 'strings') {
      filterNode.frequency.setValueAtTime(400, now);
      filterNode.frequency.exponentialRampToValueAtTime(this.settings.cutoff, now + Math.max(0.1, this.settings.attack * 2));
    } else if (type === 'sax') {
      filterNode.frequency.setValueAtTime(800, now);
      filterNode.frequency.linearRampToValueAtTime(2400, now + 0.15);
    } else if (type === 'violin') {
      filterNode.frequency.setValueAtTime(1000, now);
      filterNode.frequency.exponentialRampToValueAtTime(this.settings.cutoff, now + 0.1);
    } else if (type === 'nylon') {
      filterNode.frequency.setValueAtTime(2800, now);
      filterNode.frequency.exponentialRampToValueAtTime(450, now + 0.16);
    } else if (type === 'piano') {
      filterNode.frequency.setValueAtTime(3200, now);
      filterNode.frequency.exponentialRampToValueAtTime(1400, now + 0.22);
    } else if (type === 'bass') {
      filterNode.frequency.setValueAtTime(1200, now);
      filterNode.frequency.exponentialRampToValueAtTime(180, now + 0.15);
    }

    // --- Pinch Harmonics Implementation ---
    if (this.settings.pinchHarmonicsEnabled) {
      // Calculate pinch harmonic frequency (+31 semitones: 2 octaves and a fifth higher for a soaring squeal)
      const pinchNote = shiftedBaseNote + 31;
      const pinchFreq = this.midiToFreq(pinchNote) * Math.pow(2, (this.settings.fineTune || 0) / 1200);

      const oPinch = this.ctx.createOscillator();
      oPinch.type = 'sawtooth';
      oPinch.frequency.setValueAtTime(pinchFreq * 1.05, now); // Squealing pitch-bend entry
      oPinch.frequency.exponentialRampToValueAtTime(pinchFreq, now + 0.08);

      const pinchFilter = this.ctx.createBiquadFilter();
      pinchFilter.type = 'bandpass';
      pinchFilter.frequency.setValueAtTime(4000, now);
      pinchFilter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      pinchFilter.Q.setValueAtTime(14.0, now); // Super-sharp resonant peak

      const pinchGain = this.ctx.createGain();
      const level = this.settings.pinchHarmonicsLevel !== undefined ? this.settings.pinchHarmonicsLevel : 0.5;
      pinchGain.gain.setValueAtTime(level * 0.4, now);
      pinchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // Squeals are highly transient

      oPinch.connect(pinchFilter);
      pinchFilter.connect(pinchGain);
      pinchGain.connect(this.masterGain);

      oPinch.start(now);
      oscs.push({ node: oPinch, initialFreq: pinchFreq });
    }

    // Configure ADSR Envelope
    const velocityScale = velocity / 127;
    const peakGain = velocityScale * 0.25; // Scale down to avoid clipping

    gainNode.gain.setValueAtTime(0, now);
    
    // Attack phase
    gainNode.gain.linearRampToValueAtTime(peakGain, now + Math.max(0.005, this.settings.attack));
    
    // Decay and Sustain phases
    gainNode.gain.setTargetAtTime(
      peakGain * this.settings.sustain, 
      now + Math.max(0.005, this.settings.attack), 
      Math.max(0.005, this.settings.decay)
    );

    // Connection: Filter -> Envelope Gain -> Master Gain
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Save active voice
    this.voices.set(note, {
      oscs,
      gainNode,
      filterNode,
      startTime: now,
      modulators,
      baseMidiNote: note
    });
  }

  public noteOff(note: number) {
    if (!this.ctx || !this.voices.has(note)) return;

    const voice = this.voices.get(note)!;
    this.voices.delete(note);

    const now = this.ctx.currentTime;
    const gainNode = voice.gainNode;
    const oscs = voice.oscs;
    const modulators = voice.modulators || [];

    try {
      // Cancel scheduled envelope events to prevent clicks
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      
      // Release phase
      const releaseTime = Math.max(0.01, this.settings.release);
      gainNode.gain.setTargetAtTime(0, now, releaseTime / 3);

      // Stop all oscillators after release completes
      oscs.forEach((osc) => {
        try {
          osc.node.stop(now + releaseTime * 1.5);
        } catch (e) {}
      });

      // Stop any LFO modulators
      modulators.forEach((mod) => {
        if ('stop' in mod) {
          try {
            (mod as any).stop(now + releaseTime * 1.5);
          } catch (e) {}
        }
      });
    } catch (e) {
      // Handle edge cases where audio node state is invalid
      oscs.forEach((osc) => {
        try {
          osc.node.stop(now);
        } catch (err) {}
      });
      modulators.forEach((mod) => {
        if ('stop' in mod) {
          try {
            (mod as any).stop(now);
          } catch (err) {}
        }
      });
    }
  }

  public updateVoicePitch(note: number, centsDeviation: number) {
    if (!this.ctx || !this.voices.has(note)) return;
    const voice = this.voices.get(note)!;
    const now = this.ctx.currentTime;
    
    // Scale factor for cents deviation
    const bendMultiplier = Math.pow(2, centsDeviation / 1200);

    voice.oscs.forEach((vOsc) => {
      const targetFreq = vOsc.initialFreq * bendMultiplier;
      // Use setTargetAtTime for smooth, click-free pitch updates
      vOsc.node.frequency.setTargetAtTime(targetFreq, now, 0.015);
    });
  }

  public glideVoice(oldNote: number, newNote: number, glideTime: number) {
    if (!this.ctx || !this.voices.has(oldNote)) return;
    const voice = this.voices.get(oldNote)!;
    const now = this.ctx.currentTime;

    const oldFreq = this.midiToFreq(oldNote);
    const newFreq = this.midiToFreq(newNote);
    const ratio = newFreq / oldFreq;

    // Glide time cannot be 0, minimum 0.01s for smoothness
    const time = Math.max(0.01, glideTime);

    voice.oscs.forEach((vOsc) => {
      // Scale initial frequency based on ratio
      const targetFreq = vOsc.initialFreq * ratio;
      // Record new initialFreq so that subsequent pitch bends are correctly referenced!
      vOsc.initialFreq = targetFreq;

      vOsc.node.frequency.cancelScheduledValues(now);
      vOsc.node.frequency.setValueAtTime(vOsc.node.frequency.value, now);
      vOsc.node.frequency.exponentialRampToValueAtTime(targetFreq, now + time);
    });

    // Update base midi note
    voice.baseMidiNote = newNote;
  }

  public hasVoice(note: number): boolean {
    return this.voices.has(note);
  }

  public renameVoice(oldNote: number, newNote: number) {
    if (this.voices.has(oldNote)) {
      const voice = this.voices.get(oldNote)!;
      this.voices.delete(oldNote);
      
      // Stop and clean up any pre-existing voice at the target note to prevent voice leaks
      if (this.voices.has(newNote)) {
        this.noteOff(newNote);
      }
      
      this.voices.set(newNote, voice);
    }
  }

  public panic() {
    if (!this.ctx) return;
    
    // Stop all active voices
    this.voices.forEach((voice) => {
      voice.oscs.forEach((osc) => {
        try {
          osc.node.stop();
        } catch (e) {}
      });
      if (voice.modulators) {
        voice.modulators.forEach((mod) => {
          if ('stop' in mod) {
            try {
              (mod as any).stop();
            } catch (e) {}
          }
        });
      }
    });
    this.voices.clear();
  }

  public resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
