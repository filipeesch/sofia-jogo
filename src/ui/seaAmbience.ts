import { audioCtx } from './sfx';

// O fundo musical do mar.
//
// É tudo sintetizado aqui, sem um único ficheiro de som: o jogo inteiro vive de
// WebAudio e um mp3 em `public/` pesaria no arranque, teria um ciclo audível ao
// fim de trinta segundos e não podia encolher quando um estouro precisa do
// altifalante todo.
//
// O mar é feito de três coisas, todas lentas:
//
//   1. o MARULHO — ruído castanho em loop, passado por um passa-baixas que sobe
//      e desce devagaríssimo e por um ganho que respira: é a única camada que
//      nunca pára, e é ela que diz «estamos debaixo de água»;
//   2. o DRONE — três senoidais a segurar um acorde, com as notas a deslizarem
//      de um acorde para o seguinte em ~2,5 s, como um motor de barco longe;
//   3. A CAIXINHA — uma nota isolada, duas oitavas acima dos estouros, de quando
//      em quando, com cauda comprida. É o brilho.
//
// Duas regras que não se podem partir:
//
//   * As notas vêm todas da MESMA escala de cinco notas dos estouros (Dó Ré Mi
//     Sol Lá), em acordes que são subconjuntos dela. Sem semitons na música, uma
//     bolha rebentada por cima do fundo soa a música e não a dois barulhos a
//     disputarem-se o altifalante.
//   * O volume é de fundo, não de acontecimento: barramento a 0,16 e cada nota
//     a 0,05 de pico, contra 0,26 do «plop» de uma bolha. Sem compressor e sem
//     filtros com Q alto, que em agudos soa a assobio e num altifalante de
//     tablet a série de coisas assusta.
//
// O fundo vive no AudioContext PARTILHADO de `sfx.ts`, não num contexto seu: é o
// contexto que o `idleSfx()` sabe adormecer quando se vai para o launcher, e um
// contexto próprio ficava a tocar lá depois de o brinquedo ter fechado.

// Duas oitavas acima dos estouros: a região onde nenhuma bolha anda, por isso
// música e brinquedo nunca se atropelam na mesma nota.
const CAIXINHA = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32, 2637.0];

// Acordes que são subconjuntos das cinco notas da escala dos estouros. Não há
// Fá nem Si: o Fá contra o Mi dos estouros é precisamente o semitom que dói.
const ACORDES: number[][] = [
  [130.81, 196.0, 329.63], // Dó - Sol - Mi
  [110.0, 130.81, 329.63], // Lá - Dó - Mi
  [98.0, 130.81, 293.66],  // Sol - Dó - Ré
];

let barramento: GainNode | null = null;
let marulho: AudioBufferSourceNode | null = null;
let padOsc: OscillatorNode[] = [];
let padGanho: GainNode | null = null;
let lfos: OscillatorNode[] = [];
let ruido: AudioBuffer | null = null;
let taxaRuido = 0;
let temporizador: number | null = null;
let proximaNota = 0;
let mudaAcorde = 0;
let nAcorde = 0;
let notasAgendadas = 0;

/** Ruído castanho de 3,2 s, criado UMA vez e posto em loop. Ruído branco puro
 *  em loop soa a chasco; o integrador abaixo atira a energia para os graves,
 *  que é onde uma ondulação distante mora. As pontas são em cruzado para o loop
 *  não se ouvir — sem isto ouve-se um "tuc" a cada 3,2 s. */
function ruidoDoMar(): AudioBuffer | null {
  const c = audioCtx();
  if (!c) return null;
  if (ruido && taxaRuido === c.sampleRate) return ruido;
  try {
    const n = Math.floor(c.sampleRate * 3.2);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < n; i++) {
      const branco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.022 * branco) / 1.022;
      d[i] = ultimo * 5;
    }
    const xf = Math.floor(n * 0.12);
    for (let i = 0; i < xf; i++) {
      const k = i / xf;
      d[i] = d[i] * k + d[n - xf + i] * (1 - k);
      d[n - xf + i] = 0;
    }
    ruido = buf;
    taxaRuido = c.sampleRate;
  } catch {
    return null;
  }
  return ruido;
}

/** Uma nota de caixinha: fundamental + oitava um quarto acima, ataque de 60 ms
 *  e cauda de 1,7 s. Ataque lento de propósito — o que assusta uma criança de
 *  três anos num altifalante de tablet é o ataque, não o volume. */
function sino(t: number, intensidade: number): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  const f = CAIXINHA[Math.floor(Math.random() * CAIXINHA.length)];
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05 * intensidade, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = f;
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = f * 2.01;
  const g2 = c.createGain();
  g2.gain.value = 0.26;
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(barramento);
  o.start(t);
  o2.start(t);
  o.stop(t + 1.8);
  o2.stop(t + 1.8);
  notasAgendadas++;
}

