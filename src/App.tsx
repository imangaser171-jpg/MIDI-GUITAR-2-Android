import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Mic,
  MicOff,
  HelpCircle,
  Guitar,
  Heart
} from 'lucide-react';

import { PitchData, ActiveNote, MidiLogMessage, SynthSettings } from './types';
import { PolySynth } from './utils/synthEngine';
import { MidiManager } from './utils/midiManager';
import { autoCorrelate, midiToFrequency, detectMultiplePitches } from './utils/pitchDetector';

import { TunerDial } from './components/TunerDial';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { SynthPanel } from './components/SynthPanel';
import { MidiConsole } from './components/MidiConsole';
import { DrumBeats } from './components/DrumBeats';

const DEFAULT_SETTINGS: SynthSettings = {
  oscType: 'sawtooth',
  cutoff: 3000,
  Q: 2.0,
  attack: 0.005,
  decay: 0.15,
  sustain: 0.6,
  release: 0.1,
  volume: 0.5,
  glide: 0.0,
  latencyLevel: 'ultra-low',
  audioPolyphonyEnabled: true,
  audioPolyphonyDecay: 0.8,
  delayEnabled: false,
  delayTime: 0.25,
  delayFeedback: 0.3,
  delayWet: 0.15,
  noiseGate: -35,
  echoCancellation: true,
  noiseSuppression: true
};

