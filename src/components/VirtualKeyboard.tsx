import React from 'react';
import { Keyboard } from 'lucide-react';

interface VirtualKeyboardProps {
  activeSynthNotes: Set<number>;
  onNoteOn: (midiNote: number) => void;
  onNoteOff: (midiNote: number) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  activeSynthNotes,
  onNoteOn,
  onNoteOff,
}) => {
  // Generate 2 octaves C3 (Midi 48) to C5 (Midi 72)
  const startMidi = 48;
  const keysCount = 25; // 2 octaves + top C

  // Standard piano keys configuration
  // 0 = white, 1 = black
  const keyOffsets = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const isBlackKey = (midi: number): boolean => {
    const offset = (midi - startMidi) % 12;
    return keyOffsets[offset] === 1;
  };

  const getKeyName = (midi: number): string => {
    const idx = (midi - startMidi) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[idx]}${octave}`;
  };

  // Separate keys into White and Black for rendering correctly overlayed
  const keysList = Array.from({ length: keysCount }).map((_, idx) => {
    const midi = startMidi + idx;
    return {
      midi,
      isBlack: isBlackKey(midi),
      name: getKeyName(midi),
    };
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-medium text-lg text-zinc-200 flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-indigo-400" /> Virtual Keyboard Playpen
        </h3>
      </div>
      <p className="text-xs text-zinc-500 mb-6">
        Click or touch keys to play the virtual synthesizer manually and audition sound presets (C3 to C5).
      </p>

      {/* Piano Container */}
      <div className="relative w-full h-44 bg-zinc-950 p-2 rounded-2xl border border-zinc-850 flex select-none overflow-x-auto">
        <div className="relative flex flex-1 min-w-[500px] h-full">
          {/* White keys render */}
          {keysList
            .filter((k) => !k.isBlack)
            .map((key) => {
              const active = activeSynthNotes.has(key.midi);
              return (
                <div
                  key={key.midi}
                  onMouseDown={() => onNoteOn(key.midi)}
                  onMouseUp={() => onNoteOff(key.midi)}
                  onMouseLeave={() => activeSynthNotes.has(key.midi) && onNoteOff(key.midi)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onNoteOn(key.midi);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onNoteOff(key.midi);
                  }}
                  className={`flex-1 border-r border-zinc-850 rounded-b-lg flex flex-col justify-end items-center pb-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-t from-indigo-600 to-indigo-500 shadow-inner text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                  }`}
                  id={`kb-white-${key.midi}`}
                >
                  <span className="text-[9px] font-mono font-bold leading-none select-none">
                    {key.name}
                  </span>
                </div>
              );
            })}

          {/* Black keys overlayed */}
          <div className="absolute top-0 left-0 right-0 h-[60%] flex pointer-events-none">
            {keysList.map((key, idx) => {
              if (!key.isBlack) {
                // Return an empty transparent spacer for white keys to maintain horizontal alignment
                return <div key={`spacer-${key.midi}`} className="flex-1 pointer-events-none"></div>;
              }

              // Since black keys sit between white keys, align them offset
              const active = activeSynthNotes.has(key.midi);
              
              return (
                <div
                  key={key.midi}
                  onMouseDown={() => onNoteOn(key.midi)}
                  onMouseUp={() => onNoteOff(key.midi)}
                  onMouseLeave={() => activeSynthNotes.has(key.midi) && onNoteOff(key.midi)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onNoteOn(key.midi);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onNoteOff(key.midi);
                  }}
                  className={`absolute w-7 h-full z-20 rounded-b-md border border-black/30 flex flex-col justify-end items-center pb-1 transition-all cursor-pointer pointer-events-auto ${
                    active
                      ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] text-white'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                  }`}
                  style={{
                    // Math calculations to perfectly center black keys over the borders of white keys
                    // In a 25 key scale (including 15 white keys), each white key is 1/15th (approx 6.66%) wide.
                    // This aligns them dynamically based on index
                    left: `calc(${(idx / keysCount) * 100}% - 14px)`,
                  }}
                  id={`kb-black-${key.midi}`}
                >
                  <span className="text-[8px] font-mono leading-none select-none">
                    {key.name.replace('#', '')}#
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