/** Bolha a subir, muito ao longe: um sinusóide a deslizar para o agudo. É o
 *  gesto do brinquedo devolvido pelo fundo, e é tão baixinho que só se ouve
 *  quando não se está a estourar nada. */
function sobeBolha(t: number): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(300 + Math.random() * 90, t);
  o.frequency.exponentialRampToValueAtTime(880 + Math.random() * 200, t + 0.55);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.026, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  o.connect(g);
  g.connect(barramento);
  o.start(t);
  o.stop(t + 0.7);
  notasAgendadas++;
}

/** O acorde seguinte, alcançado por deslizamento: não há corte nem ataque, as
 *  três notas simplesmente mudam de lugar uma na direção da outra. */
function trocarAcorde(t: number): void {
  nAcorde = (nAcorde + 1) % ACORDES.length;
  ACORDES[nAcorde].forEach((f, i) => {
    const o = padOsc[i];
    if (!o) return;
    o.frequency.cancelScheduledValues(t);
    o.frequency.setTargetAtTime(f, t, 2.4);
  });
  notasAgendadas++;
}

/** A única agenda do fundo: um temporizador a olhar para 1,2 s à frente. Nada de
 *  `setInterval` por nota — é isso que faz a música picar quando um tablet atrasa
 *  um timer, porque cada nota ficava agendada atrás do atraso das outras. */
function agendar(): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  if (document.visibilityState === 'hidden') return;
  const agora = c.currentTime;
  // Com o contexto suspenso o tempo parou: o plano ficou para trás e, sem este
  // reacertar, todas as notas em atraso disparariam juntas no primeiro segundo.
  if (proximaNota < agora) proximaNota = agora + 1.5;
  if (mudaAcorde < agora) mudaAcorde = agora + 3;
  const horizonte = agora + 1.2;
  while (proximaNota < horizonte) {
    sino(proximaNota, 1);
    if (Math.random() < 0.22) sino(proximaNota + 0.42, 0.6);
    if (Math.random() < 0.3) sobeBolha(proximaNota + 1.1);
    proximaNota += 7 + Math.random() * 9;
  }
  while (mudaAcorde < horizonte) {
    trocarAcorde(mudaAcorde);
    mudaAcorde += 17 + Math.random() * 7;
  }
}

/** Ligar o mar. Pode chamar-se muitas vezes: a segunda chamada não faz nada. É
 *  chamada no `mount` e outra vez a cada toque, porque antes do primeiro gesto o
 *  navegador não deixa sair som nenhum — e os nós todos já ficam prontos à
 *  espera dele. */
export function startMar(): void {
  const c = audioCtx();
  if (!c || temporizador !== null) return;

  const agora = c.currentTime;
  barramento = c.createGain();
  barramento.gain.setValueAtTime(0.0001, agora);
  barramento.gain.linearRampToValueAtTime(0.16, agora + 2.5); // o mar entra devagar
  barramento.connect(c.destination);
  if (medidorLigado()) pendurarMedidor();

  // 1 — o marulho. Uma fonte em loop, um filtro e um ganho, com dois LFOs a
  // mexer-lhes: é tudo o que custa o fundo inteiro.
  const buf = ruidoDoMar();
  if (buf) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 360;
    f.Q.value = 0.4;
    const g = c.createGain();
    g.gain.value = 0.08;
    marulho = c.createBufferSource();
    marulho.buffer = buf;
    marulho.loop = true;
    const lfoF = c.createOscillator();
    lfoF.frequency.value = 0.07;
    const gF = c.createGain();
    gF.gain.value = 170;
    lfoF.connect(gF);
    gF.connect(f.frequency);
    const lfoA = c.createOscillator();
    lfoA.frequency.value = 0.045;
    const gA = c.createGain();
    gA.gain.value = 0.026;
    lfoA.connect(gA);
    gA.connect(g.gain);
    marulho.connect(f);
    f.connect(g);
    g.connect(barramento);
    marulho.start(agora);
    lfoF.start(agora);
    lfoA.start(agora);
    lfos.push(lfoF, lfoA);
  }

  // 2 — o drone. Três senoidais com um detune mínimo uma na outra: desafinação
  // de cinco cents é o que faz um acorde soar a coisa viva e não a um gerador.
  padGanho = c.createGain();
  padGanho.gain.value = 0.045;
  const lfoP = c.createOscillator();
  lfoP.frequency.value = 0.085;
  const gP = c.createGain();
  gP.gain.value = 0.017;
  lfoP.connect(gP);
  gP.connect(padGanho.gain);
  padGanho.connect(barramento);
  ACORDES[0].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1) * 5;
    o.connect(padGanho!);
    o.start(agora);
    padOsc.push(o);
  });
  lfoP.start(agora);
  lfos.push(lfoP);

  nAcorde = 0;
  proximaNota = agora + 4;
  mudaAcorde = agora + 18;
  temporizador = window.setInterval(agendar, 250);
}

