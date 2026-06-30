import React from 'react';
import { MidiMessageLog, MidiOutput } from '../types';
import { Terminal, Trash2, Radio } from 'lucide-react';

interface MidiConsoleProps {
  logs: MidiMessageLog[];
  outputs: MidiOutput[];
  selectedOutputId: string | null;
  onSelectOutput: (deviceId: string) => void;
  onClearLogs: () => void;
}

export const MidiConsole: React.FC<MidiConsoleProps> = ({
  logs,
  outputs,
  selectedOutputId,
  onSelectOutput,
  onClearLogs,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full flex flex-col h-96">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
        <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" /> Web MIDI Transmitter
        </h3>
        
        {/* Output Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-[10px] font-mono text-zinc-500 shrink-0">Output Port:</label>
          <select
            value={selectedOutputId || ''}
            onChange={(e) => onSelectOutput(e.target.value)}
            className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 w-full sm:max-w-48 cursor-pointer font-mono"
            id="midi-output-select"
          >
            {outputs.length === 0 ? (
              <option value="">No MIDI ports found</option>
            ) : (
              outputs.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name || `MIDI Out #${port.id}`}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Description / Instructions */}
      <p className="text-xs text-zinc-500 mb-4 shrink-0">
        Routes real-time MIDI signals (Note On, Note Off, Pitch Bends) converted from your guitar audio straight into virtual MIDI devices.
      </p>

      {/* Console Display */}
      <div className="flex-1 bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 font-mono text-xs flex flex-col justify-between overflow-hidden">
        {/* Scrollable logs */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2" id="midi-logs-scroll">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center select-none py-12">
              <Radio className="w-8 h-8 opacity-40 mb-2 animate-pulse text-zinc-500" />
              <span>Waiting for MIDI activities...</span>
              <span className="text-[10px] mt-1 opacity-70">Play notes on guitar or fretboard to trigger</span>
            </div>
          ) : (
            logs.map((log) => {
              // Styling based on message type
              let textClass = 'text-zinc-400';
              let badgeColor = 'bg-zinc-800 text-zinc-400';
              if (log.type === 'Note On') {
                textClass = 'text-emerald-400 font-semibold';
                badgeColor = 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400';
              } else if (log.type === 'Pitch Bend') {
                textClass = 'text-purple-400';
                badgeColor = 'bg-purple-950/40 border border-purple-800/40 text-purple-300';
              }

              return (
                <div key={log.id} className="flex items-center gap-2.5 text-[11px] py-1 border-b border-zinc-900/50 hover:bg-zinc-900/30">
                  <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide shrink-0 font-bold ${badgeColor}`}>
                    {log.type}
                  </span>
                  <span className="text-zinc-500 shrink-0">Ch:{log.channel}</span>
                  {log.note !== undefined && (
                    <span className="text-zinc-300 shrink-0 font-medium">
                      Note:{log.noteName} ({log.note})
                    </span>
                  )}
                  <span className={`flex-1 text-right font-semibold ${textClass}`}>
                    {log.type === 'Note On' 
                      ? `Vel: ${log.value}%` 
                      : log.type === 'Pitch Bend' 
                        ? `${log.value > 0 ? '+' : ''}${log.value}¢` 
                        : '--'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Clear and Info Panel */}
        <div className="mt-3 pt-3 border-t border-zinc-900 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-zinc-600 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${selectedOutputId ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {selectedOutputId ? 'MIDI connection active' : 'Virtual synth only'}
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear logs
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
