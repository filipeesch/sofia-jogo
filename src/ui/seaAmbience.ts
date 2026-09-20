import { audioCtx } from './sfx';

// O fundo musical do mar.
//
// É tudo sintetizado aqui, sem um único ficheiro de som: o jogo inteiro vive de
// WebAudio e um mp3 em `public/` pesaria no arranque, teria um ciclo audível ao
// fim de trinta segundos e não podia encolher quando um estouro precisa do
// altifalante todo.
//
// A primeira versão deste fundo era uma caixinha de música aleatória sobre um
// tapete de acordes que deslizava. Ficava bonita em amostras de cinco segundos e
// cansava em cinco minutos, por uma razão simples: não tinha passo. O jogo do
// avião (`src/systems/AudioManager.ts`) tem, e é por isso que a música dele se
// canta. Este fundo é agora ESSE motor, com roupa de mar:
//
//   * uma `FAIXA` com o mesmo feitio de `MUSIC_TRACKS`: um `beat`, quatro notas
//     de baixo (uma por compasso), quatro acordes de quatro notas, e uma melodia
//     de dezasseis passos com pausas;
//   * o mesmo agulhador: um `setInterval` de 200 ms que agenda 1,2 s à frente,
//     reacerta quando o contexto esteve suspenso, e avança `passo` de 0 a 15;
//   * as mesmas três vozes por passo — baixo a cada quatro passos, uma nota do
//     acorde em cada passo, e a melodia onde o passo não é pausa;
//   * o mesmo motor grave por baixo de tudo (no avião é o do veículo; aqui é um
//     bordão a Dó, com o LFO do AudioManager);
//   * e as mesmas volumetrias: master 0,8, baixo 0,1, acorde 0,045, melodia 0,05.
//
// O que muda é só o traje: o passo é 0,95 s em vez de 0,68-0,9 (a água não anda
// a correr), a melodia toca numa caixinha — fundamental mais uma oitava um
// quarto acima, ataque de 60 ms — porque um sino abafado soa a longe e um
// sinusóide soa a sintetizador, e o MARULHO continua debaixo de tudo, que é o
// que diz «estamos debaixo de água» e o avião não tem.
//
// Duas regras que não se podem partir:
//
//   * As notas vêm todas da MESMA escala de cinco notas dos estouros (Dó Ré Mi
//     Sol Lá), em acordes que são subconjuntos dela. Sem semitons na música, uma
//     bolha rebentada por cima do fundo soa a música e não a dois barulhos a
//     disputarem-se o altifalante. Por isso aqui não há Fá nem Si.
//   * O fundo vive no AudioContext PARTILHADO de `sfx.ts`, não num contexto seu:
//     é o contexto que o `idleSfx()` sabe adormecer quando se vai para o
//     launcher, e um contexto próprio ficava a tocar lá depois de o brinquedo
//     ter fechado.

// A faixa. Mesmo formato, mesma leitura, outra música: um lamento curto de cinco
// notas que desce, volta a subir e fica em casa. As pausas são tantas como as
// notas — é o que faz uma melodia poder ser assobiada.
interface Faixa {
  beat: number;
  baixo: number[];
  acordes: number[][];
  melodia: number[];
}

const FAIXA: Faixa = {
  // 0,95 s por passo: dezasseis passos são 15,2 s de música antes de repetir, e
  // o mar não tem pressa nenhuma.
  beat: 0.95,
  // Uma nota por compasso, sempre o nome do compasso a dizer.
  baixo: [130.81, 110.0, 98.0, 73.42], // Dó · Lá · Sol · Ré
  acordes: [
    [261.63, 329.63, 392.0, 523.25], // Dó:  Dó Mi Sol Dó
    [220.0, 261.63, 329.63, 440.0],  // Lá:  Lá Dó Mi Lá
    [196.0, 293.66, 392.0, 440.0],   // Sol: Sol Ré Sol Lá
    [146.83, 220.0, 293.66, 440.0],  // Ré:  Ré Lá Ré Lá
  ],
  melodia: [
    659.25, 0, 587.33, 523.25,
    659.25, 0, 783.99, 659.25,
    0, 587.33, 523.25, 440.0,
    0, 523.25, 0, 0,
  ],
};

// O bordão: no avião é o motor do veículo, um triângulo a 95 Hz passado por um
// passa-baixas com um LFO a abanar-lhe a frequência. Aqui é um Dó duas oitavas
// abaixo do meio Dó da melodia, mais grave e mais mole — é o rumor do fundo do
// mar, e é a nota que dá nome ao primeiro compasso.
const BORDAO = 65.41;

let barramento: GainNode | null = null;
let marulho: AudioBufferSourceNode | null = null;
let bordao: OscillatorNode | null = null;
let lfos: OscillatorNode[] = [];
let ruido: AudioBuffer | null = null;
let taxaRuido = 0;
let temporizador: number | null = null;
let proximoPasso = 0;
let passo = 0;
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

/** A voz da melodia: fundamental + uma oitava um quarto acima, ataque de 60 ms e
 *  cauda comprida. O ataque lento é de propósito — o que assusta uma criança de
 *  três anos num altifalante de tablet é o ataque, não o volume. A cauda é a
 *  única licença poética em relação ao avião: um sino não pára de repente. */
function sino(t: number, f: number, intensidade: number, dur: number): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05 * intensidade, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
  o.stop(t + dur + 0.1);
  o2.stop(t + dur + 0.1);
  notasAgendadas++;
}

