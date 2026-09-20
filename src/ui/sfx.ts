let ctx: AudioContext | null = null;

export function audioCtx(): AudioContext | null {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // Pode estar adormecido por idleSfx() ou pelo ecrã bloqueado: quem pede o
  // context quer ouvir alguma coisa, por isso acorda-o aqui, sem gestos.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Este AudioContext é partilhado e vive para sempre (é a cache dos sons
// gravados), por isso tem de saber adormecer. Sem isto, depois de voltar ao
// launcher ficava um context 'running' a segurar o hardware de áudio — um dos
// motivos por que a app parecida não fechar quando ia para o launcher.
export function idleSfx(): void {
  if (ctx && ctx.state === 'running') void ctx.suspend();
}

// iOS parks the context in 'interrupted' after a phone call, the silent
// switch or a tab switch - 'suspended' alone is not enough there.
export function resume(): void {
  const c = audioCtx();
  if (c && c.state !== 'running') void c.resume().catch(() => { /* still locked */ });
}

// Com o ecrã bloqueado ou a app em segundo plano nada pode sair pelos
// altifalantes — nem sequer um context parado a acordar a página.
document.addEventListener('visibilitychange', () => {
  try {
    if (document.visibilityState === 'hidden') idleSfx();
    else if (ctx && ctx.state === 'suspended') void ctx.resume();
  } catch {
    // alguns navegadores não deixam suspender/resumir — não há nada a fazer
  }
});

export function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, glideTo?: number, delay = 0): void {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function bark(): void { tone(300, 0.08, 'square', 0.2); tone(220, 0.1, 'square', 0.18); }
export function meow(): void { tone(720, 0.3, 'triangle', 0.16, 380); }
export function cluck(): void { tone(900, 0.05, 'square', 0.13); tone(700, 0.05, 'square', 0.13); tone(900, 0.06, 'square', 0.13); }
export function baa(): void { tone(220, 0.4, 'sawtooth', 0.12, 300); }
export function moo(): void { tone(160, 0.5, 'sawtooth', 0.14, 120); }
export function quack(): void { tone(420, 0.1, 'square', 0.15, 300); }
export function oink(): void { tone(240, 0.12, 'square', 0.16, 180); tone(200, 0.12, 'square', 0.14, 150, 0.16); }
export function neigh(): void { tone(600, 0.4, 'sawtooth', 0.12, 900); tone(700, 0.3, 'sawtooth', 0.1, 1000, 0.15); }
export function roar(): void { tone(90, 0.6, 'sawtooth', 0.22, 160); tone(70, 0.5, 'square', 0.14, 120, 0.1); }
export function ribbit(): void { tone(120, 0.18, 'square', 0.18, 80); tone(140, 0.14, 'square', 0.14, 90, 0.22); }
export function hoot(): void { tone(400, 0.18, 'sine', 0.2, 320); tone(380, 0.22, 'sine', 0.16, 300, 0.24); }
export function crow(): void { tone(880, 0.12, 'square', 0.15); tone(700, 0.1, 'square', 0.14, 600, 0.14); tone(950, 0.2, 'square', 0.15, 800, 0.28); }
export function popSound(): void { tone(600, 0.08, 'triangle', 0.22, 300); }

// Escala pentatônica de Dó (Dó Ré Mi Sol Lá) em três oitavas, da mais grave à
// mais aguda. Não há semitons, por isso duas notas quaisquer soam bem juntas:
// no app das bolhas não existe toque errado.
const PENTA = [
  130.81, 146.83, 164.81, 196.0, 220.0,
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
];

/** A nota duma bolha: as grandes mais graves, as pequenas mais agudas. */
export function bubbleTone(sizePx: number): void {
  const t = Math.min(1, Math.max(0, (sizePx - 70) / 190));
  const i = Math.round((1 - t) * (PENTA.length - 1));
  tone(PENTA[i], 0.16, 'triangle', 0.2);
}

/** Nota ascendente para cada toque parcial duma bolha gigante. */
export function bubbleTapStep(step: number): void {
  tone(PENTA[Math.min(PENTA.length - 1, 4 + step * 3)], 0.12, 'triangle', 0.18);
}

// ── Bolhas: o som de uma bolha a rebentar ─────────────────────────────────
//
// Tudo sintetizado — não há (nem precisa de haver) um ficheiro de bolha em
// public/sounds/. Um estouro de verdade são duas coisas a acontecer ao mesmo
// tempo: a película a arrebentar (um estalido de banda larga de ~50 ms) e o ar
// a escapar-se (um "plop" que desliza para grave). A nota pentatónica por baixo
// é cauda musical, não o ataque: é ela que faz 200 estouros soarem a música e
// não a um teclado avariado.

let ruído: AudioBuffer | null = null;

/** Ruído branco de ~128 ms, criado UMA vez e partilhado por todos os estouros.
 *  Gerar ruído a cada toque seria CPU deitada fora num tablet fraco. */
export function noiseBuffer(): AudioBuffer | null {
  if (ruído) return ruído;
  const c = audioCtx();
  if (!c) return null;
  try {
    ruído = c.createBuffer(1, Math.floor(c.sampleRate * 0.128), c.sampleRate);
    const dados = ruído.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  } catch {
    return null;
  }
  return ruído;
}

/** Estalido: passa-banda sobre o ruído, com envelope a fechar depressa. É banda
 *  larga e curtíssimo, por isso NÃO desafina com a nota que soa por baixo. */
export function pop(vol = 0.16, hz = 1100, dur = 0.05, delay = 0): void {
  const c = audioCtx();
  if (!c) return;
  const buf = noiseBuffer();
  if (!buf) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = hz;
  f.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t, Math.random() * 0.06);
  src.stop(t + dur + 0.02);
}

