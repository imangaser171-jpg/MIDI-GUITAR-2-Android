import { WaveType, SynthSettings } from '../types';

interface ActiveOscillator {
  node: OscillatorNode;
  frequencyRatio: number;
}

interface ActiveVoice {
  oscs: ActiveOscillator[];
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

  // Voice Box (Formant Filter) FX nodes
  private voiceBoxInput: GainNode | null = null;
  private voiceBoxDryGain: GainNode | null = null;
  private voiceBoxOutput: GainNode | null = null;
  private voiceBoxFilters: BiquadFilterNode[] = [];
  private voiceBoxFilterGains: GainNode[] = [];
  private voiceBoxLfo: OscillatorNode | null = null;
  private voiceBoxLfoGain: GainNode | null = null;
  
  constructor(initialSettings: SynthSettings) {
    this.settings = initialSettings;
  }

  public init(audioContext: AudioContext) {
    this.ctx = audioContext;
    const now = this.ctx.currentTime;
    
    // Create master routing chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.volume, now);
    
    // Create Distortion Node
    this.distortionNode = this.ctx.createWaveShaper();
    this.updateDistortionCurve();

    // Create Delay Nodes
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedbackGain = this.ctx.createGain();
    
    this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, now);
    this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback, now);
    
    // Connect Delay feedback loop
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Create Reverb Node
    this.reverbNode = this.ctx.createConvolver();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    this.updateReverbBuffer();

    // Reverb dry/wet gains
    this.reverbWetGain.gain.setValueAtTime(this.settings.reverbWet, now);
    this.reverbDryGain.gain.setValueAtTime(1 - this.settings.reverbWet, now);

    // Create Voice Box Formant Filter Nodes
    this.voiceBoxInput = this.ctx.createGain();
    this.voiceBoxDryGain = this.ctx.createGain();
    this.voiceBoxOutput = this.ctx.createGain();

    this.voiceBoxFilters = [
      this.ctx.createBiquadFilter(),
      this.ctx.createBiquadFilter(),
      this.ctx.createBiquadFilter()
    ];
    this.voiceBoxFilterGains = [
      this.ctx.createGain(),
      this.ctx.createGain(),
      this.ctx.createGain()
    ];

    // Configure individual formant filters
    this.voiceBoxFilters.forEach((filter, index) => {
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(10, now); // high resonance for vocals
      
      filter.connect(this.voiceBoxFilterGains[index]);
      this.voiceBoxFilterGains[index].connect(this.voiceBoxOutput!);
      
      this.voiceBoxInput!.connect(filter);
    });

    this.voiceBoxInput.connect(this.voiceBoxDryGain);
    this.voiceBoxDryGain.connect(this.voiceBoxOutput);

    // Create LFO to modulate formant detuning (gender/wah morph sweep)
    this.voiceBoxLfo = this.ctx.createOscillator();
    this.voiceBoxLfo.type = 'sine';
    this.voiceBoxLfo.frequency.setValueAtTime(this.settings.voiceBoxModRate || 0.0, now);

    this.voiceBoxLfoGain = this.ctx.createGain();
    this.voiceBoxLfoGain.gain.setValueAtTime((this.settings.voiceBoxModDepth || 0.0) * 1000, now);

    this.voiceBoxLfo.connect(this.voiceBoxLfoGain);

    // Connect LFO detune modulation to each formant bandpass filter
    this.voiceBoxFilters.forEach(filter => {
      this.voiceBoxLfoGain!.connect(filter.detune);
    });

    this.voiceBoxLfo.start(now);

    // Apply active Voice Box parameter state
    this.applyVoiceBoxSettings();

    // Assembly of master FX chain:
    // Source -> DistortionNode -> VoiceBoxInput -> VoiceBoxOutput -> ReverbDry & ReverbConvolver
    // ReverbConvolver -> ReverbWet
    // Source -> DelayNode -> MasterGain
    this.distortionNode.connect(this.voiceBoxInput);
    this.voiceBoxOutput.connect(this.reverbDryGain);
    this.voiceBoxOutput.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWetGain);
    
    // Connect both dry and wet and delay to master gain
    this.reverbDryGain.connect(this.masterGain);
    this.reverbWetGain.connect(this.masterGain);
    this.delayNode.connect(this.masterGain);
    
    // Connect master gain to destination
    this.masterGain.connect(this.ctx.destination);
  }

  private applyVoiceBoxSettings() {
    if (!this.ctx || !this.voiceBoxDryGain || !this.voiceBoxFilters || !this.voiceBoxLfo || !this.voiceBoxLfoGain) return;

    const now = this.ctx.currentTime;
    const enabled = this.settings.voiceBoxEnabled;
    const vowel = this.settings.voiceBoxVowel || 'A';
    const rate = this.settings.voiceBoxModRate;
    const depth = this.settings.voiceBoxModDepth;

    // Smoothly update LFO frequency and gain
    this.voiceBoxLfo.frequency.setTargetAtTime(rate, now, 0.1);
    this.voiceBoxLfoGain.gain.setTargetAtTime(depth * 1000, now, 0.1); // range 0 to 1000 cents detune modulation

    if (!enabled) {
      // Bypass: Dry is 1, Wet (filter outputs) is 0
      this.voiceBoxDryGain.gain.setTargetAtTime(1.0, now, 0.05);
      this.voiceBoxFilterGains.forEach(g => {
        g.gain.setTargetAtTime(0.0, now, 0.05);
      });
    } else {
      // Active Voice Box: Dry is 0, Wet is 1
      this.voiceBoxDryGain.gain.setTargetAtTime(0.0, now, 0.05);
      // Equalized formant gains for clear projection
      const formantGains = [1.2, 0.7, 0.4];
      this.voiceBoxFilterGains.forEach((g, index) => {
        g.gain.setTargetAtTime(formantGains[index], now, 0.05);
      });

      // Update formant frequencies matching vocal vowel sounds
      const freqs = {
        A: [730, 1090, 2440],
        E: [530, 1840, 2480],
        I: [270, 2290, 3010],
        O: [570, 840, 2410],
        U: [300, 870, 2240]
      }[vowel] || [730, 1090, 2440];

      this.voiceBoxFilters.forEach((filter, index) => {
        filter.frequency.setTargetAtTime(freqs[index], now, 0.1);
      });
    }
  }

  public updateSettings(newSettings: SynthSettings) {
    const oldVolume = this.settings.volume;
    const oldDelayTime = this.settings.delayTime;
    const oldDelayFeedback = this.settings.delayFeedback;
    const oldReverbWet = this.settings.reverbWet;
    const oldDistortion = this.settings.distortion;

    const oldVoiceBoxEnabled = this.settings.voiceBoxEnabled;
    const oldVoiceBoxVowel = this.settings.voiceBoxVowel;
    const oldVoiceBoxModRate = this.settings.voiceBoxModRate;
    const oldVoiceBoxModDepth = this.settings.voiceBoxModDepth;

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

    // Apply Voice Box settings
    if (oldVoiceBoxEnabled !== this.settings.voiceBoxEnabled || 
        oldVoiceBoxVowel !== this.settings.voiceBoxVowel || 
        oldVoiceBoxModRate !== this.settings.voiceBoxModRate || 
        oldVoiceBoxModDepth !== this.settings.voiceBoxModDepth) {
      this.applyVoiceBoxSettings();
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

    // Audio routing helper and list of oscillator objects to play
    const oscs: ActiveOscillator[] = [];

    // Define sound components (fundamental + harmonics) based on waveType
    interface SoundComponent {
      type: OscillatorType;
      frequencyRatio: number;
      gainRatio: number;
      detuneOffset: number;
      isHammer?: boolean;
    }

    const components: SoundComponent[] = [];

    if (this.settings.waveType === 'piano') {
      // Elegant multi-harmonic piano model with stretch tuning detune offsets
      components.push(
        { type: 'sine', frequencyRatio: 1.0, gainRatio: 0.7, detuneOffset: 0 },
        { type: 'sine', frequencyRatio: 2.0, gainRatio: 0.35, detuneOffset: 2 },
        { type: 'sine', frequencyRatio: 3.0, gainRatio: 0.15, detuneOffset: 4 },
        { type: 'triangle', frequencyRatio: 4.0, gainRatio: 0.08, detuneOffset: 6 },
        { type: 'sine', frequencyRatio: 8.1, gainRatio: 0.25, detuneOffset: 12, isHammer: true }
      );
    } else {
      // Standard wave type single oscillator
      const wave = this.settings.waveType === 'noise' ? 'triangle' : this.settings.waveType;
      components.push({
        type: wave as OscillatorType,
        frequencyRatio: 1.0,
        gainRatio: 1.0,
        detuneOffset: 0
      });
    }

    // Instantiate oscillators for each component, applying Unison if configured
    const unisonVoices = this.settings.unisonVoices || 1;
    const unisonDetune = this.settings.unisonDetune || 0;

    components.forEach((comp) => {
      const baseFreq = frequency * comp.frequencyRatio;

      for (let i = 0; i < unisonVoices; i++) {
        const osc = this.ctx!.createOscillator();
        osc.type = comp.type;
        osc.frequency.setValueAtTime(baseFreq, now);

        // Calculate detune centering for Unison
        let unisonDetuneCents = 0;
        if (unisonVoices > 1) {
          const fraction = (i / (unisonVoices - 1)) - 0.5; // range -0.5 to 0.5
          unisonDetuneCents = fraction * 2 * unisonDetune;
        }

        const totalDetune = comp.detuneOffset + unisonDetuneCents;
        osc.detune.setValueAtTime(totalDetune, now);

        // Individual component volume/decay configurations
        if (comp.isHammer) {
          // Hammer strike transient: fast exponential decay
          const hammerGain = this.ctx!.createGain();
          hammerGain.gain.setValueAtTime(comp.gainRatio, now);
          hammerGain.gain.setTargetAtTime(0, now, 0.03); // ~30ms decay constant
          osc.connect(hammerGain);
          hammerGain.connect(voiceGain);
        } else if (comp.gainRatio !== 1.0) {
          const compGain = this.ctx!.createGain();
          compGain.gain.setValueAtTime(comp.gainRatio, now);
          
          if (this.settings.waveType === 'piano' && comp.frequencyRatio > 1) {
            // Decay higher piano harmonics faster for authentic string modeling
            const harmonicDecayFactor = this.settings.decay * (1.2 / comp.frequencyRatio);
            compGain.gain.setTargetAtTime(0, now, Math.max(0.01, harmonicDecayFactor));
          }
          osc.connect(compGain);
          compGain.connect(voiceGain);
        } else {
          osc.connect(voiceGain);
        }

        osc.start(now);
        oscs.push({
          node: osc,
          frequencyRatio: comp.frequencyRatio
        });
      }
    });

    // Connect voice gain to filter, filter to master FX chain
    voiceGain.connect(filter);
    filter.connect(this.distortionNode);
    
    // Also send a portion to the delay line
    voiceGain.connect(this.delayNode);

    // Store active voice
    this.activeVoices.set(shiftedMidiNote, {
      oscs,
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
    
    voice.oscs.forEach((oscObj) => {
      const targetFreq = frequency * oscObj.frequencyRatio;
      oscObj.node.frequency.setTargetAtTime(targetFreq, now, 0.05);
    });
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

    const voiceMidi = shiftedMidiNote;
    
    // Stop the oscillators after release finishes
    setTimeout(() => {
      try {
        voice.oscs.forEach((oscObj) => {
          oscObj.node.stop();
          oscObj.node.disconnect();
        });
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
        voice.oscs.forEach((oscObj) => {
          oscObj.node.stop();
          oscObj.node.disconnect();
        });
        voice.gainNode.disconnect();
        voice.filterNode.disconnect();
      } catch (e) {}
    });
    this.activeVoices.clear();
  }
}
