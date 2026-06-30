import React from 'react';
import { SynthSettings, WaveType } from '../types';
import { Sliders, Activity, Disc, Sparkles, Volume, Zap, Mic } from 'lucide-react';

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
                {(['sine', 'triangle', 'sawtooth', 'square', 'piano', 'noise'] as const).map((wave) => (
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
            <div className="mt-4 pb-4 border-b border-zinc-800/40">
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

            {/* Unison Effect */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Unison Voices</span>
                <span className="text-indigo-400">{settings.unisonVoices || 1} {settings.unisonVoices === 1 ? 'Voice' : 'Voices'}</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={settings.unisonVoices || 1}
                onChange={(e) => handleParamChange('unisonVoices', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {(settings.unisonVoices || 1) > 1 && (
              <div className="mt-2.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-1">
                  <span>Unison Detune</span>
                  <span className="text-indigo-400">{settings.unisonDetune || 0} cents</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={settings.unisonDetune || 0}
                  onChange={(e) => handleParamChange('unisonDetune', parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            )}
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

      {/* Voice Box / Formant Filter Talkbox Section */}
      <div className="mt-6 bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-pink-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
              Pro Talkbox & Voice Box System
            </span>
          </div>
          <button
            onClick={() => handleParamChange('voiceBoxEnabled', !settings.voiceBoxEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${
              settings.voiceBoxEnabled
                ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.15)] font-bold'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${settings.voiceBoxEnabled ? 'bg-pink-500 animate-ping' : 'bg-zinc-600'}`} />
            {settings.voiceBoxEnabled ? 'ACTIVE' : 'BYPASS'}
          </button>
        </div>

        {settings.voiceBoxEnabled ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Vowel Selection Grid */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-500 mb-2 uppercase tracking-wide">
                Selected Vowel Formant
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['A', 'E', 'I', 'O', 'U'] as const).map((vowel) => {
                  const label = {
                    A: { name: 'AH', word: 'Father' },
                    E: { name: 'EH', word: 'Red' },
                    I: { name: 'EE', word: 'Meet' },
                    O: { name: 'OH', word: 'Boat' },
                    U: { name: 'OO', word: 'Boot' },
                  }[vowel];

                  const isActive = settings.voiceBoxVowel === vowel;

                  return (
                    <button
                      key={vowel}
                      onClick={() => handleParamChange('voiceBoxVowel', vowel)}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-pink-400 text-white shadow-[0_0_15px_rgba(244,114,182,0.25)]'
                          : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="text-lg font-bold font-display tracking-tight">{vowel}</span>
                      <span className={`text-[8px] font-mono uppercase ${isActive ? 'text-pink-100' : 'text-zinc-500'}`}>
                        /{label.name}/
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Displaying Live Formant Center Frequencies for Studio Look */}
            <div className="bg-zinc-950/90 border border-zinc-900 p-2.5 rounded-lg font-mono text-[9px] text-zinc-500 flex justify-between items-center">
              <span>Formants (F1, F2, F3):</span>
              <span className="text-pink-400 font-semibold">
                {settings.voiceBoxVowel === 'A' && "AH - F1: 730Hz, F2: 1090Hz, F3: 2440Hz"}
                {settings.voiceBoxVowel === 'E' && "EH - F1: 530Hz, F2: 1840Hz, F3: 2480Hz"}
                {settings.voiceBoxVowel === 'I' && "EE - F1: 270Hz, F2: 2290Hz, F3: 3010Hz"}
                {settings.voiceBoxVowel === 'O' && "OH - F1: 570Hz, F2: 840Hz, F3: 2410Hz"}
                {settings.voiceBoxVowel === 'U' && "OO - F1: 300Hz, F2: 870Hz, F3: 2240Hz"}
              </span>
            </div>

            {/* Modulation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Mod Rate */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Auto sweep Rate (Speed)</span>
                  <span className="text-pink-400 font-semibold">{settings.voiceBoxModRate.toFixed(2)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.05"
                  value={settings.voiceBoxModRate}
                  onChange={(e) => handleParamChange('voiceBoxModRate', parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <span className="text-[9px] font-mono text-zinc-600">0 Hz = Static Vowel Formants</span>
              </div>

              {/* Mod Depth */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Sweep depth (Intensity)</span>
                  <span className="text-pink-400 font-semibold">{Math.round(settings.voiceBoxModDepth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.voiceBoxModDepth}
                  onChange={(e) => handleParamChange('voiceBoxModDepth', parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <span className="text-[9px] font-mono text-zinc-600">Modulates vowel detuning (talking wah)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-900/50 rounded-xl p-5 text-center text-zinc-500 text-xs font-mono">
            Voice Box bypassed. Toggle the ACTIVE switch to engage vocal formant simulation.
          </div>
        )}
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
