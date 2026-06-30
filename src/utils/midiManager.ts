// Web MIDI API Manager
import { MidiOutput } from '../types';

export class MidiManager {
  private midiAccess: any = null;
  private selectedOutput: MidiOutput | null = null;
  private onOutputsChanged: (outputs: MidiOutput[]) => void = () => {};

  public async requestAccess(onOutputsChanged: (outputs: MidiOutput[]) => void): Promise<boolean> {
    this.onOutputsChanged = onOutputsChanged;
    
    const nav = navigator as any;
    if (!nav.requestMIDIAccess) {
      console.warn("Web MIDI API is not supported in this browser.");
      return false;
    }

    try {
      this.midiAccess = await nav.requestMIDIAccess();
      
      // Listen for hardware connections/disconnections
      this.midiAccess.onstatechange = () => {
        this.triggerOutputsChanged();
      };
      
      this.triggerOutputsChanged();
      return true;
    } catch (err) {
      console.error("Error accessing Web MIDI API:", err);
      return false;
    }
  }

  private triggerOutputsChanged() {
    if (!this.midiAccess) return;
    const outputs: MidiOutput[] = [];
    this.midiAccess.outputs.forEach((output: any) => {
      outputs.push({
        id: output.id,
        name: output.name,
        send: (data: number[] | Uint8Array) => output.send(data)
      });
    });
    this.onOutputsChanged(outputs);
    
    // Select first output by default if none is selected
    if (outputs.length > 0 && !this.selectedOutput) {
      this.selectedOutput = outputs[0];
    }
  }

  public selectOutput(deviceId: string) {
    if (!this.midiAccess) return;
    let found = false;
    this.midiAccess.outputs.forEach((output: any) => {
      if (output.id === deviceId) {
        this.selectedOutput = {
          id: output.id,
          name: output.name,
          send: (data: number[] | Uint8Array) => output.send(data)
        };
        found = true;
      }
    });
    if (!found) {
      this.selectedOutput = null;
    }
  }

  public sendNoteOn(midiNote: number, velocity: number = 0.8, channel: number = 0) {
    if (!this.selectedOutput) return;

    const noteOnByte = 0x90 | (channel & 0x0F);
    const velByte = Math.round(velocity * 127) & 0x7F;
    const noteByte = midiNote & 0x7F;

    try {
      this.selectedOutput.send([noteOnByte, noteByte, velByte]);
    } catch (e) {
      console.error("Error sending MIDI Note On:", e);
    }
  }

  public sendNoteOff(midiNote: number, channel: number = 0) {
    if (!this.selectedOutput) return;

    const noteOffByte = 0x80 | (channel & 0x0F);
    const noteByte = midiNote & 0x7F;

    try {
      this.selectedOutput.send([noteOffByte, noteByte, 0]);
    } catch (e) {
      console.error("Error sending MIDI Note Off:", e);
    }
  }

  /**
   * Send MIDI Pitch Bend based on cents offset.
   * Assumes a standard pitch bend range of +/- 2 semitones (+/- 200 cents).
   */
  public sendPitchBend(centsOffset: number, channel: number = 0) {
    if (!this.selectedOutput) return;

    // Pitch bend range of +/- 200 cents. Map -100..+100 cents to bendValue
    // Midpoint is 8192 (no bend)
    // Range is 0 to 16383
    const centsPercent = centsOffset / 200; // -0.5 to +0.5
    const bendValue = Math.max(0, Math.min(16383, Math.round(8192 + centsPercent * 8192)));

    const pitchBendByte = 0xE0 | (channel & 0x0F);
    const lsb = bendValue & 0x7F;
    const msb = (bendValue >> 7) & 0x7F;

    try {
      this.selectedOutput.send([pitchBendByte, lsb, msb]);
    } catch (e) {
      console.error("Error sending MIDI Pitch Bend:", e);
    }
  }

  public sendAllNotesOff(channel: number = 0) {
    if (!this.selectedOutput) return;
    
    // Command 123 (All Notes Off) on Control Change
    const ccByte = 0xB0 | (channel & 0x0F);
    try {
      this.selectedOutput.send([ccByte, 123, 0]);
    } catch (e) {
      console.error("Error sending MIDI All Notes Off:", e);
    }
  }
}
