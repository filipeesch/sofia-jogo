// Gera public/voice/manifest.example.json - a lista de palavras que o jogo
// fala, para quem quiser gravar (ou gerar por TTS) clipes pt-PT.
//
//   node scripts/gen-voice-manifest.mjs
//
// Copiar o ficheiro gerado para public/voice/manifest.json e colocar os mp3
// ao lado: a partir daí o jogo usa as gravações e deixa de depender do
// speechSynthesis (que no iOS depende das vozes instaladas). Ver
// docs/voz-pt.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'src/apps/puzzleLetters.ts',
  'src/apps/puzzleNumbers.ts',
  'src/apps/puzzleAnimals.ts',
  'src/apps/puzzleVehicles.ts',
  'src/apps/puzzleFruits.ts',
  'src/apps/PaintApp.ts',
];

/** 'Dáblio' -> 'dablio' (a mesma normalização de src/ui/speech.ts). */
const key = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-');

const words = new Set();
for (const f of files) {
  const src = readFileSync(join(root, f), 'utf8');
  // name: 'Cão' | label: 'Azul' | spoken: 'barco'
  for (const m of src.matchAll(/(?:name|label|spoken):\s*'([^']+)'/g)) {
    const w = m[1].trim();
    if (w && !/^[^\p{L}]/u.test(w)) words.add(w);
  }
}

// 'Veleiro' é falado como 'barco': o que conta é a forma falada.
words.add('barco');

const clips = {};
for (const w of [...words].sort((a, b) => key(a).localeCompare(key(b)))) {
  clips[key(w)] = 'voice/' + key(w) + '.mp3';
}

const out = {
  _readme: 'Copiar para manifest.json e colocar os mp3 nesta pasta. Um ficheiro por palavra, gravados em português europeu (pt-PT). As chaves são a palavra falada, sem acentos e em minúsculas; o nome do ficheiro é a chave. Palavra repetida (p.ex. Gato, Azul) = um só ficheiro, partilhado por todos os jogos.',
  palavras: Object.fromEntries([...words].sort((a, b) => key(a).localeCompare(key(b))).map((w) => [key(w), w])),
  clips
};

mkdirSync(join(root, 'public', 'voice'), { recursive: true });
const dest = join(root, 'public', 'voice', 'manifest.example.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + String.fromCharCode(10));
console.log(dest, '-', Object.keys(clips).length, 'palavras');
