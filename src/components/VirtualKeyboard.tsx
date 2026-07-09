import { ActiveNote } from '../types';

interface VirtualKeyboardProps {
  activeNotes: ActiveNote[];
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

// C3 to C5 (MIDI 48 to 72)
const START_MIDI = 48;
const END_MIDI = 72;

// Check if a MIDI note is a black key
const isBlackKey = (note: number): boolean => {
  const mod = note % 12;
  return [1, 3, 6, 8, 10].includes(mod);
};

const getNoteName = (note: number): string => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[note % 12];
};

export function VirtualKeyboard({ activeNotes, onNoteOn, onNoteOff }: VirtualKeyboardProps) {
  const notes: number[] = [];
  for (let i = START_MIDI; i <= END_MIDI; i++) {
    notes.push(i);
  }

  const isNoteActive = (note: number) => {
    return activeNotes.some(n => n.note === note);
  };

  const handleKeyMouseDown = (note: number) => {
    onNoteOn(note, 100);
  };

  const handleKeyMouseUp = (note: number) => {
    onNoteOff(note);
  };

  // Group notes into white and black lists for visual overlay alignment
  const whiteKeys = notes.filter(n => !isBlackKey(n));

  return (
    <div id="virtual-keyboard-card" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Piano Keyboard Monitor & Synth Input
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            2-Octave Range (C3 - C5) • Supports multi-touch and mouse clicks
          </p>
        </div>
      </div>

      {/* Piano Keyboard Wrapper */}
      <div className="relative overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        <div className="relative flex min-w-[620px] h-36 bg-neutral-950 p-2 rounded-xl border border-neutral-800 select-none">
          {whiteKeys.map((note) => {
            const active = isNoteActive(note);
            const isC = getNoteName(note) === 'C';

            return (
              <div
                id={`white-key-${note}`}
                key={note}
                className="relative flex-1"
                onMouseDown={() => handleKeyMouseDown(note)}
                onMouseUp={() => handleKeyMouseUp(note)}
                onMouseLeave={() => active && handleKeyMouseUp(note)}
                onTouchStart={(e) => { e.preventDefault(); handleKeyMouseDown(note); }}
                onTouchEnd={(e) => { e.preventDefault(); handleKeyMouseUp(note); }}
              >
                {/* White Key shape */}
                <div
                  className={`w-full h-full border-r border-b border-neutral-800 rounded-b-md transition-all duration-75 flex flex-col justify-end items-center pb-2 cursor-pointer ${
                    active
                      ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] h-[98%] mt-[2%]'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {isC && (
                    <span className="text-[10px] font-bold font-mono">
                      C{Math.floor(note / 12) - 1}
                    </span>
                  )}
                </div>

                {/* Overlaid Black Key to the right of this white key if appropriate */}
                {/* Black keys occur after C (mod 0), D (2), F (5), G (7), A (9) */}
                {[0, 2, 5, 7, 9].includes(note % 12) && note < END_MIDI && (
                  <div
                    id={`black-key-${note + 1}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleKeyMouseDown(note + 1);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      handleKeyMouseUp(note + 1);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      if (isNoteActive(note + 1)) handleKeyMouseUp(note + 1);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleKeyMouseDown(note + 1);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleKeyMouseUp(note + 1);
                    }}
                    className={`absolute top-0 right-0 w-6 h-20 rounded-b-sm transition-all duration-75 cursor-pointer z-20 translate-x-3 shadow-md ${
                      isNoteActive(note + 1)
                        ? 'bg-purple-500 border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)] h-[19.5vw] md:h-[76px]'
                        : 'bg-neutral-900 border-l border-r border-b border-neutral-800 hover:bg-neutral-800'
                    }`}
                    style={{ marginRight: '-12px' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
