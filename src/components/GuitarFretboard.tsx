import { ActiveNote } from '../types';

interface GuitarFretboardProps {
  activeNotes: ActiveNote[];
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

// 6-string open notes (from 1st (high E) to 6th (low E))
const STRINGS = [
  { openNote: 64, name: 'e' }, // 1st String (E4)
  { openNote: 59, name: 'B' }, // 2nd String (B3)
  { openNote: 55, name: 'G' }, // 3rd String (G3)
  { openNote: 50, name: 'D' }, // 4th String (D3)
  { openNote: 45, name: 'A' }, // 5th String (A2)
  { openNote: 40, name: 'E' }, // 6th String (E2)
];

const FRETS_COUNT = 15;
const INLAYS = [3, 5, 7, 9, 12, 15];

export function GuitarFretboard({ activeNotes, onNoteOn, onNoteOff }: GuitarFretboardProps) {
  // Check if a specific midiNote is currently active
  const isNoteActive = (note: number) => {
    return activeNotes.some(n => n.note === note);
  };

  // Check if a specific string and fret combination matches the currently active pitch
  const isFretActive = (stringOpenNote: number, fret: number) => {
    const targetNote = stringOpenNote + fret;
    return isNoteActive(targetNote);
  };

  // Helper to trigger note-on
  const handleFretMouseDown = (stringOpenNote: number, fret: number) => {
    const note = stringOpenNote + fret;
    onNoteOn(note, 100);
  };

  const handleFretMouseUp = (stringOpenNote: number, fret: number) => {
    const note = stringOpenNote + fret;
    onNoteOff(note);
  };

  return (
    <div id="guitar-fretboard-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            Interactive Fretboard Visualizer
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Standard Tuning (EADGBE) • Click frets to play, or pluck guitar strings to visualize
          </p>
        </div>
      </div>

      {/* Fretboard Container */}
      <div className="relative overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        <div className="relative min-w-[760px] bg-neutral-950 rounded-xl p-4 border border-neutral-800 shadow-inner flex flex-col">
          
          {/* Fret Numbers Header */}
          <div className="flex h-6 mb-1 text-[10px] font-mono text-neutral-600 pl-8">
            {/* Open string column spacer */}
            <div className="w-10 flex justify-center border-r border-transparent">Nut</div>
            {Array.from({ length: FRETS_COUNT }).map((_, i) => (
              <div key={i} className="flex-1 flex justify-center font-bold">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Fretboard Strings Layer */}
          <div className="relative flex flex-col gap-0.5">
            {STRINGS.map((str, stringIndex) => {
              const stringOpenNote = str.openNote;

              return (
                <div key={stringIndex} className="relative flex items-center h-8 group">
                  {/* String Line overlay */}
                  <div 
                    className="absolute left-8 right-0 h-[1.5px] bg-neutral-700 pointer-events-none z-0"
                    style={{ 
                      height: `${1 + (5 - stringIndex) * 0.3}px`, // Thicker strings towards the bottom
                      backgroundColor: isNoteActive(stringOpenNote) ? '#06b6d4' : '#404040',
                      boxShadow: isNoteActive(stringOpenNote) ? '0 0 8px rgba(6,182,212,0.6)' : 'none'
                    }}
                  />

                  {/* Open String Note / Letter Box */}
                  <button
                    id={`open-string-${str.name}-${stringIndex}`}
                    onMouseDown={() => handleFretMouseDown(stringOpenNote, 0)}
                    onMouseUp={() => handleFretMouseUp(stringOpenNote, 0)}
                    onMouseLeave={() => isFretActive(stringOpenNote, 0) && handleFretMouseUp(stringOpenNote, 0)}
                    onTouchStart={(e) => { e.preventDefault(); handleFretMouseDown(stringOpenNote, 0); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleFretMouseUp(stringOpenNote, 0); }}
                    className={`w-8 h-7 z-10 flex items-center justify-center font-mono font-bold text-xs border rounded-l-md transition ${
                      isFretActive(stringOpenNote, 0)
                        ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    {str.name}
                  </button>

                  {/* Fret Blocks */}
                  {Array.from({ length: FRETS_COUNT }).map((_, fretIndex) => {
                    const fretNum = fretIndex + 1;
                    const noteNum = stringOpenNote + fretNum;
                    const active = isFretActive(stringOpenNote, fretNum);

                    return (
                      <button
                        id={`fret-${stringIndex}-${fretNum}`}
                        key={fretNum}
                        onMouseDown={() => handleFretMouseDown(stringOpenNote, fretNum)}
                        onMouseUp={() => handleFretMouseUp(stringOpenNote, fretNum)}
                        onMouseLeave={() => active && handleFretMouseUp(stringOpenNote, fretNum)}
                        onTouchStart={(e) => { e.preventDefault(); handleFretMouseDown(stringOpenNote, fretNum); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleFretMouseUp(stringOpenNote, fretNum); }}
                        className="flex-1 h-7 border-r border-neutral-800 relative flex items-center justify-center transition-all z-10 select-none group"
                      >
                        {/* Fret wire marker on right */}
                        <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-neutral-800 z-20 group-hover:bg-neutral-600" />

                        {/* Fretboard Marker Inlays (Only on selected frets & 3rd string roughly centered) */}
                        {stringIndex === 2 && INLAYS.includes(fretNum) && (
                          <div className={`absolute w-1.5 h-1.5 rounded-full ${fretNum === 12 ? 'bg-neutral-400/55 scale-125' : 'bg-neutral-600/40'} pointer-events-none z-0`} />
                        )}

                        {/* Extra fret dot for fret 12 on the 4th string to mimic double dot inlay */}
                        {stringIndex === 3 && fretNum === 12 && (
                          <div className="absolute w-1.5 h-1.5 rounded-full bg-neutral-400/55 scale-125 pointer-events-none z-0" />
                        )}

                        {/* Active Glowing Note Overlay */}
                        {active && (
                          <div className="absolute w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-mono font-bold text-black flex items-center justify-center border border-cyan-300 shadow-[0_0_15px_#06b6d4] z-30 animate-pulse">
                            {/* Shortened note label */}
                            {(noteNum % 12)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
