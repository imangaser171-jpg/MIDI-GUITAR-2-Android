import { MidiLogMessage } from '../types';

export class MidiManager {
  private midiAccess: any = null;
  private selectedOutput: any = null;
  private onLogCallback: ((message: MidiLogMessage) => void) | null = null;
  private activeNotes: Map<number, number> = new Map(); // midiNote -> velocity

  constructor() {
    this.initMidi();
  }

  private async initMidi() {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      this.logSystem('Web MIDI API is not supported in this browser.');
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      if (!this.midiAccess) return;

      const outputs = Array.from(this.midiAccess.outputs.values());
      
      if (outputs.length > 0) {
        // Automatically select first available MIDI output port
        this.selectedOutput = outputs[0];
        this.logSystem(`Connected to MIDI Output: ${this.selectedOutput.name}`);
      } else {
        this.logSystem('No MIDI outputs detected. Use virtual synth or connect hardware.');
      }

      this.midiAccess.onstatechange = (event: any) => {
        const port = event.port;
        if (port.type === 'output') {
          const currentOutputs = Array.from(this.midiAccess.outputs.values());
          if (currentOutputs.length > 0 && !this.selectedOutput) {
            this.selectedOutput = currentOutputs[0];
            this.logSystem(`Connected to MIDI Output: ${this.selectedOutput.name}`);
          } else if (currentOutputs.length === 0) {
            this.selectedOutput = null;
            this.logSystem('MIDI Output disconnected.');
          }
        }
      };
    } catch (err) {
      this.logSystem(`Failed to initialize MIDI: ${err}`);
    }
  }

  public getOutputs(): any[] {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.outputs.values());
  }

  public selectOutput(portId: string) {
    if (!this.midiAccess) return;
    const outputs = this.getOutputs();
    const found = outputs.find(o => o.id === portId);
    if (found) {
      this.selectedOutput = found;
      this.logSystem(`Switched MIDI Output to: ${found.name}`);
    }
  }

  public registerLogCallback(callback: (message: MidiLogMessage) => void) {
    this.onLogCallback = callback;
  }

  private logSystem(text: string) {
    if (this.onLogCallback) {
      this.onLogCallback({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type: 'Pitch Bend', // use Pitch Bend for status messages or log them clearly
        note: 0,
        noteName: 'SYS',
        velocity: 0,
        extra: text
      });
    }
  }

  /**
   * Send a Note On message (0x90)
   */
  public sendNoteOn(midiNote: number, velocity = 100) {
    if (this.activeNotes.has(midiNote)) return; // Prevent double trigger
    this.activeNotes.set(midiNote, velocity);

    if (this.selectedOutput) {
      try {
        const noteOnMessage = [0x90, midiNote, velocity];
        this.selectedOutput.send(noteOnMessage);
      } catch (e) {
        console.error('Error sending MIDI Note On:', e);
      }
    }

    if (this.onLogCallback) {
      this.onLogCallback({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type: 'Note On',
        note: midiNote,
        noteName: this.getNoteName(midiNote),
        velocity,
        extra: this.selectedOutput ? `Sent to ${this.selectedOutput.name}` : 'Virtual Synth Only'
      });
    }
  }

  /**
   * Send a Note Off message (0x80)
   */
  public sendNoteOff(midiNote: number) {
    if (!this.activeNotes.has(midiNote)) return;
    this.activeNotes.delete(midiNote);

    if (this.selectedOutput) {
      try {
        const noteOffMessage = [0x80, midiNote, 0];
        this.selectedOutput.send(noteOffMessage);
      } catch (e) {
        console.error('Error sending MIDI Note Off:', e);
      }
    }

    if (this.onLogCallback) {
      this.onLogCallback({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type: 'Note Off',
        note: midiNote,
        noteName: this.getNoteName(midiNote),
        velocity: 0,
        extra: this.selectedOutput ? `Sent to ${this.selectedOutput.name}` : 'Virtual Synth Only'
      });
    }
  }

  /**
   * Send a Pitch Bend message (0xE0)
   * cents range: -100 to +100
   */
  public sendPitchBend(cents: number) {
    if (!this.selectedOutput) return;

    // Pitch Bend is a 14-bit value: 0x0000 to 0x3FFF (0 to 16383), center is 0x2000 (8192)
    // Assume +/- 2 semitones default pitch bend range (200 cents total bend)
    const rangeCents = 200; 
    const norm = Math.max(-1, Math.min(1, cents / rangeCents));
    const bendValue = Math.round(8192 + norm * 8191);

    const lsb = bendValue & 0x7F;       // Lower 7 bits
    const msb = (bendValue >> 7) & 0x7F; // Upper 7 bits

    try {
      this.selectedOutput.send([0xE0, lsb, msb]);
    } catch (e) {
      console.error('Error sending MIDI Pitch Bend:', e);
    }
  }

  private getNoteName(midiNote: number): string {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const idx = (midiNote % 12 + 12) % 12;
    const oct = Math.floor(midiNote / 12) - 1;
    return `${names[idx]}${oct}`;
  }

  public clearAll() {
    this.activeNotes.forEach((_, note) => {
      this.sendNoteOff(note);
    });
    this.activeNotes.clear();
  }
}