/** O "plop": seno a deslizar para grave. Bolha grande = mais grave e mais
 *  comprido; pequena = mais agudo e mais seco. */
export function blip(sizePx: number): void {
  const t = Math.min(1, Math.max(0, (sizePx - 70) / 190)); // 0 = pequena, 1 = gigante
  tone(780 - 180 * t, 0.075 + 0.02 * t, 'sine', 0.26, 250 - 80 * t);
}

/** Os três juntos, no mesmo gesto: estalido + plop + nota da escala. */
export function bubbleBurst(sizePx: number): void {
  pop(sizePx > 150 ? 0.2 : 0.15, sizePx > 150 ? 900 : 1200);
  blip(sizePx);
  bubbleTone(sizePx);
}

/** Chuvisco: uma data de estalidos muito curtos em instantes pseudo-aleatórios.
 *  É o corpo do fogo de artifício — e é feito só de agudos, porque um estrondo
 *  grave e súbito a volume de tablet assusta uma criança de 3 anos. */
export function sparkleCrackle(count = 8, spread = 0.42): void {
  for (let i = 0; i < count; i++) {
    pop(0.05 + Math.random() * 0.04, 1500 + Math.random() * 2000, 0.03 + Math.random() * 0.03,
      0.08 + (i / count) * spread + Math.random() * 0.05);
  }
}

/** O fogo de artifício: assobio a descer (o foguete) e depois o chuvisco. */
export function sparkle(): void {
  tone(1200, 0.28, 'sine', 0.13, 400);
  sparkleCrackle();
}

/** Glup-glup do peixe: três bolhas de ar abafadas, SEM nota da escala — é som
 *  de ar, não música, e assim não choca com um estouro quase simultâneo. */
export function glup(): void {
  for (let i = 0; i < 3; i++) {
    tone(300 + Math.random() * 130, 0.06, 'sine', 0.11, 170, i * 0.09);
  }
}

// ── Bolhas: o fundo ganhou vida ───────────────────────────────────────────
//
// Plantas, conchas e cavalos-marinhos respondem a toque. Três sons curtos e
// muito mais baixos que um estouro: o cenário é um mimo, não um rival das
// bolhas. Nenhum deles leva nota da escala — são matéria de água e de ar, e
// assim não desafinam com um estouro quase simultâneo (a mesma razão do glup).

/** Planta do fundo tocada: bolhinhas de ar a escaparem-se, três tiques cada vez
 *  mais agudos e mais depressa — é o ar a subir, não uma melodia. */
export function puff(): void {
  for (let i = 0; i < 3; i++) {
    tone(880 + i * 240 + Math.random() * 90, 0.05, 'sine', 0.075, 1480 + i * 260, i * 0.055);
  }
}

/** Concha que se fecha e se abre: dois estalidos secos — o reaproveitamento do
 *  estalido das bolhas, mais grave e abafado, para soar à mesma família — e um
 *  brilhinho agudo quando ela reabre. */
export function clique(): void {
  pop(0.12, 720, 0.045);
  pop(0.1, 560, 0.05, 0.09);
  tone(1500, 0.05, 'sine', 0.06, 1950, 0.16);
}

/** Cavalo-marinho: duas notas muito curtas a subir, um assobio de brinquedo. */
export function trill(): void {
  tone(880, 0.07, 'triangle', 0.11, 1180);
  tone(1180, 0.09, 'triangle', 0.09, 1560, 0.08);
}

