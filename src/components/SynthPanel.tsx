import React from 'react';
import { SynthSettings } from '../types';
import { Sliders, Activity, Disc, Sparkles, Volume } from 'lucide-react';

interface SynthPanelProps {
  settings: SynthSettings;
  onSettingsChange: (settings: SynthSettings) => void;
  presets: { id: string; name: string; settings: Partial<SynthSettings> }[];
}

export const SynthPanel: React.FC<SynthPanelProps> = ({
  settings,
  onSettingsChange,
  presets,
}) => {
  
  const handleParamChange = (key: keyof SynthSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      onSettingsChange({
        ...settings,
        ...preset.settings,
        preset: presetId,
      });
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" /> Virtual Synthesizer Controls
        </h3>
      </div>

      {/* Preset Selector */}
      <div className="mb-6">
        <label className="block text-xs font-mono text-zinc-500 mb-2">Preset Voice</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset.id)}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all duration-150 text-center cursor-pointer ${
                settings.preset === preset.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
              }`}
              id={`preset-btn-${preset.id}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Voice & Waveforms */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Disc className="w-4 h-4 text-emerald-400" /> Waveform & Voice
            </span>

            {/* Wave Type Select */}
            <div className="mb-4">
              <label className="block text-[11px] font-mono text-zinc-500 mb-2">Oscillator Waveform</label>
              <div className="grid grid-cols-2 gap-2">
                {(['sine', 'triangle', 'sawtooth', 'square'] as const).map((wave) => (
                  <button
                    key={wave}
                    onClick={() => handleParamChange('waveType', wave)}
                    className={`py-2 px-2 text-xs rounded-lg border transition-all duration-150 capitalize cursor-pointer ${
                      settings.waveType === wave
                        ? 'bg-zinc-800 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {wave}
                  </button>
                ))}
              </div>
            </div>

            {/* Polyphonic vs Monophonic Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
              <span className="text-xs font-mono text-zinc-400">Polyphony Mode</span>
              <button
                onClick={() => handleParamChange('polyphonic', !settings.polyphonic)}
                className={`px-3 py-1 text-xs rounded-md border font-mono transition-all ${
                  settings.polyphonic
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                {settings.polyphonic ? 'Polyphonic' : 'Monophonic'}
              </button>
            </div>

            {/* Octave Shift Offset */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Octave Shift</span>
                <span className="text-indigo-400">{settings.octaveOffset > 0 ? `+${settings.octaveOffset}` : settings.octaveOffset}</span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="1"
                value={settings.octaveOffset}
                onChange={(e) => handleParamChange('octaveOffset', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                <span>-2 oct</span>
                <span>0</span>
                <span>+2 oct</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Envelope Generator */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" /> ADSR Envelope
            </span>

            {/* Attack Slider */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Attack (Initial curve)</span>
                <span className="text-zinc-500">{settings.attack.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="1.5"
                step="0.01"
                value={settings.attack}
                onChange={(e) => handleParamChange('attack', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Decay Slider */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Decay (Drop time)</span>
                <span className="text-zinc-500">{settings.decay.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="1.5"
                step="0.01"
                value={settings.decay}
                onChange={(e) => handleParamChange('decay', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Sustain Slider */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Sustain (Hold level)</span>
                <span className="text-zinc-500">{Math.round(settings.sustain * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.sustain}
                onChange={(e) => handleParamChange('sustain', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Release Slider */}
            <div className="mb-1">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Release (Fade out)</span>
                <span className="text-zinc-500">{settings.release.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="2.5"
                step="0.05"
                value={settings.release}
                onChange={(e) => handleParamChange('release', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Filter & Effects (Reverb, Delay, Drive) */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" /> Effects & Filters
            </span>

            {/* Lowpass Filter Cutoff */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Filter Cutoff</span>
                <span className="text-zinc-500">{settings.filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="50"
                value={settings.filterCutoff}
                onChange={(e) => handleParamChange('filterCutoff', parseInt(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Distortion Overdrive */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Distortion Drive</span>
                <span className="text-zinc-500">{Math.round(settings.distortion * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.distortion}
                onChange={(e) => handleParamChange('distortion', parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Delay Loop Feedback */}
            <div className="mb-3.5">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Delay (Time & Feedback)</span>
                <span className="text-zinc-500">{settings.delayTime.toFixed(2)}s | {Math.round(settings.delayFeedback * 100)}%</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={settings.delayTime}
                  onChange={(e) => handleParamChange('delayTime', parseFloat(e.target.value))}
                  className="w-1/2 accent-purple-400 cursor-pointer"
                  title="Delay Time"
                />
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={settings.delayFeedback}
                  onChange={(e) => handleParamChange('delayFeedback', parseFloat(e.target.value))}
                  className="w-1/2 accent-purple-400 cursor-pointer"
                  title="Delay Feedback"
                />
              </div>
            </div>

            {/* Reverb Size */}
            <div className="mb-1">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span>Space Reverb (Decaying Room)</span>
                <span className="text-zinc-500">{Math.round(settings.reverbWet * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.reverbWet}
                onChange={(e) => handleParamChange('reverbWet', parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Master Volume Slider */}
      <div className="mt-6 pt-5 border-t border-zinc-800/60 flex items-center gap-4">
        <Volume className="w-5 h-5 text-zinc-400 shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
            <span>Master Synth Gain</span>
            <span className="text-indigo-400 font-semibold">{Math.round(settings.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.05"
            value={settings.volume}
            onChange={(e) => handleParamChange('volume', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
