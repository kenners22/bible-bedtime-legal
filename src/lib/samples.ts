// The two-minute samples a story page can play (src/data/samples.json).
// Each entry: { "id": a story id, "src": the sound file's address, "seconds": its length }.
// A story with no entry shows no player. The list ships empty until the files
// have a home.
//
// The tests build a second copy of the site with SAMPLES_FILE pointing at a
// stand-in list (tests/fixtures/samples.json), so the player can be checked
// without any sample shipping.
import fs from 'node:fs';
import shipped from '../data/samples.json';

export interface Sample {
  id: string;
  src: string;
  seconds: number;
}

function load(): Sample[] {
  const file = process.env.SAMPLES_FILE;
  return file ? JSON.parse(fs.readFileSync(file, 'utf8')) : (shipped as Sample[]);
}

const byId = new Map(load().map((s) => [s.id, s]));

export const sampleFor = (id: string): Sample | undefined => byId.get(id);

/** "2:00" for 120 seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