/** Ostra que se abre: a charneira a ceder (um estalido grave e abafado, da
 *  mesma família do fecho das conchas), a valva a descolar-se (um segundo
 *  estalido mais longo e mais agudo) e, quando a pérola apanha a luz, um brilho
 *  agudo e comprido — duas notas da escala (G e C) duas oitavas acima dos
 *  estouros, que é onde uma bolha nunca vai bater. Os três juntos ficam abaixo
 *  de um quarto do volume de um estouro: a ostra é a mais rica do fundo e mesmo
 *  assim é um mimo. */
export function abraOstra(): void {
  pop(0.085, 380, 0.07);
  pop(0.055, 620, 0.13, 0.07);
  tone(1568, 0.42, 'sine', 0.042, 2093, 0.19);
  tone(2093, 0.5, 'sine', 0.026, undefined, 0.3);
}

/** Caranguejo assustado: dois estalidos de tenaz, secos e curtos — o som de duas
 *  unhas a bater uma na outra — e um E a subir até G, baixinho, por cima. É o
 *  susto dele, não uma fanfarra: o pico fica em 0,075, um terço de um estouro. */
export function pinca(): void {
  pop(0.075, 760, 0.035);
  pop(0.06, 540, 0.03, 0.06);
  tone(1318.51, 0.16, 'sine', 0.03, 1567.98, 0.11);
}

// Procedural fallbacks for the vehicles puzzle (used only when the real
// MP3 cannot be loaded).
export function carHorn(): void { tone(400, 0.09, 'square', 0.16); tone(400, 0.1, 'square', 0.16, undefined, 0.17); }
export function taxiDing(): void { tone(1320, 0.1, 'sine', 0.2); tone(1760, 0.16, 'sine', 0.15, undefined, 0.07); }
export function policeSiren(): void { tone(700, 0.13, 'sine', 0.2, 950); tone(950, 0.13, 'sine', 0.2, 700, 0.14); }
export function ambulanceSiren(): void { tone(520, 0.18, 'sine', 0.2, 1000); tone(1000, 0.18, 'sine', 0.2, 520, 0.2); }
export function fireSiren(): void { tone(600, 0.24, 'sawtooth', 0.11, 900); tone(900, 0.24, 'sawtooth', 0.11, 600, 0.26); }
export function truckHorn(): void { tone(110, 0.5, 'square', 0.22, 105); }
export function busHorn(): void { tone(165, 0.35, 'square', 0.2, 150); }
export function bikeBell(): void { tone(1560, 0.08, 'sine', 0.24); tone(1560, 0.14, 'sine', 0.2, undefined, 0.13); }
export function motorcycleRev(): void { tone(150, 0.35, 'sawtooth', 0.15, 430); }
export function trainWhistle(): void { tone(620, 0.7, 'sine', 0.2); tone(748, 0.7, 'sine', 0.13, undefined, 0.02); }
export function airplaneEngine(): void { tone(90, 0.9, 'sawtooth', 0.13, 260); }
export function helicopterWhup(): void { for (let i = 0; i < 4; i++) tone(85, 0.07, 'sine', 0.24, 60, i * 0.11); }
export function rocketLaunch(): void { tone(100, 0.8, 'sawtooth', 0.18, 700); tone(55, 0.8, 'square', 0.1, 120); }
export function boatHorn(): void { tone(105, 0.55, 'sine', 0.24, 100); }
export function tractorRumble(): void { tone(58, 0.8, 'sawtooth', 0.16, 85); tone(40, 0.8, 'square', 0.1, 60, 0.05); }

// Puzzle feedback (animal-puzzle): miss, hit and win.
export function thump(): void { tone(150, 0.2, 'sine', 0.1, 90); }

/** Par errado da memória: um "ups" fofo — duas notas de triângulo a descer,
 *  a segunda mais grave e mais comprida. Ao contrário do thump (150→90 Hz,
 *  que desenha o "erro" do quebra-cabeças), vive na banda 330–523 Hz que os
 *  altifalantes minúsculos de tablet e telemóvel conseguem realmente
 *  reproduzir: abaixo de ~200 Hz o hardware simplesmente apaga o som. O
 *  volume fica um degrau acima do ding do acerto — ouve-se sem sustos. */
export function missBoop(): void {
  tone(523.25, 0.12, 'triangle', 0.2, 440);
  tone(392, 0.2, 'triangle', 0.18, 330, 0.13);
}
export function ding(): void { tone(660, 0.1, 'triangle', 0.14); tone(990, 0.14, 'triangle', 0.14, undefined, 0.09); }
export function win(): void {
  tone(523, 0.14, 'triangle', 0.16, undefined, 0);
  tone(659, 0.14, 'triangle', 0.16, undefined, 0.13);
  tone(784, 0.14, 'triangle', 0.16, undefined, 0.26);
  tone(1047, 0.3, 'triangle', 0.18, undefined, 0.39);
}
