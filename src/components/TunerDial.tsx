import { PitchData } from '../types';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface TunerDialProps {
  pitchData: PitchData | null;
  onPlayReference: (note: number) => void;
}

const GUITAR_STRINGS = [
  { note: 64, name: 'E4', desc: '1st (High E)' },
  { note: 59, name: 'B3', desc: '2nd' },
  { note: 55, name: 'G3', desc: '3rd' },
  { note: 50, name: 'D3', desc: '4th' },
  { note: 45, name: 'A2', desc: '5th' },
  { note: 40, name: 'E2', desc: '6th (Low E)' },
];

export function TunerDial({ pitchData, onPlayReference }: TunerDialProps) {
  // Map cents deviation (-50 to +50) to angle (-60 to +60 degrees)
  const cents = pitchData ? pitchData.centsDeviation : 0;
  const isPitchActive = !!pitchData && pitchData.clarity > 0.9;
  const targetAngle = isPitchActive ? Math.max(-50, Math.min(50, cents)) * 1.5 : 0;
  
  // Color determination based on accuracy
  let statusColor = 'text-gray-400';
  let indicatorBg = 'bg-gray-800 border-gray-700';
  let glowColor = '';
  
  if (isPitchActive) {
    if (Math.abs(cents) < 2) {
      statusColor = 'text-green-400';
      indicatorBg = 'bg-green-500/20 border-green-500/50';
      glowColor = 'shadow-[0_0_20px_rgba(34,197,94,0.3)]';
    } else if (cents < 0) {
      statusColor = 'text-cyan-400';
      indicatorBg = 'bg-cyan-500/10 border-cyan-500/30';
    } else {
      statusColor = 'text-rose-400';
      indicatorBg = 'bg-rose-500/10 border-rose-500/30';
    }
  }

  return (
    <div id="tuner-dial-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Precision Guitar Tuner
        </h2>
        
        {/* Semi-circular visual dial */}
        <div className="relative h-32 flex items-end justify-center mb-6 overflow-hidden">
          {/* Dial Arc Background */}
          <div className="absolute w-56 h-56 border-t-2 border-l border-r border-neutral-800 rounded-full -bottom-24 flex items-center justify-center">
            {/* Fine graduation ticks */}
            {[-30, -15, 0, 15, 30].map((tick) => {
              const rot = tick * 1.5;
              return (
                <div
                  key={tick}
                  className="absolute w-[1px] h-3 bg-neutral-700 origin-bottom"
                  style={{
                    transform: `rotate(${rot}deg) translateY(-106px)`,
                  }}
                />
              );
            })}
          </div>

          {/* Reference markings */}
          <div className="absolute bottom-1 left-2 text-[10px] font-mono text-neutral-600">-50 cents</div>
          <div className="absolute bottom-1 right-2 text-[10px] font-mono text-neutral-600">+50 cents</div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-neutral-500">IN TUNE</div>

          {/* Needle */}
          <motion.div
            id="tuner-needle"
            className="absolute bottom-0 w-1 h-24 bg-gradient-to-t origin-bottom rounded-full"
            style={{
              backgroundImage: isPitchActive
                ? Math.abs(cents) < 2
                  ? 'linear-gradient(to top, rgba(34,197,94,0.1), #22c55e)'
                  : cents < 0
                    ? 'linear-gradient(to top, rgba(6,182,212,0.1), #06b6d4)'
                    : 'linear-gradient(to top, rgba(244,63,94,0.1), #f43f5e)'
                : 'linear-gradient(to top, rgba(115,115,115,0.1), #737373)',
            }}
            animate={{ rotate: targetAngle }}
            transition={{ type: 'spring', stiffness: 120, damping: 15 }}
          />

          {/* Pivot Center Point */}
          <div className="absolute -bottom-2 w-4 h-4 bg-neutral-800 border border-neutral-700 rounded-full z-10" />
        </div>

        {/* Readouts */}
        <div className="text-center mb-6">
          <div className="min-h-16 flex flex-col justify-center items-center">
            {isPitchActive ? (
              <div className="flex flex-col items-center">
                <span className={`text-4xl font-extrabold font-mono tracking-tight ${statusColor}`}>
                  {pitchData.noteName}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-neutral-400">
                    {pitchData.frequency.toFixed(1)} Hz
                  </span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${indicatorBg} ${glowColor}`}>
                    {cents > 0 ? `+${cents.toFixed(0)}` : cents.toFixed(0)} cents
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-xl font-medium text-neutral-500">Awaiting Signal...</span>
                <span className="text-xs text-neutral-600 mt-1 max-w-[220px]">
                  Pluck your guitar string or tap a reference note
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reference Tuner helper */}
      <div className="border-t border-neutral-800 pt-4">
        <h3 className="text-xs font-semibold text-neutral-400 mb-2">Guitar Reference Notes</h3>
        <div className="grid grid-cols-6 gap-1">
          {GUITAR_STRINGS.map((str) => (
            <button
              id={`ref-note-btn-${str.name}`}
              key={str.name}
              onClick={() => onPlayReference(str.note)}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition group"
              title={`Play Reference Note ${str.name} (${str.desc})`}
            >
              <span className="text-xs font-mono font-bold">{str.name}</span>
              <Volume2 className="w-3.5 h-3.5 text-neutral-600 group-hover:text-green-400 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
