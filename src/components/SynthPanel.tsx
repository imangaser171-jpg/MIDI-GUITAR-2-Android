import { useState } from 'react';
import { SynthSettings, OscillatorType, HarmonizerMode } from '../types';
import { Sliders, Volume2, Sparkles, Save, Edit2, Trash2, Check, FolderHeart } from 'lucide-react';

interface SynthPanelProps {
  settings: SynthSettings;
  onChange: (settings: SynthSettings) => void;
}

const PRESETS: Array<{ name: string; desc: string; settings: Partial<SynthSettings> }> = [
  {
    name: 'Fat Saw Lead',
    desc: 'Heavy, rich sawtooth lead suited for guitar solo tracking',
    settings: {
      oscType: 'sawtooth',
      cutoff: 3500,
      Q: 2.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.6,
      release: 0.3,
    },
  },
  {
    name: 'Chiptune Square',
    desc: 'Retro 8-bit pulse square wave sound',
    settings: {
      oscType: 'square',
      cutoff: 10000,
      Q: 1.0,
      attack: 0.001,
      decay: 0.1,
      sustain: 0.4,
      release: 0.1,
    },
  },
  {
    name: 'Dreamy Sine Flute',
    desc: 'Soft, mellow tones with a longer dream-like release',
    settings: {
      oscType: 'sine',
      cutoff: 1200,
      Q: 1.0,
      attack: 0.15,
      decay: 0.4,
      sustain: 0.8,
      release: 0.8,
    },
  },
  {
    name: 'Plucky Triangle',
    desc: 'Snappy percussive transient with a quick decay',
    settings: {
      oscType: 'triangle',
      cutoff: 2400,
      Q: 4.0,
      attack: 0.002,
      decay: 0.15,
      sustain: 0.1,
      release: 0.15,
    },
  },
  {
    name: 'Unison Lead',
    desc: 'Super-fat detuned multi-voice sawtooth',
    settings: {
      oscType: 'unison',
      cutoff: 4000,
      Q: 2.0,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.3,
    },
  },
  {
    name: 'Nylon Guitar',
    desc: 'Warm classical acoustic guitar simulation',
    settings: {
      oscType: 'nylon',
      cutoff: 2500,
      Q: 1.5,
      attack: 0.005,
      decay: 0.4,
      sustain: 0.1,
      release: 0.5,
    },
  },
  {
    name: 'Saxophone',
    desc: 'Rich brassy woodwind with expressive pitch vibrato',
    settings: {
      oscType: 'sax',
      cutoff: 2800,
      Q: 3.5,
      attack: 0.08,
      decay: 0.3,
      sustain: 0.75,
      release: 0.25,
    },
  },
  {
    name: 'String Ensemble',
    desc: 'Slow, lush detuned orchestral string pad',
    settings: {
      oscType: 'strings',
      cutoff: 2200,
      Q: 1.5,
      attack: 0.35,
      decay: 0.5,
      sustain: 0.85,
      release: 1.2,
    },
  },
  {
    name: 'Violin',
    desc: 'Bowed solo string sound with expressive vibrato LFO',
    settings: {
      oscType: 'violin',
      cutoff: 3000,
      Q: 2.5,
      attack: 0.1,
      decay: 0.4,
      sustain: 0.8,
      release: 0.4,
    },
  },
  {
    name: 'Acoustic Piano',
    desc: 'Dynamic, sharp hammer-strike piano with fast-decaying overtones',
    settings: {
      oscType: 'piano',
      cutoff: 3200,
      Q: 1.5,
      attack: 0.001,
      decay: 0.45,
      sustain: 0.25,
      release: 0.6,
    },
  },
  {
    name: 'Bass Guitar',
    desc: 'Deep warm bottom-end with metallic slapping transient pluck',
    settings: {
      oscType: 'bass',
      cutoff: 1000,
      Q: 1.8,
      attack: 0.005,
      decay: 0.35,
      sustain: 0.3,
      release: 0.55,
    },
  },
];

