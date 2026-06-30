import React from 'react';
import { PitchData, Tuning } from '../types';
import { Play, Volume2 } from 'lucide-react';

interface TunerDialProps {
  pitchData: PitchData | null;
  listening: boolean;
  tuning: Tuning;
  onPlayReferenceNote: (noteName: string, midiNote: number) => void;
}

export const TunerDial: React.FC<TunerDialProps> = ({
  pitchData,
  listening,
  tuning,
  onPlayReferenceNote,
}) => {
  const cents = pitchData?.centsOffset ?? 0;
  const noteName = pitchData?.noteName ?? '--';
  const frequency = pitchData?.frequency ?? 0;
  
  // Calculate angle for the needle (-50 to +50 cents maps to -60deg to +60deg)
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needleAngle = (clampedCents / 50) * 60;

  // Determine tune status
  let tuneStatusColor = 'text-zinc-500';
  let statusText = 'No Signal';
  
  if (listening) {
    if (!pitchData || pitchData.midiNote === -1) {
      statusText = 'Listening...';
      tuneStatusColor = 'text-zinc-400 animate-pulse';
    } else if (Math.abs(cents) <= 3) {
      statusText = 'In Tune';
      tuneStatusColor = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    } else if (cents < 0) {
      statusText = 'Flat';
      tuneStatusColor = 'text-amber-500';
    } else {
      statusText = 'Sharp';
      tuneStatusColor = 'text-cyan-500';
    }
  }

  return (
    <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="font-display font-medium text-lg text-zinc-200">String Tuner & Pitch Meter</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-mono bg-zinc-950 border border-zinc-800 ${tuneStatusColor}`}>
          ● {statusText}
        </span>
      </div>

      {/* Tuner Gauge Display */}
      <div className="relative w-64 h-48 flex items-center justify-center mt-2">
        {/* Background Semi-circle arch */}
        <div className="absolute top-0 w-full h-full border-t border-l border-r border-zinc-800 rounded-t-full flex items-end justify-center overflow-hidden">
          {/* Tick marks */}
          <div className="absolute inset-0 flex justify-between items-end px-4 pb-2 text-[10px] font-mono text-zinc-600">
            <span>-50¢</span>
            <span>-25¢</span>
            <span className="text-zinc-500">0</span>
            <span>+25¢</span>
            <span>+50¢</span>
          </div>

          {/* Color blocks */}
          <div className="absolute top-2 w-48 h-24 border-t-2 border-dashed border-zinc-800 rounded-t-full opacity-40"></div>
          
          {/* Center alignment guide */}
          <div className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-4 bg-emerald-500 opacity-60"></div>
        </div>

        {/* Needle Gauge */}
        <div 
          className="absolute bottom-0 w-1 h-32 bg-indigo-500 origin-bottom rounded-full transition-transform duration-100 ease-out shadow-lg"
          style={{ 
            transform: `rotate(${needleAngle}deg)`,
            left: 'calc(50% - 2px)'
          }}
        >
          {/* Needle tip glow */}
          <div className={`absolute top-0 -left-1 w-3 h-3 rounded-full ${Math.abs(cents) <= 3 ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-indigo-400 shadow-[0_0_8px_#6366f1]'}`}></div>
        </div>

        {/* Central Dial Hub */}
        <div className="absolute bottom-0 w-36 h-18 bg-zinc-950 border border-zinc-800 rounded-t-full flex flex-col justify-end items-center pb-2 z-10 shadow-inner">
          {/* Detected note name */}
          <div className="font-display font-bold text-4xl text-zinc-100 leading-none">
            {noteName}
          </div>
          {/* Detected frequency */}
          <div className="font-mono text-xs text-zinc-500 mt-1">
            {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '0.0 Hz'}
          </div>
          {/* Cents deviation */}
          <div className={`font-mono text-[10px] mt-1 ${Math.abs(cents) <= 3 ? 'text-emerald-400' : cents < 0 ? 'text-amber-500' : 'text-cyan-400'}`}>
            {frequency > 0 ? (cents > 0 ? `+${cents}¢` : `${cents}¢`) : '--'}
          </div>
        </div>
      </div>

      {/* Reference Tuner Strings */}
      <div className="w-full mt-6">
        <div className="text-xs font-mono text-zinc-500 mb-2.5 text-center">Reference pitches (Tap to play reference tone)</div>
        <div className="grid grid-cols-6 gap-2">
          {tuning.notes.map((note, index) => {
            const stringName = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'][index] || note;
            const stringMidi = tuning.midiNumbers[index];
            const isClosest = pitchData && pitchData.midiNote !== -1 && Math.abs(pitchData.midiNote - stringMidi) <= 2;
            
            return (
              <button
                key={index}
                onClick={() => onPlayReferenceNote(note, stringMidi)}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border font-mono transition-all duration-200 cursor-pointer ${
                  isClosest 
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-zinc-200'
                }`}
                id={`ref-string-${index}`}
                title={`Play string ${stringName}`}
              >
                <span className="text-xs font-semibold text-zinc-500">{6 - index}</span>
                <span className="text-sm font-bold mt-0.5">{stringName.replace(/\d/, '')}</span>
                <Volume2 className="w-3.5 h-3.5 mt-1.5 opacity-60 hover:opacity-100 text-indigo-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
