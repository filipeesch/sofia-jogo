import type { PuzzleItem } from './PuzzleApp';

// Letras A-Z.
//
// 'name' is BOTH the label and the thing that gets spoken, so every entry is
// the real pt-PT name of the letter as a word - never the bare letter. A
// Portuguese voice reads a lone "F" as the sound /f/ (or nothing), while the
// name is the word "efe"; the accents are load-bearing too: without them
// "e"/"o" reduce to /ɨ//u/ and "aga" becomes the verb "agar".
//
// Names follow Base I, 1.º of the Acordo Ortográfico de 1990, as published by
// the Academia das Ciências de Lisboa
// (https://vocabulario.acad-ciencias.pt/index.php/ortografia/texto-integral-do-ao90):
//   a A (á) b B (bê) c C (cê) d D (dê) e E (é) f F (efe) g G (gê ou guê)
//   h H (agá) i I (i) j J (jota) k K (capa ou cá) l L (ele) m M (eme)
//   n N (ene) o O (ó) p P (pê) q Q (quê) r R (erre) s S (esse) t T (tê)
//   u U (u) v V (vê) w W (dáblio) x X (xis) y Y (ípsilon) z Z (zê)
// K is 'capa', the name the Acordo lists FIRST ('capa ou cá'): it is spelled
// with a c but read ka-pa, which is what the schools say, and a child never
// sees a k inside the name of the letter K. 'Cá' (the second variant) would be
// read /ka/ - the sound, not the name.
//
// Common school/BR forms that are NOT used here: fê, há (= the verb haver),

// él, em, en, qué, dábliu (BR), Ipsilon. "xis" is read "x(i)sh" in Portugal,
// never "ks".
const BASE: Omit<PuzzleItem, 'speak'>[] = [
  { emoji: 'A', name: 'Á' },
  { emoji: 'B', name: 'Bê' },
  { emoji: 'C', name: 'Cê' },
  { emoji: 'D', name: 'Dê' },
  { emoji: 'E', name: 'É' },
  { emoji: 'F', name: 'Efe' },
  { emoji: 'G', name: 'Gê' },
  { emoji: 'H', name: 'Agá' },
  { emoji: 'I', name: 'I' },
  { emoji: 'J', name: 'Jota' },
  { emoji: 'K', name: 'Capa' },
  { emoji: 'L', name: 'Ele' },
  { emoji: 'M', name: 'Eme' },
  { emoji: 'N', name: 'Ene' },
  { emoji: 'O', name: 'Ó' },
  { emoji: 'P', name: 'Pê' },
  { emoji: 'Q', name: 'Quê' },
  { emoji: 'R', name: 'Erre' },
  { emoji: 'S', name: 'Esse' },
  { emoji: 'T', name: 'Tê' },
  { emoji: 'U', name: 'U' },
  { emoji: 'V', name: 'Vê' },
  { emoji: 'W', name: 'Dáblio' },
  { emoji: 'X', name: 'Xis' },
  { emoji: 'Y', name: 'Ípsilon' },
  { emoji: 'Z', name: 'Zê' },
];

export const LETTERS: PuzzleItem[] = BASE.map((i) => ({ ...i, speak: true }));
