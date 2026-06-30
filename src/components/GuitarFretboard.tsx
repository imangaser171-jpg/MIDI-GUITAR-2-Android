import React, { useState } from 'react';
import { Tuning, PitchData } from '../types';
import { NOTE_NAMES } from '../utils/pitchDetector';

interface GuitarFretboardProps {
  tuning: Tuning;
  pitchData: PitchData | null;
  activeSynthNotes: Set<number>;
  onFretPress: (midiNote: number) => void;
  onFretRelease: (midiNote: number) => void;
}

export const GuitarFretboard: React.FC<GuitarFretboardProps> = ({
  tuning,
  pitchData,
  activeSynthNotes,
  onFretPress,
  onFretRelease,
}) => {
  const [hoverPosition, setHoverPosition] = useState<{ stringIndex: number; fret: number } | null>(null);
  const totalFrets = 16; // 0 (open string) to 15 frets fits nicely on screens

  // Fretboard markers (standard guitar dots)
  const fretMarkers = [3, 5, 7, 9, 12, 15];

  // Helper to check if a fret has a marker dot
  const hasMarker = (fret: number) => fretMarkers.includes(fret);
  const isDoubleMarker = (fret: number) => fret === 12;

  // Calculate the MIDI note for a specific string and fret
  const getMidiNoteForPosition = (stringIndex: number, fret: number): number => {
    // tuning.midiNumbers is ordered high string (E4 = 64) to low string (E2 = 40)
    const baseMidi = tuning.midiNumbers[stringIndex];
    return baseMidi + fret;
  };

  // Convert MIDI note to a pitch name (e.g., C4)
  const getPitchName = (midi: number): string => {
    const noteNameIndex = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${NOTE_NAMES[noteNameIndex]}${octave}`;
  };

  // Check if a specific string/fret is currently active (being detected or played via virtual synth)
  const isPositionActive = (stringIndex: number, fret: number): boolean => {
    const positionMidi = getMidiNoteForPosition(stringIndex, fret);
    
    // Active if triggered by user click/key
    if (activeSynthNotes.has(positionMidi)) {
      return true;
    }

    // Active if detected via live microphone pitch detection
    if (pitchData && pitchData.midiNote === positionMidi) {
      return true;
    }

    return false;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <div>
          <h3 className="font-display font-medium text-lg text-zinc-200">Interactive Fretboard</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Shows pitch tracked locations. Tap any fret to play manually.
          </p>
        </div>
        
        {/* Tuning Legend */}
        <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-mono">
          <span className="text-zinc-500">Tuning:</span>
          <span className="text-indigo-400 font-semibold">{tuning.name}</span>
        </div>
      </div>

      {/* Fretboard Canvas Wrapper */}
      <div className="relative overflow-x-auto w-full py-4 pb-6">
        <div className="min-w-[800px] relative bg-amber-950/20 border-2 border-zinc-700/60 rounded-lg shadow-inner">
          
          {/* Wood Grain/Board styling */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 rounded-lg opacity-90 pointer-events-none"></div>

          {/* Fretboard Markers (Guitar Dots) */}
          <div className="absolute inset-0 flex pointer-events-none">
            {/* Fret 0 (Nut) column is wider. Generate subsequent frets columns */}
            <div className="w-16 border-r-4 border-zinc-600/80 h-full"></div>
            {Array.from({ length: totalFrets }).map((_, fretIdx) => {
              const fretNum = fretIdx + 1;
              return (
                <div 
                  key={fretNum} 
                  className="flex-1 relative border-r border-zinc-800 h-full flex items-center justify-center"
                >
                  {hasMarker(fretNum) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col gap-8">
                      {isDoubleMarker(fretNum) ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 opacity-60"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 opacity-60"></div>
                        </>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 opacity-60"></div>
                      )}
                    </div>
                  )}
                  {/* Fret numbers on the bottom edge */}
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-zinc-600">
                    {fretNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Fret Strings and Note Triggers */}
          <div className="relative z-10 py-1 flex flex-col justify-between h-44">
            {tuning.notes.map((baseNote, stringIdx) => {
              // Thick gauge representing low strings, thin gauge for high strings
              // stringIdx 0 (E4, high) to 5 (E2, low)
              const stringThick = 1 + (stringIdx * 0.5);

              return (
                <div 
                  key={stringIdx}
                  className="relative flex items-center h-6 cursor-pointer group"
                >
                  {/* String Wire line */}
                  <div 
                    className="absolute left-0 right-0 pointer-events-none bg-gradient-to-b from-zinc-300 to-zinc-400 opacity-80"
                    style={{ height: `${stringThick}px` }}
                  ></div>

                  {/* Fret column buttons */}
                  <div className="w-full flex">
                    {/* Open String (Fret 0) */}
                    <div 
                      className="w-16 relative flex items-center justify-center h-6 hover:bg-zinc-800/40"
                      onMouseDown={() => {
                        const midi = getMidiNoteForPosition(stringIdx, 0);
                        onFretPress(midi);
                      }}
                      onMouseUp={() => {
                        const midi = getMidiNoteForPosition(stringIdx, 0);
                        onFretRelease(midi);
                      }}
                      onMouseEnter={() => setHoverPosition({ stringIndex: stringIdx, fret: 0 })}
                      onMouseLeave={() => setHoverPosition(null)}
                    >
                      {/* String Pitch label */}
                      <span className="absolute left-2 text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1 border border-zinc-800 rounded">
                        {baseNote}
                      </span>

                      {/* Display note active state */}
                      {isPositionActive(stringIdx, 0) && (
                        <div className="absolute z-20 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow-[0_0_12px_#6366f1] text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                          {getPitchName(getMidiNoteForPosition(stringIdx, 0)).replace(/\d/, '')}
                        </div>
                      )}
                    </div>

                    {/* Frets 1 to N */}
                    {Array.from({ length: totalFrets }).map((_, fretIdx) => {
                      const fret = fretIdx + 1;
                      const midi = getMidiNoteForPosition(stringIdx, fret);
                      const active = isPositionActive(stringIdx, fret);
                      const isHovered = hoverPosition?.stringIndex === stringIdx && hoverPosition?.fret === fret;

                      return (
                        <div
                          key={fret}
                          className="flex-1 relative flex items-center justify-center h-6 hover:bg-white/5"
                          onMouseDown={() => onFretPress(midi)}
                          onMouseUp={() => onFretRelease(midi)}
                          onMouseEnter={() => setHoverPosition({ stringIndex: stringIdx, fret })}
                          onMouseLeave={() => setHoverPosition(null)}
                          id={`fret-${stringIdx}-${fret}`}
                        >
                          {/* Hover preview */}
                          {isHovered && !active && (
                            <span className="absolute z-10 text-[8px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700 px-1 rounded scale-90 pointer-events-none">
                              {getPitchName(midi).replace(/\d/, '')}
                            </span>
                          )}

                          {/* Active Note Indicator */}
                          {active && (
                            <div className="absolute z-20 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow-[0_0_12px_#6366f1] text-[9px] font-bold text-white flex items-center justify-center transform scale-110 transition-transform">
                              {getPitchName(midi).replace(/\d/, '')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