/** Baixo e acorde, na voz que o avião usa: sinusóide redonda para o grave,
 *  triângulo para a nota do meio. Mesmo envelope dele — ataque de 20 ms e
 *  descida exponencial — para que as duas músicas sejam da mesma casa. */
function nota(t: number, f: number, dur: number, tipo: OscillatorType, vol: number): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  const o = c.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(barramento);
  o.start(t);
  o.stop(t + dur + 0.05);
  notasAgendadas++;
}

/** Bolha a subir, muito ao longe: um sinusóide a deslizar para o agudo. É o
 *  gesto do brinquedo devolvido pelo fundo, e é tão baixinho que só se ouve
 *  quando não se está a estourar nada. Não faz parte do compasso: vem depois do
 *  passo, onde não atrapalha a melodia. */
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

/** O agulhador, copiado do `scheduleMusic()` do avião: um temporizador a olhar
 *  para 1,2 s à frente, dezasseis passos, baixo a cada quatro, uma nota do
 *  acorde em cada passo, melodia quando o passo não é pausa. Nada de
 *  `setInterval` por nota — é isso que faz a música picar quando um tablet
 *  atrasa um timer, porque cada nota ficava agendada atrás do atraso das
 *  outras. */
function agendar(): void {
  const c = audioCtx();
  if (!c || !barramento) return;
  if (document.visibilityState === 'hidden') return;
  const agora = c.currentTime;
  if (agora - proximoPasso > 0.25) proximoPasso = agora + 0.2;
  const horizonte = agora + 1.2;
  while (proximoPasso < horizonte) {
    const quando = proximoPasso;
    const p = passo % 16;
    const barra = Math.floor(p / 4);
    if (p % 4 === 0) nota(quando, FAIXA.baixo[barra], FAIXA.beat * 3.6, 'sine', 0.1);
    nota(quando, FAIXA.acordes[barra][p % 4], FAIXA.beat * 0.85, 'triangle', 0.045);
    const m = FAIXA.melodia[p];
    if (m > 0) sino(quando, m, 1, FAIXA.beat * 1.8);
    // Uma bolha a subir a cada oito compassos, fora do passo: é o único
    // ornamento que a água pede, e não desenha ritmo nenhum por si.
    if (p === 12 && Math.random() < 0.5) sobeBolha(quando + FAIXA.beat * 0.5);
    proximoPasso += FAIXA.beat;
    passo = (passo + 1) % 16;
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
  // O master do avião é 0,8; é esse o volume a que esta família já está
  // acostumada, por isso o mar entra com o mesmo e as vozes todas com as
  // volumetrias dele. O marulho é que é mais pequeno do que as outras vozes,
  // porque ruído à altura de uma nota tapa-lhe os contornos.
  barramento.gain.linearRampToValueAtTime(0.8, agora + 2.5); // o mar entra devagar
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
    g.gain.value = 0.022;
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
    gA.gain.value = 0.008;
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

  // 2 — o bordão, no feitio exacto do motor do avião: um triângulo grave com um
  // LFO a abanar-lhe a frequência, passado por um passa-baixas, a entrar em um
  // segundo. Dá corpo aos graves sem tapar a melodia, e é a nota do primeiro
  // compasso, por isso nunca desafina com o que quer que se toque.
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.value = BORDAO;
  const lfoO = c.createOscillator();
  lfoO.frequency.value = 0.4;
  const gO = c.createGain();
  gO.gain.value = 3;
  lfoO.connect(gO);
  gO.connect(o.frequency);
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 420;
  const gB = c.createGain();
  gB.gain.setValueAtTime(0.0001, agora);
  gB.gain.linearRampToValueAtTime(0.045, agora + 1);
  o.connect(filtro);
  filtro.connect(gB);
  gB.connect(barramento);
  o.start(agora);
  lfoO.start(agora);
  bordao = o;
  lfos.push(lfoO);

  passo = 0;
  proximoPasso = agora + 1.2;
  temporizador = window.setInterval(agendar, 200);
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
  const o = bordao;
  bordao = null;
  const mar = marulho;
  marulho = null;
  const l = lfos;
  lfos = [];
  try {
    b.gain.cancelScheduledValues(t);
    b.gain.setTargetAtTime(0, t, 0.02);
    if (o) { try { o.stop(t + 0.12); } catch { /* já parado */ } }
    l.forEach((x) => { try { x.stop(t + 0.12); } catch { /* já parado */ } });
    if (mar) { try { mar.stop(t + 0.12); } catch { /* já parado */ } }
  } catch {
    // sem contexto não há nada a parar: fica tudo desligado abaixo
  }
  window.setTimeout(() => {
    // Desligar é o que garante o silêncio, por isso não depende do áudio correr.
    try { o?.disconnect(); } catch { /* sem ligação */ }
    try { mar?.disconnect(); } catch { /* sem ligação */ }
    l.forEach((x) => { try { x.disconnect(); } catch { /* sem ligação */ } });
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
  tocando: boolean; notas: number; ganho: number; estado: string; fontes: number; passo: number;
} {
  const c = audioCtx();
  return {
    tocando: temporizador !== null,
    notas: notasAgendadas,
    ganho: barramento ? Number(barramento.gain.value.toFixed(3)) : 0,
    estado: c ? c.state : 'sem contexto',
    // Quantos nós do mar estão ainda ligados ao barramento. Fora do app tem de
    // ser 0: é a prova estrutural de que não sobrou nada para tocar.
    fontes: (bordao ? 1 : 0) + (marulho ? 1 : 0) + lfos.length,
    passo,
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
