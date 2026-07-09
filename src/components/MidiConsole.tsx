import { MidiLogMessage } from '../types';
import { Radio, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface MidiConsoleProps {
  logs: MidiLogMessage[];
  outputs: WebMIDIOutput[];
  selectedOutputId: string;
  onSelectOutput: (id: string) => void;
  onClearLogs: () => void;
}

interface WebMIDIOutput {
  id: string;
  name: string;
}

export function MidiConsole({
  logs,
  outputs,
  selectedOutputId,
  onSelectOutput,
  onClearLogs,
}: MidiConsoleProps) {
  return (
    <div id="midi-console-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            MIDI Transmission Console
          </h2>
          <button
            id="clear-logs-btn"
            onClick={onClearLogs}
            className="text-[10px] text-neutral-500 hover:text-rose-400 flex items-center gap-1 bg-neutral-950 border border-neutral-800 hover:border-rose-950 px-2 py-1 rounded transition"
            title="Clear Console"
          >
            <Trash2 className="w-3 h-3" />
            Clear Logs
          </button>
        </div>

        {/* MIDI Target Selector */}
        <div className="mb-4 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
            Active MIDI Output Destination
          </label>
          {outputs.length > 0 ? (
            <div className="flex gap-2">
              <select
                id="midi-output-select"
                value={selectedOutputId}
                onChange={(e) => onSelectOutput(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {outputs.map((out) => (
                  <option key={out.id} value={out.id}>
                    {out.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center px-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ACTIVE
              </div>
            </div>
          ) : (
            <div className="text-neutral-500 text-xs py-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-neutral-600" />
              No hardware outputs. Transmitting to internal synthesizer.
            </div>
          )}
        </div>
      </div>

      {/* Real-time Logger stream */}
      <div className="flex-1 min-h-[140px] max-h-[180px] overflow-y-auto bg-neutral-950 rounded-xl p-3 border border-neutral-800/80 font-mono text-[11px] flex flex-col-reverse gap-1.5 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {logs.length > 0 ? (
          logs.slice(-50).reverse().map((log) => {
            let typeColor = 'text-gray-400';
            if (log.type === 'Note On') typeColor = 'text-emerald-400 font-semibold';
            if (log.type === 'Note Off') typeColor = 'text-neutral-600';
            if (log.type === 'Pitch Bend') typeColor = 'text-amber-400';

            return (
              <div key={log.id} className="flex hover:bg-neutral-900/45 py-0.5 px-1 rounded transition">
                <span className="text-neutral-600 mr-2 select-none">[{log.timestamp}]</span>
                <span className={`w-20 ${typeColor}`}>{log.type}</span>
                {log.noteName !== 'SYS' ? (
                  <>
                    <span className="text-indigo-400 mr-3">Note: {log.noteName} ({log.note})</span>
                    {log.velocity > 0 && <span className="text-purple-400">Vel: {log.velocity}</span>}
                  </>
                ) : (
                  <span className="text-neutral-500 italic">{log.extra}</span>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-600 italic select-none">
            Console idle. Send notes from guitar or keys to see transmission logs...
          </div>
        )}
      </div>
    </div>
  );
}
