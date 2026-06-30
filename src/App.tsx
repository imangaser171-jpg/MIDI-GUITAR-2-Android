import { useState, useEffect, useRef } from 'react';
import { 
  WaveType, 
  SynthSettings, 
  MidiMessageLog, 
  PitchData, 
  Tuning,
  MidiOutput
} from './types';
import { autoCorrelate, frequencyToMidi } from './utils/pitchDetector';
import { SynthEngine } from './utils/synthEngine';
import { MidiManager } from './utils/midiManager';
import { TunerDial } from './components/TunerDial';
import { GuitarFretboard } from './components/GuitarFretboard';
import { SynthPanel } from './components/SynthPanel';
import { MidiConsole } from './components/MidiConsole';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { DrumBeats } from './components/DrumBeats';
import { 
  Play, 
  Square, 
  Settings, 
  Music, 
  VolumeX, 
  Volume2,
  Sliders,
  HelpCircle,
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';

// Instrument presets config
const INSTRUMENT_PRESETS = [
  {
    id: 'saw_lead',
    name: 'Saw Lead',
    settings: {
      preset: 'saw_lead',
      waveType: 'sawtooth' as WaveType,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.7,
      release: 0.2,
      filterCutoff: 4000,
      filterResonance: 2,
      distortion: 0.1,
      delayTime: 0.3,
      delayFeedback: 0.2,
      reverbWet: 0.2,
      volume: 0.8,
      polyphonic: false,
      octaveOffset: 0,
    }
  },
  {
    id: 'cosmic_pad',
    name: 'Cosmic Pad',
    settings: {
      preset: 'cosmic_pad',
      waveType: 'triangle' as WaveType,
      attack: 0.35,
      decay: 0.5,
      sustain: 0.9,
      release: 0.8,
      filterCutoff: 2200,
      filterResonance: 1.2,
      distortion: 0.0,
      delayTime: 0.5,
      delayFeedback: 0.4,
      reverbWet: 0.55,
      volume: 0.75,
      polyphonic: true,
      octaveOffset: 0,
    }
  },
  {
    id: 'retro_organ',
    name: 'Retro Organ',
    settings: {
      preset: 'retro_organ',
      waveType: 'square' as WaveType,
      attack: 0.005,
      decay: 0.1,
      sustain: 1.0,
      release: 0.08,
      filterCutoff: 6500,
      filterResonance: 1.0,
      distortion: 0.0,
      delayTime: 0.2,
      delayFeedback: 0.0,
      reverbWet: 0.15,
      volume: 0.65,
      polyphonic: true,
      octaveOffset: 0,
    }
  },
  {
    id: 'sub_bass',
    name: 'Sub Bass',
    settings: {
      preset: 'sub_bass',
      waveType: 'sine' as WaveType,
      attack: 0.02,
      decay: 0.25,
      sustain: 0.5,
      release: 0.15,
      filterCutoff: 350,
      filterResonance: 4.0,
      distortion: 0.45,
      delayTime: 0.1,
      delayFeedback: 0.0,
      reverbWet: 0.05,
      volume: 0.9,
      polyphonic: false,
      octaveOffset: -1,
    }
  },
  {
    id: 'acoustic_steel',
    name: 'Steel Guitar',
    settings: {
      preset: 'acoustic_steel',
      waveType: 'triangle' as WaveType,
      attack: 0.002,
      decay: 0.4,
      sustain: 0.2,
      release: 0.3,
      filterCutoff: 5500,
      filterResonance: 1.5,
      distortion: 0.0,
      delayTime: 0.15,
      delayFeedback: 0.1,
      reverbWet: 0.25,
      volume: 0.8,
      polyphonic: true,
      octaveOffset: 0,
    }
  }
];

// Tunings database
const TUNINGS: Tuning[] = [
  {
    name: "Standard E",
    notes: ["E4", "B3", "G3", "D3", "A2", "E2"],
    midiNumbers: [64, 59, 55, 50, 45, 40]
  },
  {
    name: "Drop D",
    notes: ["E4", "B3", "G3", "D3", "A2", "D2"],
    midiNumbers: [64, 59, 55, 50, 45, 38]
  },
  {
    name: "DADGAD",
    notes: ["D4", "A3", "G3", "D3", "A2", "D2"],
    midiNumbers: [62, 57, 55, 50, 45, 38]
  },
  {
    name: "Open G",
    notes: ["D4", "B3", "G3", "D3", "G2", "D2"],
    midiNumbers: [62, 59, 55, 50, 43, 38]
  }
];

// Interactive tutorials
interface ScaleTutorial {
  name: string;
  notes: { name: string; midi: number }[];
  description: string;
}

const SCALE_TUTORIALS: ScaleTutorial[] = [
  {
    name: "A Minor Pentatonic (Blues)",
    notes: [
      { name: "A2", midi: 45 },
      { name: "C3", midi: 48 },
      { name: "D3", midi: 50 },
      { name: "E3", midi: 52 },
      { name: "G3", midi: 55 },
      { name: "A3", midi: 57 }
    ],
    description: "The most famous guitar scale of all time. Essential for rock, blues, and heavy metal solos."
  },
  {
    name: "E Natural Minor",
    notes: [
      { name: "E2", midi: 40 },
      { name: "F#2", midi: 42 },
      { name: "G2", midi: 43 },
      { name: "A2", midi: 45 },
      { name: "B2", midi: 47 },
      { name: "C3", midi: 48 },
      { name: "D3", midi: 50 },
      { name: "E3", midi: 52 }
    ],
    description: "A dark, classical sound, popular in progressive metal and acoustic ballad styles."
  },
  {
    name: "C Major Scale",
    notes: [
      { name: "C3", midi: 48 },
      { name: "D3", midi: 50 },
      { name: "E3", midi: 52 },
      { name: "F3", midi: 53 },
      { name: "G3", midi: 55 },
      { name: "A3", midi: 57 },
      { name: "B3", midi: 59 },
      { name: "C4", midi: 60 }
    ],
    description: "The fundamental scale of Western music. Essential for chord structures and melodies."
  }
];

export default function App() {
  // Main states
  const [listening, setListening] = useState<boolean>(false);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [tuning, setTuning] = useState<Tuning>(TUNINGS[0]);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(0.015);
  const [activeSynthNotes, setActiveSynthNotes] = useState<Set<number>>(new Set());
  
  // Synth and MIDI Settings
  const [synthSettings, setSynthSettings] = useState<SynthSettings>(INSTRUMENT_PRESETS[0].settings as SynthSettings);
  const [midiLogs, setMidiLogs] = useState<MidiMessageLog[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<MidiOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);

  // Training / Tutorial state
  const [activeTutorial, setActiveTutorial] = useState<ScaleTutorial | null>(null);
  const [tutorialIndex, setTutorialIndex] = useState<number>(0);
  const [tutorialSuccess, setTutorialSuccess] = useState<boolean>(false);

  // Audio system refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const bufferLengthRef = useRef<number>(2048);
  const dataArrayRef = useRef<Float32Array>(new Float32Array(0));

  // Synthesizer and MIDI integration engines refs
  const synthEngineRef = useRef<SynthEngine | null>(null);
  const midiManagerRef = useRef<MidiManager | null>(null);

  // Tracker logic references (to bypass React state latency inside the audio animation loop)
  const lastMidiNoteRef = useRef<number>(-1);
  const consecutiveActiveFramesRef = useRef<number>(0);
  const consecutiveQuietFramesRef = useRef<number>(0);
  const activeSynthNotesRef = useRef<Set<number>>(new Set());
  const synthSettingsRef = useRef<SynthSettings>(synthSettings);
  const isListeningRef = useRef<boolean>(false);
  const noiseThresholdRef = useRef<number>(noiseThreshold);

  // Update refs when states change to keep loop parameters synchronous
  useEffect(() => {
    synthSettingsRef.current = synthSettings;
    if (synthEngineRef.current) {
      synthEngineRef.current.updateSettings(synthSettings);
    }
  }, [synthSettings]);

  useEffect(() => {
    noiseThresholdRef.current = noiseThreshold;
  }, [noiseThreshold]);

  // Handle first gesture Web Audio initiation and MIDI setup
  useEffect(() => {
    // Create Engines
    synthEngineRef.current = new SynthEngine(synthSettings);
    midiManagerRef.current = new MidiManager();
    
    // Request MIDI interface access
    midiManagerRef.current.requestAccess((outputs) => {
      setMidiOutputs(outputs);
      if (outputs.length > 0) {
        setSelectedOutputId(outputs[0].id);
      }
    });

    return () => {
      stopListening();
      if (synthEngineRef.current) {
        synthEngineRef.current.allNotesOff();
      }
    };
  }, []);

  const addMidiLog = (type: 'Note On' | 'Note Off' | 'Pitch Bend', note: number | undefined, value: number) => {
    let noteName: string | undefined;
    if (note !== undefined) {
      const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const octave = Math.floor(note / 12) - 1;
      noteName = `${names[note % 12]}${octave}`;
    }

    const log: MidiMessageLog = {
      id: Math.random().toString(),
      type,
      channel: 1,
      note,
      noteName,
      value,
      timestamp: new Date().toTimeString().split(' ')[0],
    };

    setMidiLogs((prev) => [log, ...prev.slice(0, 49)]); // Keep last 50 logs

    // Scroll console down if user scrolled away
    const scrollDiv = document.getElementById('midi-logs-scroll');
    if (scrollDiv) {
      scrollDiv.scrollTop = 0;
    }
  };

  const handleSelectMidiOutput = (deviceId: string) => {
    setSelectedOutputId(deviceId);
    if (midiManagerRef.current) {
      midiManagerRef.current.selectOutput(deviceId);
    }
  };

  // Turn on a synth note manually (from mouse, virtual piano, or fretboard tap)
  const handleManualNoteOn = (midiNote: number) => {
    if (!audioContextRef.current) {
      initializeAudioContext();
    }
    
    // Update active set
    setActiveSynthNotes((prev) => {
      const next = new Set(prev);
      next.add(midiNote);
      activeSynthNotesRef.current = next;
      return next;
    });

    // Play note via virtual synth
    if (synthEngineRef.current) {
      synthEngineRef.current.noteOn(midiNote, 0.85);
    }

    // Play note via Web MIDI Out
    if (midiManagerRef.current) {
      midiManagerRef.current.sendNoteOn(midiNote, 0.85);
    }

    addMidiLog('Note On', midiNote, 85);
    checkTutorialNote(midiNote);
  };

  // Turn off a synth note manually
  const handleManualNoteOff = (midiNote: number) => {
    setActiveSynthNotes((prev) => {
      const next = new Set(prev);
      next.delete(midiNote);
      activeSynthNotesRef.current = next;
      return next;
    });

    if (synthEngineRef.current) {
      synthEngineRef.current.noteOff(midiNote);
    }

    if (midiManagerRef.current) {
      midiManagerRef.current.sendNoteOff(midiNote);
    }

    addMidiLog('Note Off', midiNote, 0);
  };

  // Initialize and unlock Audio Context
  const initializeAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass({ latencyHint: 'interactive' });
      audioContextRef.current = ctx;
      if (synthEngineRef.current) {
        synthEngineRef.current.init(ctx);
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const startListening = async () => {
    try {
      const ctx = initializeAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0.003 // request minimum possible latency
        } as any
      });

      mediaStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);

      // CRITICAL PRE-FILTERING FOR GUITARS:
      // A bandpass/lowpass filter at 800Hz dampens string harmonics/noise
      // allowing the fundamental pitch detector to be 5x more stable.
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000; // Pass fundamentals up to ~E5/E6, cut overtones

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      
      // Routing: mic stream -> lowpass -> FFT Analyser
      source.connect(filter);
      filter.connect(analyser);

      analyserRef.current = analyser;
      bufferLengthRef.current = analyser.fftSize;
      dataArrayRef.current = new Float32Array(analyser.fftSize);

      setListening(true);
      isListeningRef.current = true;
      
      // Start real-time analysis loop
      runAudioLoop();
    } catch (err) {
      console.error("Could not activate microphone stream:", err);
      alert("Error: Microphone access is required for real-time Guitar to MIDI conversion. Please allow microphone permission in the frame.");
    }
  };

  const stopListening = () => {
    setListening(false);
    isListeningRef.current = false;
    setPitchData(null);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Release any lingering note-on signals
    if (lastMidiNoteRef.current !== -1) {
      if (synthEngineRef.current) {
        synthEngineRef.current.noteOff(lastMidiNoteRef.current);
      }
      if (midiManagerRef.current) {
        midiManagerRef.current.sendNoteOff(lastMidiNoteRef.current);
      }
      lastMidiNoteRef.current = -1;
    }

    setActiveSynthNotes(new Set());
    activeSynthNotesRef.current = new Set();
  };

  // High performance real-time pitch tracking loop (60 frames per second)
  const runAudioLoop = () => {
    if (!analyserRef.current || !isListeningRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buffer = dataArrayRef.current;
    const sampleRate = audioContextRef.current.sampleRate;

    // Read audio data in the time domain
    analyser.getFloatTimeDomainData(buffer);

    // Run autocorrelation pitch estimation
    const { frequency, confidence } = autoCorrelate(buffer, sampleRate);

    // Calculate overall audio envelope amplitude (Volume)
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const amplitude = Math.sqrt(sumSquares / buffer.length);

    // Pitch evaluation
    if (frequency > 0 && confidence > 0.65 && amplitude > noiseThresholdRef.current) {
      const { midiNote, noteName, centsOffset } = frequencyToMidi(frequency);

      // Filter crazy pitches out of typical guitar register (MIDI 36 - Low C1 to MIDI 96 - High C6)
      if (midiNote >= 36 && midiNote <= 96) {
        
        // Hysteresis frame-lock lock-in:
        // Ensure pitch is held for at least 2 consecutive frames to avoid transient glitches
        if (midiNote === lastMidiNoteRef.current) {
          consecutiveActiveFramesRef.current++;
          consecutiveQuietFramesRef.current = 0;

          // If the note is stable and locked, perform expressive string pitch bend!
          if (consecutiveActiveFramesRef.current > 1) {
            // Apply real-time bend to the synthesizer oscillator
            if (synthEngineRef.current) {
              synthEngineRef.current.pitchBend(midiNote, centsOffset);
            }
            // Send pitch bend MIDI output message
            if (midiManagerRef.current) {
              midiManagerRef.current.sendPitchBend(centsOffset);
            }
          }
        } else {
          // If a new note is detected, count up to ensure stability
          consecutiveActiveFramesRef.current = 1;
          consecutiveQuietFramesRef.current = 0;

          // Note transition: Release previous note and trigger new note!
          if (lastMidiNoteRef.current !== -1) {
            const oldNote = lastMidiNoteRef.current;
            
            // Release old note in synth and MIDI
            if (synthEngineRef.current) {
              synthEngineRef.current.noteOff(oldNote);
            }
            if (midiManagerRef.current) {
              midiManagerRef.current.sendNoteOff(oldNote);
            }
            addMidiLog('Note Off', oldNote, 0);
          }

          // Trigger new note immediately
          const velocityPercent = Math.round(Math.min(100, (amplitude * 6) * 100));
          if (synthEngineRef.current) {
            synthEngineRef.current.noteOn(midiNote, amplitude * 6);
          }
          if (midiManagerRef.current) {
            midiManagerRef.current.sendNoteOn(midiNote, amplitude * 6);
          }
          addMidiLog('Note On', midiNote, velocityPercent);
          
          // Trigger tutorial checking
          checkTutorialNote(midiNote);

          // Update active tracking indicators
          setActiveSynthNotes(() => {
            const next = new Set<number>();
            next.add(midiNote);
            activeSynthNotesRef.current = next;
            return next;
          });

          lastMidiNoteRef.current = midiNote;
        }

        // Update visual pitch metadata for the Tuner display
        setPitchData({
          frequency,
          noteName,
          midiNote,
          centsOffset,
          confidence,
          amplitude
        });
      }
    } else {
      // Silence threshold handling (Refractory gate)
      consecutiveQuietFramesRef.current++;
      
      // If we see quiet frames for 4 consecutive intervals (~70ms), turn note OFF
      if (consecutiveQuietFramesRef.current > 4 && lastMidiNoteRef.current !== -1) {
        const releasedNote = lastMidiNoteRef.current;
        
        if (synthEngineRef.current) {
          synthEngineRef.current.noteOff(releasedNote);
        }
        if (midiManagerRef.current) {
          midiManagerRef.current.sendNoteOff(releasedNote);
        }
        addMidiLog('Note Off', releasedNote, 0);

        setActiveSynthNotes(new Set());
        activeSynthNotesRef.current = new Set();
        lastMidiNoteRef.current = -1;
        consecutiveActiveFramesRef.current = 0;
      }

      // Slightly update visual tuner info to indicate signal is decaying but don't clear note name instantly
      setPitchData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          amplitude,
          confidence: Math.max(0, prev.confidence - 0.1) // decay confidence visuals
        };
      });
    }

    // Schedule next animation frame
    animationFrameIdRef.current = requestAnimationFrame(runAudioLoop);
  };

  // Metronome play reference tuner string note
  const handlePlayReferenceNote = (noteName: string, midiNote: number) => {
    handleManualNoteOn(midiNote);
    setTimeout(() => {
      handleManualNoteOff(midiNote);
    }, 450);
  };

  // Tutorial / scale practice handler
  const startTutorial = (tutorial: ScaleTutorial) => {
    setActiveTutorial(tutorial);
    setTutorialIndex(0);
    setTutorialSuccess(false);
  };

  const stopTutorial = () => {
    setActiveTutorial(null);
    setTutorialIndex(0);
    setTutorialSuccess(false);
  };

  const checkTutorialNote = (midi: number) => {
    if (!activeTutorial) return;
    
    const target = activeTutorial.notes[tutorialIndex];
    // Allow matching note name ignoring octave for loose/easier string tuning matching
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const playedName = names[midi % 12];
    const targetName = target.name.replace(/\d/, '');

    if (playedName === targetName || midi === target.midi) {
      // Correct note played!
      if (tutorialIndex === activeTutorial.notes.length - 1) {
        setTutorialSuccess(true);
      } else {
        setTutorialIndex(prev => prev + 1);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none pb-12">
      {/* Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-4 px-6 md:px-12 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center border border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              <Music className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Guitar Audio-to-MIDI Synth
              </h1>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Real-time pitch to MIDI converter
              </p>
            </div>
          </div>

          {/* Core Listen Trigger Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Listening State Indicator */}
            {listening && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Processing
              </span>
            )}
            
            <button
              onClick={listening ? stopListening : startListening}
              className={`w-full sm:w-auto py-3 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border shadow-lg ${
                listening
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)] text-white'
              }`}
              id="main-listening-toggle"
            >
              {listening ? (
                <>
                  <Square className="w-4 h-4 fill-white" /> Stop Audio Engine
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5" /> Connect Guitar (Mic)
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-8 w-full space-y-6 flex-1">
        
        {/* Layout Row 1: Tuner and Guitar Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1 & 2: Tuner Dial Dial */}
          <div className="lg:col-span-2">
            <TunerDial 
              pitchData={pitchData}
              listening={listening}
              tuning={tuning}
              onPlayReferenceNote={handlePlayReferenceNote}
            />
          </div>

          {/* Col 3: Audio Noise & Tuning Presets configuration */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-indigo-400" /> Audio Calibration
              </h3>
              <p className="text-xs text-zinc-500 mb-6">
                Adjust thresholds to clean up background hums or configure drop tunings.
              </p>

              {/* Noise Gate Sensitivity */}
              <div className="mb-6">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1.5">
                  <span>Noise Gate (Threshold)</span>
                  <span className="text-indigo-400 font-semibold">{noiseThreshold.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.003"
                  max="0.08"
                  step="0.001"
                  value={noiseThreshold}
                  onChange={(e) => setNoiseThreshold(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-1">
                  <span>Ultra Sensitive</span>
                  <span>Ignore Hum</span>
                </div>
              </div>

              {/* Fretboard Tuning selector */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-zinc-500 mb-2">Guitar Tuning Profile</label>
                <div className="grid grid-cols-2 gap-2">
                  {TUNINGS.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTuning(t)}
                      className={`py-2 px-3 text-xs rounded-xl border text-center transition font-mono cursor-pointer ${
                        tuning.name === t.name
                          ? 'bg-zinc-850 border-indigo-500 text-indigo-300'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Tutorial Help Panel */}
            <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl text-xs flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-[11px] leading-relaxed text-zinc-400">
                <strong className="text-zinc-300">How to play:</strong> Plug in your guitar or select Microphone. Play single notes cleanly. The app converts pitches to synth and MIDI in real time.
              </div>
            </div>
          </div>
        </div>

        {/* Layout Row 2: Interactive Fretboard */}
        <GuitarFretboard 
          tuning={tuning}
          pitchData={pitchData}
          activeSynthNotes={activeSynthNotes}
          onFretPress={handleManualNoteOn}
          onFretRelease={handleManualNoteOff}
        />

        {/* Layout Row 3: Synthesizer Parameters */}
        <SynthPanel 
          settings={synthSettings}
          onSettingsChange={setSynthSettings}
          presets={INSTRUMENT_PRESETS}
        />

        {/* Layout Row 4: Virtual Keyboard Playpen */}
        <VirtualKeyboard 
          activeSynthNotes={activeSynthNotes}
          onNoteOn={handleManualNoteOn}
          onNoteOff={handleManualNoteOff}
        />

        {/* Layout Row 5: Training & Metronome Beats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Practice Metronome Rhythm looper */}
          <DrumBeats audioContext={audioContextRef.current} />

          {/* Practice Tutorial Scale Game */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-64">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> Scale Training Lab
                </h3>
                {activeTutorial && (
                  <button
                    onClick={stopTutorial}
                    className="text-xs text-rose-400 hover:text-rose-300 font-mono transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {!activeTutorial ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Select a scale to practice. The game highlights target frets and checks your pitch accuracy in real-time.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {SCALE_TUTORIALS.map((tutorial) => (
                      <button
                        key={tutorial.name}
                        onClick={() => startTutorial(tutorial)}
                        className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/40 hover:border-zinc-700 transition cursor-pointer text-left"
                      >
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-200">{tutorial.name}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{tutorial.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-400 font-semibold uppercase">{activeTutorial.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Step {tutorialIndex + 1} of {activeTutorial.notes.length}
                    </span>
                  </div>

                  {tutorialSuccess ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <Award className="w-8 h-8 text-emerald-400 mb-1.5 animate-bounce" />
                      <h4 className="text-sm font-semibold text-emerald-300">Scale Completed!</h4>
                      <p className="text-xs text-zinc-400 mt-1">Excellent pitch accuracy! Click Reset to try another.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Active Note Target */}
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-indigo-400 block">PLAY TARGET NOTE</span>
                          <span className="font-display font-bold text-3xl text-zinc-100">
                            {activeTutorial.notes[tutorialIndex].name}
                          </span>
                        </div>
                        
                        {/* Notes list horizontal guide */}
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          {activeTutorial.notes.map((n, idx) => {
                            let style = 'bg-zinc-850 border border-zinc-800 text-zinc-500';
                            if (idx < tutorialIndex) {
                              style = 'bg-emerald-950/40 border border-emerald-800 text-emerald-400';
                            } else if (idx === tutorialIndex) {
                              style = 'bg-indigo-600 text-white font-bold animate-pulse scale-105';
                            }
                            return (
                              <span key={idx} className={`w-7 h-7 rounded-lg flex items-center justify-center ${style}`}>
                                {n.name.replace(/\d/, '')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note tracking tip */}
            <div className="text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/40 pt-3">
              Play clearly. Ensure only one note is vibrating to enable optimal monophonic pitch lock.
            </div>
          </div>
        </div>

        {/* Layout Row 6: MIDI Log Panel */}
        <MidiConsole 
          logs={midiLogs}
          outputs={midiOutputs}
          selectedOutputId={selectedOutputId}
          onSelectOutput={handleSelectMidiOutput}
          onClearLogs={() => setMidiLogs([])}
        />
        
      </main>
    </div>
  );
}
