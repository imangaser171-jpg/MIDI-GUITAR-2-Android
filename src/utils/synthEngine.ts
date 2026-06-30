import { WaveType, SynthSettings } from '../types';

interface ActiveVoice {
  osc: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  startTime: number;
  midiNote: number;
}

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private settings: SynthSettings;
  private activeVoices: Map<number, ActiveVoice> = new Map();
  
  // Audio FX nodes (shared or master)
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  
  constructor(initialSettings: SynthSettings) {
    this.settings = initialSettings;
  }

  public init(audioContext: AudioContext) {
    this.ctx = audioContext;
    
    // Create master routing chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.volume, this.ctx.currentTime);
    
    // Create Distortion Node
    this.distortionNode = this.ctx.createWaveShaper();
    this.updateDistortionCurve();

    // Create Delay Nodes
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedbackGain = this.ctx.createGain();
    
    this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, this.ctx.currentTime);
    this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback, this.ctx.currentTime);
    
    // Connect Delay feedback loop
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Create Reverb Node
    this.reverbNode = this.ctx.createConvolver();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    this.updateReverbBuffer();

    // Reverb dry/wet gains
    this.reverbWetGain.gain.setValueAtTime(this.settings.reverbWet, this.ctx.currentTime);
    this.reverbDryGain.gain.setValueAtTime(1 - this.settings.reverbWet, this.ctx.currentTime);

    // Assembly of master FX chain:
    // Source -> DistortionNode -> ReverbDry & ReverbConvolver
    // ReverbConvolver -> ReverbWet
    // Source -> DelayNode -> MasterGain
    
    this.distortionNode.connect(this.reverbDryGain);
    this.distortionNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWetGain);
    
    // Connect both dry and wet and delay to master gain
    this.reverbDryGain.connect(this.masterGain);
    this.reverbWetGain.connect(this.masterGain);
    this.delayNode.connect(this.masterGain);
    
    // Connect master gain to destination
    this.masterGain.connect(this.ctx.destination);
  }

  public updateSettings(newSettings: SynthSettings) {
    const oldVolume = this.settings.volume;
    const oldDelayTime = this.settings.delayTime;
    const oldDelayFeedback = this.settings.delayFeedback;
    const oldReverbWet = this.settings.reverbWet;
    const oldDistortion = this.settings.distortion;

    this.settings = { ...newSettings };
    
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Apply main volume
    if (this.masterGain && oldVolume !== this.settings.volume) {
      this.masterGain.gain.linearRampToValueAtTime(this.settings.volume, now + 0.05);
    }

    // Apply delay params
    if (this.delayNode && oldDelayTime !== this.settings.delayTime) {
      this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, now);
    }
    if (this.delayFeedbackGain && oldDelayFeedback !== this.settings.delayFeedback) {
      this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback, now);
    }

    // Apply reverb dry/wet
    if (this.reverbWetGain && this.reverbDryGain && oldReverbWet !== this.settings.reverbWet) {
      this.reverbWetGain.gain.setValueAtTime(this.settings.reverbWet, now);
      this.reverbDryGain.gain.setValueAtTime(1 - this.settings.reverbWet, now);
    }

    // Apply distortion curve
    if (oldDistortion !== this.settings.distortion) {
      this.updateDistortionCurve();
    }
  }

  private updateDistortionCurve() {
    if (!this.distortionNode) return;
    const amount = this.settings.distortion * 100; // Map 0-1 to 0-100
    if (amount <= 0) {
      this.distortionNode.curve = null;
      return;
    }
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    this.distortionNode.curve = curve;
  }

  private updateReverbBuffer() {
    if (!this.ctx || !this.reverbNode) return;
    
    // Generate an impulse response algorithmically
    const sampleRate = this.ctx.sampleRate;
    const duration = 2.0; // 2 seconds reverb
    const decay = 2.5; // decay factor
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // White noise decaying exponentially
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    
    this.reverbNode.buffer = impulse;
  }

  public noteOn(midiNote: number, velocity: number = 0.8) {
    if (!this.ctx || !this.distortionNode || !this.delayNode) return;

    // Apply octave shift
    const shiftedMidiNote = midiNote + (this.settings.octaveOffset * 12);
    if (shiftedMidiNote < 0 || shiftedMidiNote > 127) return;

    // If monophonic, shut off all other voices first
    if (!this.settings.polyphonic) {
      this.allNotesOff();
    }

    // Prevent double-triggering same midi note
    if (this.activeVoices.has(shiftedMidiNote)) {
      this.noteOff(shiftedMidiNote);
    }

    const now = this.ctx.currentTime;
    const frequency = 440 * Math.pow(2, (shiftedMidiNote - 69) / 12);

    // Create Oscillator
    const osc = this.ctx.createOscillator();
    osc.type = this.settings.waveType === 'noise' ? 'triangle' : this.settings.waveType;
    osc.frequency.setValueAtTime(frequency, now);

    // Create custom Gain Node for ADSR envelope
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    
    // Attack phase: linear ramp to peak volume
    const attackTime = Math.max(0.002, this.settings.attack);
    const peakVolume = velocity;
    voiceGain.gain.linearRampToValueAtTime(peakVolume, now + attackTime);
    
    // Decay phase: exponential ramp to sustain volume
    const decayTime = Math.max(0.002, this.settings.decay);
    const sustainVolume = peakVolume * this.settings.sustain;
    voiceGain.gain.setTargetAtTime(sustainVolume, now + attackTime, decayTime);

    // Create Filter Node for this voice
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.settings.filterCutoff, now);
    filter.Q.setValueAtTime(this.settings.filterResonance, now);

    // Audio routing: Osc -> VoiceGain -> Filter -> Distortion Chain
    osc.connect(voiceGain);
    voiceGain.connect(filter);
    filter.connect(this.distortionNode);
    
    // Also send a portion to the delay line
    voiceGain.connect(this.delayNode);

    // Start oscillator
    osc.start(now);

    // Store voice
    this.activeVoices.set(shiftedMidiNote, {
      osc,
      gainNode: voiceGain,
      filterNode: filter,
      startTime: now,
      midiNote: shiftedMidiNote
    });
  }

  public pitchBend(midiNote: number, centsOffset: number) {
    if (!this.ctx) return;
    const shiftedMidiNote = midiNote + (this.settings.octaveOffset * 12);
    const voice = this.activeVoices.get(shiftedMidiNote);
    if (!voice) return;

    const now = this.ctx.currentTime;
    const targetMidi = shiftedMidiNote + (centsOffset / 100);
    const frequency = 440 * Math.pow(2, (targetMidi - 69) / 12);
    
    voice.osc.frequency.setTargetAtTime(frequency, now, 0.05);
  }

  public noteOff(midiNote: number) {
    if (!this.ctx) return;
    
    const shiftedMidiNote = midiNote + (this.settings.octaveOffset * 12);
    const voice = this.activeVoices.get(shiftedMidiNote);
    if (!voice) return;

    const now = this.ctx.currentTime;
    const gainParam = voice.gainNode.gain;

    // Clear scheduled envelope events to prevent clicks
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(gainParam.value, now);

    // Release phase: exponential ramp down to 0
    const releaseTime = Math.max(0.005, this.settings.release);
    gainParam.setTargetAtTime(0, now, releaseTime / 3);

    const osc = voice.osc;
    const voiceMidi = shiftedMidiNote;
    
    // Stop the oscillator after release finishes
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
        voice.gainNode.disconnect();
        voice.filterNode.disconnect();
      } catch (e) {
        // Guard against any contextual node lifecycle issues
      }
    }, releaseTime * 1000 + 100);

    this.activeVoices.delete(voiceMidi);
  }

  public allNotesOff() {
    this.activeVoices.forEach((voice) => {
      try {
        voice.osc.stop();
        voice.osc.disconnect();
        voice.gainNode.disconnect();
        voice.filterNode.disconnect();
      } catch (e) {}
    });
    this.activeVoices.clear();
  }
}