export default function App() {
  const [micConnected, setMicConnected] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);
  const [logs, setLogs] = useState<MidiLogMessage[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<any[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');
  const [synthSettings, setSynthSettings] = useState<SynthSettings>(DEFAULT_SETTINGS);
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Synth & MIDI engine refs (lazy-loaded or instantiated on mount)
  const synthRef = useRef<PolySynth>(new PolySynth(DEFAULT_SETTINGS));
  const midiManagerRef = useRef<MidiManager | null>(null);
  const currentAudioNoteRef = useRef<number | null>(null);
  const activeAudioNotesRef = useRef<Map<number, { lastSeen: number; startTime: number; frequency: number }>>(new Map());

  // Reset audio polyphony tracking when mode changes
  useEffect(() => {
    if (!synthSettings.audioPolyphonyEnabled) {
      activeAudioNotesRef.current.forEach((_, activeNote) => {
        synthRef.current.noteOff(activeNote);
        midiManagerRef.current?.sendNoteOff(activeNote);
      });
      activeAudioNotesRef.current.clear();
      setActiveNotes((prev) => prev.filter((n) => n.source !== 'audio'));
    }
  }, [synthSettings.audioPolyphonyEnabled]);

  // Load initial device list and watch for plug/unplug changes (e.g. Guitar Link)
  useEffect(() => {
    const queryDevices = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('navigator.mediaDevices is not supported in this browser environment');
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
      } catch (e) {
        console.error('Initial device query failed:', e);
      }
    };
    queryDevices();
    
    // Listen for device changes (e.g. plugging/unplugging USB audio interface)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', queryDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', queryDevices);
      };
    }
    return;
  }, []);

  // Initialize MIDI and custom synthesizers
  useEffect(() => {
    // Instantiate MIDI manager
    midiManagerRef.current = new MidiManager();
    
    // Wire logs
    midiManagerRef.current.registerLogCallback((msg) => {
      setLogs((prev) => [...prev, msg].slice(-100));
    });

    // Populate MIDI outputs
    const timer = setTimeout(() => {
      if (midiManagerRef.current) {
        const outs = midiManagerRef.current.getOutputs();
        setMidiOutputs(outs);
        if (outs.length > 0) {
          setSelectedOutputId(outs[0].id);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      synthRef.current.panic();
      if (midiManagerRef.current) {
        midiManagerRef.current.clearAll();
      }
    };
  }, []);

  // Track Synth Settings
  useEffect(() => {
    synthRef.current.updateSettings(synthSettings);
  }, [synthSettings]);

  // Automatically hot-restart mic streaming when Latency or Feedback settings are changed
  useEffect(() => {
    if (micConnected) {
      startMicCapture(selectedDeviceId);
    }
  }, [synthSettings.latencyLevel, synthSettings.echoCancellation, synthSettings.noiseSuppression]);

  // Audio Input Capture Loop
  const startMicCapture = async (deviceIdToUse?: string) => {
    const activeDeviceId = deviceIdToUse || selectedDeviceId;
    try {
      // Resume or create audio context with explicit low latency hint
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtxClass({
          latencyHint: 'interactive'
        });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Sync active audio engines
      synthRef.current.resumeContext();

      // Clean up previous stream if any
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio input capturing (getUserMedia) is not supported or accessible in this browser/environment. Please make sure you are using HTTPS and that browser permissions are granted.');
      }

      // Access stream with requested device ID constraints if specified
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: synthSettings.echoCancellation !== false,
          noiseSuppression: synthSettings.noiseSuppression !== false,
          autoGainControl: false,
          ...(activeDeviceId ? { deviceId: { exact: activeDeviceId } } : {}),
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      micStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      
      // Determine FFT Size (buffer window) dynamically based on selected latencyLevel
      let fftSize = 2048;
      if (synthSettings.latencyLevel === 'ultra-low') {
        fftSize = 512;  // Ultra snappy tracking with a tiny buffer window for Android 15
      } else if (synthSettings.latencyLevel === 'low') {
        fftSize = 1024; // Extremely snappy tracking for standard Android
      } else if (synthSettings.latencyLevel === 'high') {
        fftSize = 4096; // Ultimate frequency resolution for deep bass strings
      }
      analyser.fftSize = fftSize;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicConnected(true);

      // Now that permission is granted, enumerate devices to get the actual names/labels
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((device) => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        
        // Sync selected device state if it's currently empty
        if (!selectedDeviceId && audioInputs.length > 0) {
          const activeTrack = stream.getAudioTracks()[0];
          const activeLabel = activeTrack?.label;
          const matchingDevice = audioInputs.find(d => d.label === activeLabel);
          if (matchingDevice) {
            setSelectedDeviceId(matchingDevice.deviceId);
          } else {
            setSelectedDeviceId(audioInputs[0].deviceId);
          }
        }
      } catch (e) {
        console.error('Error enumerating devices after access:', e);
      }

      const buffer = new Float32Array(analyser.fftSize);
      const historyBuffer = new Float32Array(2048);
      const freqBuffer = new Float32Array(analyser.frequencyBinCount);

      // Pitch detection animation frame loop
      const detectLoop = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getFloatTimeDomainData(buffer);
        
        // Slide history buffer and copy new samples from `buffer`
        if (buffer.length >= historyBuffer.length) {
          historyBuffer.set(buffer.subarray(buffer.length - historyBuffer.length));
        } else {
          historyBuffer.set(historyBuffer.subarray(buffer.length), 0);
          historyBuffer.set(buffer, historyBuffer.length - buffer.length);
        }
        
        // 1. Calculate buffer signal power (dB) to detect silence / hand-mute instantly on latest input
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          sumSquares += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sumSquares / buffer.length);
        const db = 20 * Math.log10(rms || 1e-5);
        const gateThreshold = synthSettings.noiseGate !== undefined ? synthSettings.noiseGate : -35;

        // If the signal is too quiet (below the user's noise gate threshold), mute instantly
        if (db < gateThreshold) {
          setPitchData(null);
          
          if (synthSettings.audioPolyphonyEnabled) {
            activeAudioNotesRef.current.forEach((_, activeNote) => {
              synthRef.current.noteOff(activeNote);
              midiManagerRef.current?.sendNoteOff(activeNote);
            });
            activeAudioNotesRef.current.clear();
            setActiveNotes((prev) => prev.filter((n) => n.source !== 'audio'));
          } else {
            if (currentAudioNoteRef.current !== null) {
              synthRef.current.noteOff(currentAudioNoteRef.current);
              midiManagerRef.current?.sendNoteOff(currentAudioNoteRef.current);
              setActiveNotes((prev) => prev.filter((n) => n.source !== 'audio'));
              currentAudioNoteRef.current = null;
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(detectLoop);
          return;
        }
        
        if (synthSettings.audioPolyphonyEnabled) {
          // --- Poly-Strum String Resonance Mode (FFT Peak & Harmonic Elimination) ---
          analyserRef.current.getFloatFrequencyData(freqBuffer);
          const polyResults = detectMultiplePitches(
            freqBuffer,
            audioContextRef.current!.sampleRate,
            gateThreshold,
            6
          );

          const detectedMidiNotes = new Set(polyResults.map(p => p.midiNote));

          // Trigger new notes and update active notes pitch bends
          polyResults.forEach((result) => {
            const note = result.midiNote;
            if (!activeAudioNotesRef.current.has(note)) {
              // Cap at 6 active voices (matching 6 guitar strings) to avoid overlap mud
              if (activeAudioNotesRef.current.size >= 6) {
                let oldestNote = -1;
                let oldestTime = Infinity;
                activeAudioNotesRef.current.forEach((data, n) => {
                  if (data.startTime < oldestTime) {
                    oldestTime = data.startTime;
                    oldestNote = n;
                  }
                });
                if (oldestNote !== -1) {
                  synthRef.current.noteOff(oldestNote);
                  midiManagerRef.current?.sendNoteOff(oldestNote);
                  activeAudioNotesRef.current.delete(oldestNote);
                }
              }

              synthRef.current.noteOn(note, 100);
              midiManagerRef.current?.sendNoteOn(note, 100);
              activeAudioNotesRef.current.set(note, {
                lastSeen: Date.now(),
                startTime: Date.now(),
                frequency: result.frequency,
              });
            } else {
              // Note is already active, keep it ringing and apply microtonal pitch bends
              const existing = activeAudioNotesRef.current.get(note)!;
              existing.lastSeen = Date.now();
              synthRef.current.updateVoicePitch(note, result.centsDeviation);
            }
          });

          // Show the loudest detected note in the TunerDial
          if (polyResults.length > 0) {
            const loudest = [...polyResults].sort((a, b) => b.db - a.db)[0];
            setPitchData(loudest);
          } else {
            setPitchData(null);
          }

          // Scan and turn off notes that have exceeded the decay time or are no longer playing
          const nowMs = Date.now();
          const decayMs = (synthSettings.audioPolyphonyDecay || 1.5) * 1000;
          activeAudioNotesRef.current.forEach((data, activeNote) => {
            const isStillDetected = detectedMidiNotes.has(activeNote);
            if (isStillDetected) {
              data.lastSeen = nowMs;
            } else if (nowMs - data.lastSeen > Math.min(250, decayMs)) {
              // Debounce tracking dropouts with a 250ms grace-period
              synthRef.current.noteOff(activeNote);
              midiManagerRef.current?.sendNoteOff(activeNote);
              activeAudioNotesRef.current.delete(activeNote);
            }
          });

          // Sync activeNotes React state for fretboard/keyboard visualization
          const currentList: ActiveNote[] = [];
          activeAudioNotesRef.current.forEach((data, activeNote) => {
            currentList.push({
              note: activeNote,
              frequency: data.frequency,
              startTime: data.startTime,
              source: 'audio',
            });
          });
          setActiveNotes((prev) => [
            ...prev.filter((n) => n.source !== 'audio'),
            ...currentList,
          ]);

        } else {
          // --- Standard Monophonic Mode (Autocorrelation) ---
          const clarityThreshold = 
            synthSettings.latencyLevel === 'ultra-low' ? 0.82 :
            synthSettings.latencyLevel === 'low' ? 0.85 : 
            synthSettings.latencyLevel === 'high' ? 0.92 : 0.9;
          
          const result = autoCorrelate(historyBuffer, audioContextRef.current!.sampleRate, -100, clarityThreshold);
          const isPitchValid = result && result.midiNote >= 24 && result.midiNote <= 96;

          if (isPitchValid && result) {
            setPitchData(result);
            const note = result.midiNote;

            if (currentAudioNoteRef.current !== note) {
              const oldNote = currentAudioNoteRef.current;
              if (synthSettings.glide > 0 && oldNote !== null && synthRef.current.hasVoice(oldNote)) {
                // Smooth Glide / Portamento transition
                synthRef.current.glideVoice(oldNote, note, synthSettings.glide);
                synthRef.current.renameVoice(oldNote, note);
                midiManagerRef.current?.sendPitchBend(0);
                midiManagerRef.current?.sendNoteOff(oldNote);
                midiManagerRef.current?.sendNoteOn(note, 100);

                setActiveNotes((prev) => [
                  ...prev.filter((n) => n.source !== 'audio'),
                  {
                    note,
                    frequency: result.frequency,
                    startTime: Date.now(),
                    source: 'audio',
                  },
                ]);
                currentAudioNoteRef.current = note;
              } else {
                // Standard hard strike cutoff
                if (oldNote !== null) {
                  synthRef.current.noteOff(oldNote);
                  midiManagerRef.current?.sendNoteOff(oldNote);
                }
                synthRef.current.noteOn(note, 100);
                midiManagerRef.current?.sendNoteOn(note, 100);
                setActiveNotes((prev) => [
                  ...prev.filter((n) => n.source !== 'audio'),
                  {
                    note,
                    frequency: result.frequency,
                    startTime: Date.now(),
                    source: 'audio',
                  },
                ]);
                currentAudioNoteRef.current = note;
              }
            } else {
              // Fine tuning/vibrato expression updates
              midiManagerRef.current?.sendPitchBend(result.centsDeviation);
              synthRef.current.updateVoicePitch(note, result.centsDeviation);
            }
          } else {
            setPitchData(null);
            if (currentAudioNoteRef.current !== null) {
              synthRef.current.noteOff(currentAudioNoteRef.current);
              midiManagerRef.current?.sendNoteOff(currentAudioNoteRef.current);
              setActiveNotes((prev) => prev.filter((n) => n.source !== 'audio'));
              currentAudioNoteRef.current = null;
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectLoop);
      };

      // Start loop
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    } catch (err) {
      console.error('Failed to get mic stream:', err);
      alert('Failed to connect microphone/instrument. Please check browser permissions and verify that your audio interface is plugged in.');
    }
  };

  const stopMicCapture = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    analyserRef.current = null;
    setMicConnected(false);
    setPitchData(null);

    // Release any lingering audio notes
    if (currentAudioNoteRef.current !== null) {
      synthRef.current.noteOff(currentAudioNoteRef.current);
      midiManagerRef.current?.sendNoteOff(currentAudioNoteRef.current);
      currentAudioNoteRef.current = null;
    }

    activeAudioNotesRef.current.forEach((_, activeNote) => {
      synthRef.current.noteOff(activeNote);
      midiManagerRef.current?.sendNoteOff(activeNote);
    });
    activeAudioNotesRef.current.clear();

    setActiveNotes((prev) => prev.filter((n) => n.source !== 'audio'));
  };

  const toggleMic = () => {
    if (micConnected) {
      stopMicCapture();
    } else {
      startMicCapture();
    }
  };

  // Keyboard/Fretboard manual trigger notes
  const handleNoteOn = (note: number, velocity = 100) => {
    synthRef.current.resumeContext();
    synthRef.current.noteOn(note, velocity);
    midiManagerRef.current?.sendNoteOn(note, velocity);

    setActiveNotes((prev) => [
      ...prev.filter((n) => n.note !== note),
      {
        note,
        frequency: midiToFrequency(note),
        startTime: Date.now(),
        source: 'keyboard',
      },
    ]);
  };

  const handleNoteOff = (note: number) => {
    synthRef.current.noteOff(note);
    midiManagerRef.current?.sendNoteOff(note);
    setActiveNotes((prev) => prev.filter((n) => n.note !== note));
  };

  // Reference note trigger helper
  const playReferenceNote = (note: number) => {
    synthRef.current.resumeContext();
    synthRef.current.noteOn(note, 100);
    setTimeout(() => {
      synthRef.current.noteOff(note);
    }, 1200);
  };

  // Select alternative MIDI output hardware ports
  const handleSelectOutput = (id: string) => {
    setSelectedOutputId(id);
    midiManagerRef.current?.selectOutput(id);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Header bar */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Guitar className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              HexaMIDI Studio
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest font-normal">
                v2.1
              </span>
            </h1>
            <p className="text-xs text-neutral-500 font-medium">Guitar Audio-to-MIDI Interface & Tuner</p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Audio Input Device Selector */}
          {audioDevices.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                id="audio-input-select"
                value={selectedDeviceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDeviceId(newId);
                  if (micConnected) {
                    // Hot-restart input streaming with the newly selected device
                    startMicCapture(newId);
                  }
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none max-w-[200px] sm:max-w-[260px] truncate font-medium cursor-pointer transition hover:border-neutral-700"
                title="Select Audio Input Device (e.g. Guitar Link, USB Microphone, Built-in Mic)"
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Audio Input (${device.deviceId.slice(0, 5)}...)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mic Connection Button */}
          <button
            id="mic-toggle-btn"
            onClick={toggleMic}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer shadow-md ${
              micConnected
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.25)]'
            }`}
          >
            {micConnected ? (
              <>
                <MicOff className="w-4 h-4" />
                Disconnect Audio Input
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 animate-bounce" />
                Connect Guitar Mic
              </>
            )}
          </button>

          {/* Quick Info/Help Button */}
          <button
            id="tutorial-toggle-btn"
            onClick={() => setShowTutorial(!showTutorial)}
            className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-700 transition"
            title="Toggle Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Responsive Info/Tutorial Board */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:col-span-12 overflow-hidden"
            >
              <div id="tutorial-alert" className="bg-gradient-to-r from-indigo-950/30 via-neutral-900 to-rose-950/10 border border-indigo-900/40 rounded-2xl p-5 flex gap-4 relative">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-200">Welcome Back to your Guitar MIDI Studio!</h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-4xl leading-relaxed">
                    This advanced workstation converts audio frequency signals from your physical guitar into direct MIDI messages. Plug in your instrument, connect your microphone, and play. The DSP module tracks pitch, calculates deviation for fine-tuning, translates strings to actual guitar frets, triggers our high-fidelity polyphonic synthesizer, and streams output events to external hardware or DAW software.
                  </p>
                  <div className="flex gap-4 mt-3 text-[11px] font-semibold text-indigo-300">
                    <span className="flex items-center gap-1">⚡ Autocorrelation Pitch Solver</span>
                    <span className="flex items-center gap-1">🎵 Standard Web MIDI Port Output</span>
                    <span className="flex items-center gap-1">🥁 Integrated Drum Practice Station</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="absolute top-4 right-4 text-xs text-neutral-500 hover:text-white"
                >
                  ✕ Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Column: Tuner and Drum Machine loops */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1">
            <TunerDial pitchData={pitchData} onPlayReference={playReferenceNote} />
          </div>
          <div className="flex-1">
            <DrumBeats />
          </div>
        </div>

        {/* Center/Right Column: Synthesizer, Visualizers, and MIDI logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Synth Engine Rack */}
            <div className="h-full">
              <SynthPanel settings={synthSettings} onChange={setSynthSettings} />
            </div>

            {/* MIDI Output & Monitor */}
            <div className="h-full">
              <MidiConsole
                logs={logs}
                outputs={midiOutputs}
                selectedOutputId={selectedOutputId}
                onSelectOutput={handleSelectOutput}
                onClearLogs={() => setLogs([])}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Interactive Virtual Interface (Keyboard) */}
        <div className="lg:col-span-12 flex flex-col gap-6">
          <VirtualKeyboard
            activeNotes={activeNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
          />
        </div>
      </main>

      {/* Footer credits */}
      <footer className="border-t border-neutral-900 bg-neutral-950/50 py-6 px-8 text-center text-xs text-neutral-600 flex justify-between items-center mt-12">
        <div className="flex items-center gap-1.5 font-medium font-mono">
          <span>HexaMIDI Studio</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Local Engine Online</span>
        </div>
        <div className="flex items-center gap-1">
          Crafted with precision for guitarists and producers
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline mx-0.5" />
        </div>
      </footer>
    </div>
  );
}