/** Desligar o mar. O ganho vai a zero em ~25 ms e os nós desligam-se a seguir:
 *  desligar o barramento é a única coisa que fica garantida mesmo que o contexto
 *  seja suspenso no mesmo instante — um evento de ganho agendado não acontece com
 *  o tempo parado, e o mar acordaria a tocar no app seguinte. */
export function pararMar(): void {
  if (temporizador !== null) {
    window.clearInterval(temporizador);
    temporizador = null;
  }
  const b = barramento;
  barramento = null;
  if (!b) return;
  const c = audioCtx();
  const t = c ? c.currentTime : 0;
  try {
    b.gain.cancelScheduledValues(t);
    b.gain.setTargetAtTime(0, t, 0.02);
    [...padOsc, ...lfos].forEach((o) => { try { o.stop(t + 0.12); } catch { /* já parado */ } });
    if (marulho) { try { marulho.stop(t + 0.12); } catch { /* já parado */ } }
  } catch {
    // sem contexto não há nada a parar: fica tudo desligado abaixo
  }
  const osc = padOsc; const l = lfos; const fonte = marulho; const pad = padGanho;
  padOsc = []; lfos = []; marulho = null; padGanho = null;
  window.setTimeout(() => {
    // Desligar é o que garante o silêncio, por isso não depende do áudio correr.
    try { pad?.disconnect(); } catch { /* sem ligação */ }
    osc.forEach((o) => { try { o.disconnect(); } catch { /* sem ligação */ } });
    l.forEach((o) => { try { o.disconnect(); } catch { /* sem ligação */ } });
    try { fonte?.disconnect(); } catch { /* sem ligação */ }
    try { b.disconnect(); } catch { /* sem ligação */ }
    // O medidor morre com o mar. Com o contexto suspenso ele deixaria de receber
    // amostras novas e continuaria a repetir o último quadro, o que pareceria um
    // mar a tocar onde já só há silêncio; `nivel()` passa a devolver -1.
    if (analisador) {
      try { analisador.disconnect(); } catch { /* sem ligação */ }
      analisador = null;
      anunciar();
    }
  }, 250);
}

/** Para a verificação: o fundo está ligado, quantas notas já agendou e a que
 *  volume está o barramento — é este número que diz se a música é fundo ou se se
 *  pôs a competir com os estouros. */
export function marEstado(): {
  tocando: boolean; notas: number; ganho: number; estado: string; fontes: number;
} {
  const c = audioCtx();
  return {
    tocando: temporizador !== null,
    notas: notasAgendadas,
    ganho: barramento ? Number(barramento.gain.value.toFixed(3)) : 0,
    estado: c ? c.state : 'sem contexto',
    // Quantos nós do mar estão ainda ligados ao barramento. Fora do app tem de
    // ser 0: é a prova estrutural de que não sobrou nada para tocar.
    fontes: padOsc.length + lfos.length + (marulho ? 1 : 0),
  };
}

// ── Medidor de serviço, só com `?debug=1` ─────────────────────────────────
//
// O mesmo feitio do `__debug` do `DebugCapture`: um ganha-pão para quem tem de
// provar que o som está lá. Um `AnalyserNode` pendurado no barramento mede os
// AMOSTRAS que estão a sair, não a intenção do código: diz-nos se o mar está
// mesmo a soar, a que altura, e se fica em silêncio absoluto depois de sair do
// app. Sem o `?debug=1` nada disto é criado.
let analisador: AnalyserNode | null = null;

function medidorLigado(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
}

function pendurarMedidor(): void {
  const c = audioCtx();
  if (!c || !barramento || analisador) return;
  try {
    analisador = c.createAnalyser();
    analisador.fftSize = 1024;
    barramento.connect(analisador);
  } catch {
    analisador = null;
  }
  anunciar();
}

/** Quem mede é quem toca. O medidor é oferecido pelo `startMar` — pela instância
 *  que está mesmo a tocar — e não na carga do módulo: em desenvolvimento o
 *  mesmo ficheiro pode ser carregado duas vezes (o Vite muda-lhe a URL a cada
 *  edição), e um medidor oferecido pela cópia errada mostraria um mar calmo
 *  enquanto o outro estava a tocar. */
function anunciar(): void {
  if (!medidorLigado()) return;
  const g = window as unknown as Record<string, unknown>;
  g.__mar = { estado: () => marEstado(), nivel: () => marNivel(), medir: pendurarMedidor };
}

/** RMS do que está a sair do fundo musical, 0 a 1. `-1` sem medidor. */
export function marNivel(): number {
  if (!analisador) return -1;
  const dados = new Float32Array(analisador.fftSize);
  analisador.getFloatTimeDomainData(dados);
  let soma = 0;
  for (let i = 0; i < dados.length; i++) soma += dados[i] * dados[i];
  return Math.sqrt(soma / dados.length);
}