interface CustomPreset {
  id: number;
  name: string;
  settings: SynthSettings | null;
}

export function SynthPanel({ settings, onChange }: SynthPanelProps) {
  const [userPresets, setUserPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('voice_box_user_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse user presets', e);
      }
    }
    return [
      { id: 1, name: 'User Preset 1', settings: null },
      { id: 2, name: 'User Preset 2', settings: null },
      { id: 3, name: 'User Preset 3', settings: null },
      { id: 4, name: 'User Preset 4', settings: null },
    ];
  });

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');

  const savePreset = (id: number) => {
    const updated = userPresets.map((preset) => {
      if (preset.id === id) {
        return {
          ...preset,
          settings: { ...settings }
        };
      }
      return preset;
    });
    setUserPresets(updated);
    localStorage.setItem('voice_box_user_presets', JSON.stringify(updated));
  };

  const loadPreset = (presetSettings: SynthSettings) => {
    onChange(presetSettings);
  };

  const clearPreset = (id: number) => {
    const updated = userPresets.map((preset) => {
      if (preset.id === id) {
        return {
          ...preset,
          settings: null
        };
      }
      return preset;
    });
    setUserPresets(updated);
    localStorage.setItem('voice_box_user_presets', JSON.stringify(updated));
  };

  const startRename = (id: number, currentName: string) => {
    setRenamingId(id);
    setTempName(currentName);
  };

  const saveRename = (id: number) => {
    const updated = userPresets.map((preset) => {
      if (preset.id === id) {
        return {
          ...preset,
          name: tempName.trim() || `User Preset ${id}`
        };
      }
      return preset;
    });
    setUserPresets(updated);
    localStorage.setItem('voice_box_user_presets', JSON.stringify(updated));
    setRenamingId(null);
  };
  
  const updateSetting = <K extends keyof SynthSettings>(key: K, value: SynthSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const applyPreset = (presetSettings: Partial<SynthSettings>) => {
    onChange({
      ...settings,
      ...presetSettings,
    });
  };

  return (
    <div id="synth-panel-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Synthesizer Engine Engine Rack
          </h2>
        </div>

        {/* Preset quick selector */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
            Quick Sound Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const isActive = settings.oscType === p.settings.oscType && 
                               Math.abs(settings.attack - (p.settings.attack || 0)) < 0.05;
              return (
                <button
                  id={`preset-btn-${p.name.replace(/\s+/g, '-').toLowerCase()}`}
                  key={p.name}
                  onClick={() => applyPreset(p.settings)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex flex-col justify-between ${
                    isActive
                      ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                      : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800/50 hover:border-neutral-700 text-neutral-400'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    {p.name}
                  </span>
                  <span className="text-[10px] text-neutral-500 line-clamp-1 mt-1">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User Saved Presets */}
        <div className="mb-6 border-t border-neutral-800/80 pt-4">
          <div className="flex justify-between items-center mb-2.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderHeart className="w-3.5 h-3.5 text-indigo-400" />
              Your Custom Presets (4 Slots)
            </label>
            <span className="text-[10px] text-neutral-500 font-mono">Persisted locally</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {userPresets.map((p) => {
              const hasSettings = p.settings !== null;
              // Check if current settings match the saved settings for high visual fidelity active state
              const isActive = hasSettings && p.settings &&
                settings.oscType === p.settings.oscType &&
                Math.abs(settings.cutoff - p.settings.cutoff) < 5 &&
                Math.abs(settings.Q - p.settings.Q) < 0.1 &&
                Math.abs(settings.attack - p.settings.attack) < 0.01 &&
                Math.abs(settings.release - p.settings.release) < 0.01;

              return (
                <div
                  id={`user-preset-slot-${p.id}`}
                  key={p.id}
                  className={`group relative rounded-xl border p-2 flex flex-col justify-between h-[76px] transition ${
                    isActive
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.05)]'
                      : hasSettings
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      : 'bg-neutral-950/40 border-dashed border-neutral-800/80 text-neutral-500'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1 w-full">
                    {renamingId === p.id ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          id={`preset-rename-input-${p.id}`}
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          maxLength={16}
                          className="bg-neutral-900 border border-indigo-500 text-[11px] text-white rounded px-1.5 py-0.5 focus:outline-none w-full font-medium"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(p.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          autoFocus
                        />
                        <button
                          id={`preset-save-rename-${p.id}`}
                          onClick={() => saveRename(p.id)}
                          className="p-1 hover:bg-neutral-800 rounded text-emerald-400 cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span 
                          onClick={() => hasSettings && loadPreset(p.settings!)}
                          className={`text-xs font-bold truncate pr-1 ${hasSettings ? 'cursor-pointer hover:text-white flex-1' : 'opacity-60 select-none'}`}
                        >
                          {p.name}
                        </span>
                        {hasSettings && (
                          <button
                            id={`preset-start-rename-${p.id}`}
                            type="button"
                            onClick={() => startRename(p.id, p.name)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition cursor-pointer"
                            title="Rename preset"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 w-full">
                    {hasSettings ? (
                      <>
                        <button
                          id={`preset-load-btn-${p.id}`}
                          type="button"
                          onClick={() => loadPreset(p.settings!)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded transition cursor-pointer ${
                            isActive
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/35 border border-indigo-600/20'
                          }`}
                        >
                          {isActive ? 'Active' : 'Load'}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            id={`preset-overwrite-btn-${p.id}`}
                            type="button"
                            onClick={() => savePreset(p.id)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-indigo-400 cursor-pointer"
                            title="Overwrite with current settings"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            id={`preset-clear-btn-${p.id}`}
                            type="button"
                            onClick={() => clearPreset(p.id)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 cursor-pointer"
                            title="Clear slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-neutral-600">Empty Slot</span>
                        <button
                          id={`preset-save-new-btn-${p.id}`}
                          type="button"
                          onClick={() => savePreset(p.id)}
                          className="text-[10px] font-medium bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-2.5 h-2.5 text-indigo-400" />
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Oscillator & Filter Section */}
        <div className="space-y-5">
          {/* Waveform Selector */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
              Oscillator Waveform
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              {(['sine', 'triangle', 'sawtooth', 'square', 'unison', 'nylon', 'sax', 'strings', 'violin', 'piano', 'bass'] as OscillatorType[]).map((type) => (
                <button
                  id={`osc-wave-${type}`}
                  key={type}
                  onClick={() => updateSetting('oscType', type)}
                  className={`py-2 text-xs font-medium rounded-lg capitalize transition ${
                    settings.oscType === type
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {type === 'strings' ? 'strings' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Cutoff, Resonance, & Portamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-400">Cutoff Filter</span>
                <span className="font-mono text-neutral-500">{settings.cutoff}Hz</span>
              </div>
              <input
                id="filter-cutoff-slider"
                type="range"
                min="100"
                max="10000"
                step="50"
                value={settings.cutoff}
                onChange={(e) => updateSetting('cutoff', parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-400">Filter Resonance (Q)</span>
                <span className="font-mono text-neutral-500">{settings.Q.toFixed(1)}</span>
              </div>
              <input
                id="filter-q-slider"
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={settings.Q}
                onChange={(e) => updateSetting('Q', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-400">Portamento Glide</span>
                <span className="font-mono text-indigo-400 font-semibold">{settings.glide > 0 ? `${settings.glide.toFixed(2)}s` : 'Off'}</span>
              </div>
              <input
                id="portamento-glide-slider"
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={settings.glide !== undefined ? settings.glide : 0.05}
                onChange={(e) => updateSetting('glide', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* ADSR Controls */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-3">
              ADSR Volume Envelope
            </label>
            <div className="grid grid-cols-4 gap-3 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 mb-1 font-mono">A: {settings.attack.toFixed(2)}s</span>
                <input
                  id="envelope-attack-slider"
                  type="range"
                  min="0.005"
                  max="1.5"
                  step="0.02"
                  value={settings.attack}
                  onChange={(e) => updateSetting('attack', parseFloat(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-16 w-1"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 mb-1 font-mono">D: {settings.decay.toFixed(2)}s</span>
                <input
                  id="envelope-decay-slider"
                  type="range"
                  min="0.01"
                  max="1.5"
                  step="0.02"
                  value={settings.decay}
                  onChange={(e) => updateSetting('decay', parseFloat(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-16 w-1"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 mb-1 font-mono">S: {Math.round(settings.sustain * 100)}%</span>
                <input
                  id="envelope-sustain-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sustain}
                  onChange={(e) => updateSetting('sustain', parseFloat(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-16 w-1"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 mb-1 font-mono">R: {settings.release.toFixed(2)}s</span>
                <input
                  id="envelope-release-slider"
                  type="range"
                  min="0.01"
                  max="3.0"
                  step="0.05"
                  value={settings.release}
                  onChange={(e) => updateSetting('release', parseFloat(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-16 w-1"
                  style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- FX & Processing Rack --- */}
        <div className="border-t border-neutral-800 pt-5 mt-5 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-3.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Guitar FX & Harmonizer Rack
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Harmonizer Controls */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-300">Intelligent Harmonizer</span>
                  <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase">Chords/Intervals</span>
                </div>
                <div>
                  <select
                    id="harmonizer-mode-select"
                    value={settings.harmonizerMode || 'off'}
                    onChange={(e) => updateSetting('harmonizerMode', e.target.value as HarmonizerMode)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="off">Harmonizer Off (Solo)</option>
                    <option value="octave-up">Octave Up (+12st)</option>
                    <option value="octave-down">Octave Down (-12st)</option>
                    <option value="fifth">Perfect Fifth (+7st)</option>
                    <option value="fourth">Perfect Fourth (+5st)</option>
                    <option value="power">Power Chord (+7st, +12st)</option>
                    <option value="major-triad">Major Triad (+4st, +7st)</option>
                    <option value="minor-triad">Minor Triad (+3st, +7st)</option>
                  </select>
                </div>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  Synthesizes beautiful real-time harmonic intervals/chords layered from single guitar strings.
                </p>
              </div>

              {/* Pinch Harmonics Controls */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-300">Pinch Harmonics (Squealy)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="pinch-harmonics-toggle"
                      type="checkbox"
                      checked={settings.pinchHarmonicsEnabled || false}
                      onChange={(e) => updateSetting('pinchHarmonicsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-neutral-400">Harmonic Squeal Intensity</span>
                    <span className="font-mono text-neutral-500">{Math.round((settings.pinchHarmonicsLevel !== undefined ? settings.pinchHarmonicsLevel : 0.5) * 100)}%</span>
                  </div>
                  <input
                    id="pinch-harmonics-level-slider"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    disabled={!settings.pinchHarmonicsEnabled}
                    value={settings.pinchHarmonicsLevel !== undefined ? settings.pinchHarmonicsLevel : 0.5}
                    onChange={(e) => updateSetting('pinchHarmonicsLevel', parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  Simulates guitar pinch harmonics by layering a high-pitched resonant bandpass squeal (+31 semitones) on pluck transients.
                </p>
              </div>

              {/* Stereo Delay / Space Echo */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-3.5 md:col-span-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-300">Space Echo & Stereo Delay</span>
                    <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-semibold font-mono">Ambient Echo</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="delay-effect-toggle"
                      type="checkbox"
                      checked={settings.delayEnabled || false}
                      onChange={(e) => updateSetting('delayEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Delay Time */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Echo Time</span>
                      <span className="font-mono text-indigo-400 font-semibold">{(settings.delayTime !== undefined ? settings.delayTime : 0.35).toFixed(2)}s</span>
                    </div>
                    <input
                      id="delay-time-slider"
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      disabled={!settings.delayEnabled}
                      value={settings.delayTime !== undefined ? settings.delayTime : 0.35}
                      onChange={(e) => updateSetting('delayTime', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Delay Feedback */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Feedback (Repeats)</span>
                      <span className="font-mono text-indigo-400 font-semibold">{Math.round((settings.delayFeedback !== undefined ? settings.delayFeedback : 0.4) * 100)}%</span>
                    </div>
                    <input
                      id="delay-feedback-slider"
                      type="range"
                      min="0"
                      max="0.85"
                      step="0.05"
                      disabled={!settings.delayEnabled}
                      value={settings.delayFeedback !== undefined ? settings.delayFeedback : 0.4}
                      onChange={(e) => updateSetting('delayFeedback', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Delay Wet level */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Mix Level (Wet)</span>
                      <span className="font-mono text-indigo-400 font-semibold">{Math.round((settings.delayWet !== undefined ? settings.delayWet : 0.25) * 100)}%</span>
                    </div>
                    <input
                      id="delay-wet-slider"
                      type="range"
                      min="0"
                      max="0.75"
                      step="0.05"
                      disabled={!settings.delayEnabled}
                      value={settings.delayWet !== undefined ? settings.delayWet : 0.25}
                      onChange={(e) => updateSetting('delayWet', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  Creates a cascading stereo feedback delay line. Keeps previous guitar notes echoing in the background to build an immersive, fully polyphonic ambient soundstage!
                </p>
              </div>

              {/* Pitch Shifter (Coarse and Fine Tuning) */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-3.5 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-300">Zero-Latency Pitch Shifter</span>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">Transpose</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Coarse Transposition */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Coarse Tuning (Semitones)</span>
                      <span className="font-mono text-indigo-400 font-semibold">{settings.pitchShift && settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift || 0} st</span>
                    </div>
                    <input
                      id="pitch-shift-slider"
                      type="range"
                      min="-24"
                      max="24"
                      step="1"
                      value={settings.pitchShift !== undefined ? settings.pitchShift : 0}
                      onChange={(e) => updateSetting('pitchShift', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Fine Tuning */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-400">Fine Tuning (Cents)</span>
                      <span className="font-mono text-indigo-400 font-semibold">{settings.fineTune && settings.fineTune > 0 ? `+${settings.fineTune}` : settings.fineTune || 0} cents</span>
                    </div>
                    <input
                      id="fine-tune-slider"
                      type="range"
                      min="-100"
                      max="100"
                      step="2"
                      value={settings.fineTune !== undefined ? settings.fineTune : 0}
                      onChange={(e) => updateSetting('fineTune', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Poly-Strum String Resonance (Overlapping Polyphony) */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-3.5 md:col-span-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-300">Poly-Strum String Resonance</span>
                    <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase font-semibold">Guitar Chords Mode</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="polyphony-effect-toggle"
                      type="checkbox"
                      checked={settings.audioPolyphonyEnabled || false}
                      onChange={(e) => updateSetting('audioPolyphonyEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-neutral-400">Ringout Overlap Decay (Sustain)</span>
                    <span className="font-mono text-purple-400 font-semibold">{(settings.audioPolyphonyDecay !== undefined ? settings.audioPolyphonyDecay : 1.5).toFixed(1)}s</span>
                  </div>
                  <input
                    id="polyphony-decay-slider"
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    disabled={!settings.audioPolyphonyEnabled}
                    value={settings.audioPolyphonyDecay !== undefined ? settings.audioPolyphonyDecay : 1.5}
                    onChange={(e) => updateSetting('audioPolyphonyDecay', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-neutral-950 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  Simulates a real multi-string guitar fretboard! Consecutive single notes continue to vibrate and ring out together in the background to build rich polyphonic chords, rather than instantly cutting each other off.
                </p>
              </div>

              {/* Latency & Buffer Optimization Selector */}
              <div className="bg-neutral-950/40 border border-neutral-900 rounded-xl p-3.5 space-y-4 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-300">Audio Signal & Latency Optimization</span>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-semibold">Android Optimized</span>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">1. FFT Buffer Size Latency</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { level: 'ultra-low', label: 'Ultra Snappy', desc: '512 / Android 15' },
                      { level: 'low', label: 'Low Latency', desc: '1024 / Android' },
                      { level: 'balanced', label: 'Balanced', desc: '2048 / Default' },
                      { level: 'high', label: 'High Precision', desc: '4096 / Bass Tuner' }
                    ].map((opt) => (
                      <button
                        id={`latency-level-${opt.level}`}
                        key={opt.level}
                        type="button"
                        onClick={() => updateSetting('latencyLevel', opt.level as any)}
                        className={`text-left p-2 rounded-lg border text-xs transition cursor-pointer ${
                          (settings.latencyLevel || 'balanced') === opt.level
                            ? 'border-indigo-600 bg-indigo-500/5 text-white shadow-sm'
                            : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className="text-[9px] text-neutral-500 mt-0.5 font-mono">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Gate Slider */}
                <div className="border-t border-neutral-900 pt-3.5 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">2. Audio Noise Gate Threshold</span>
                      <span className="text-[9px] font-mono bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-semibold">Filters Hum</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">
                      {settings.noiseGate !== undefined ? settings.noiseGate : -35} dB
                    </span>
                  </div>
                  <input
                    id="noise-gate-slider"
                    type="range"
                    min="-50"
                    max="-20"
                    step="1"
                    value={settings.noiseGate !== undefined ? settings.noiseGate : -35}
                    onChange={(e) => updateSetting('noiseGate', parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                    💡 <span className="text-neutral-400">Guitarist Tip:</span> Set this slider higher (e.g. <span className="text-emerald-400 font-semibold">-30dB</span> to <span className="text-emerald-400 font-semibold">-25dB</span>) if background hum, room noise, or strum resonance causes the synth to freeze or trigger random high-pitched notes. Set lower (e.g. <span className="text-emerald-400 font-semibold">-45dB</span>) for long natural ringouts.
                  </p>
                </div>

                {/* USB & Mobile Feedback Protection Toggles */}
                <div className="border-t border-neutral-900 pt-3.5 space-y-3">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">3. USB & Mobile Feedback Protection</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-900">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-neutral-300">Feedback Shield</span>
                        <span className="text-[9px] text-neutral-500">Acoustic Echo Cancel</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="echo-cancel-toggle"
                          type="checkbox"
                          checked={settings.echoCancellation !== false}
                          onChange={(e) => updateSetting('echoCancellation', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-neutral-300">Hum Suppression</span>
                        <span className="text-[9px] text-neutral-500">Interference Filter</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="noise-suppress-toggle"
                          type="checkbox"
                          checked={settings.noiseSuppression !== false}
                          onChange={(e) => updateSetting('noiseSuppression', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-300 after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-normal">
                    ⚠️ <span className="text-neutral-400">Feedback Warning:</span> If your device has high-gain howling or loopback when using USB/Guitar interface, keep **Feedback Shield** on. Turn off only for pristine, raw analog pickup signals with high-quality headphones.
                  </p>
                </div>

                <p className="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-900 pt-2">
                  💡 <span className="text-neutral-400">Android 15 Tip:</span> On devices like the Samsung A14, choose <span className="text-indigo-400 font-semibold">Ultra Snappy</span> (512 buffer) for instant speed or <span className="text-indigo-400 font-semibold">Low Latency</span> (1024 buffer) for standard play. Avoid Bluetooth audio as it adds over 150ms of lag!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Master Gain Slider */}
      <div className="border-t border-neutral-800 mt-6 pt-4 flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-neutral-400" />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">Master Volume</span>
            <span className="font-mono text-neutral-500">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            id="synth-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
