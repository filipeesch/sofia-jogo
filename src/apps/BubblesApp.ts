import { abraOstra, bubbleBurst, bubbleTapStep, clique, glup, idleSfx, pinca, puff, resume, sparkle, trill, win } from '../ui/sfx';
import { pararMar, startMar } from '../ui/seaAmbience';
import { ALGA, BAIACU, BOLHA_SOPRAR, CAVALO_MARINHO, CARANGUEJO, CONCHA_ESPIRAL, CONCHA_VIEIRA, OSTRA, PEIXE_PRATA, PEIXE_TROPICAL } from './bubblesSprites';

// Bolhas: um brinquedo, não um jogo. Cada bolha é só um conjunto de atributos
// (dimensão, cor, carga) e cada atributo devolve qualquer coisa à criança — o
// som de uma bolha a rebentar pela dimensão, a cor pelo estouro e pelo fogo, o
// fogo de artifício pelo esforço dos três toques.
//
// Nada aqui é dito. Nem o nome da cor, nem o de um animal: uma frase custa
// ~1,5 s e faria a criança esperar por aquilo que ela acabou de provocar. A cor
// é a matéria visual do brinquedo, não vocabulário. Não há pontuação, tempo,
// nem maneira de errar: uma bolha que escapa pelo topo simplesmente sai.

type Kind = 'pequena' | 'comum' | 'gigante';

interface Cor { css: string }

// Seis cores nítidas; uma vaga nova estreará sempre mais uma.
const CORES: Cor[] = [
  // Azul é mais escuro que a água (#7fd8f5 no topo do gradiente): senão a bolha
  // azul confunde-se com o fundo e desaparece para quem tem 3 anos.
  { css: '#2f9ae0' },
  { css: '#ff6f6f' },
  { css: '#6fdc82' },
  { css: '#ffd94a' },
  { css: '#b58cff' },
  { css: '#ffa24d' },
];

// Diâmetros. Uma bolha comum nunca nasce abaixo dos 72 px: é o dedo de uma
// criança de 2-3 anos que decide este número, não o gosto visual.
const DIAM: Record<Kind, [number, number]> = {
  pequena: [56, 70],
  comum: [78, 126],
  gigante: [188, 226],
};

const MAX_NO_ECRÃ = 8;
const RITMO_MS = 900;
const BOLHAS_POR_VAGA = 6;
const TOQUES_GIGANTE = 3;

// Fogo de artifício. Quatro formas, sempre tintadas pela cor da bolha que
// rebentou: é isso que faz o trabalho da novidade que os animais faziam.
type Forma = 'roda' | 'chuveiro' | 'espiral' | 'coroa';
const FORMAS: Forma[] = ['roda', 'chuveiro', 'espiral', 'coroa'];
const FAGULHAS_POR_FOGO = 24;
const MAX_FAGULHAS = 60;

interface Faísca { dx: number; dy: number; dur: number; atraso: number; queda: number }

// ── O fundo ───────────────────────────────────────────────────────────────
//
// Algas, conchas e cavalos-marinhos. Não são alvos de jogo nem vocabulário:
// cada um devolve um som pequeno, um movimento seu e um pouco de ar a subir.
// Ficam por baixo das bolhas na ordem das camadas (ver `.bubbles-plant` no
// CSS), por isso nunca roubam um toque ao brinquedo — é a única coisa desta
// cena que não pode falhar.

// Paletas das algas: a MESMA planta em três matizes. O que dá variedade à fila
// é a escala, a inclinação, o ritmo e o matiz — nunca a forma, porque um
// sargaçal é feito de repetições, não de modelos diferentes.
const ALGA_PALETA = [
  { folha: '#3fae5f', clara: '#8ee0a1', talo: '#2e8a4c' },
  { folha: '#2f9b74', clara: '#7fdcc0', talo: '#1f7a59' },
  { folha: '#63b852', clara: '#aee3a0', talo: '#3f8f3a' },
];

interface Alga { left: string; h: number; cor: number; ondul: string; atraso: string; bottom: string; inclina: string }
const ALGAS: Alga[] = [
  { left: '4%', h: 132, cor: 0, ondul: '5.6s', atraso: '-1.2s', bottom: '3vh', inclina: '-9deg' },
  { left: '19%', h: 92, cor: 1, ondul: '4.4s', atraso: '-3.1s', bottom: '6vh', inclina: '6deg' },
  { left: '37%', h: 110, cor: 2, ondul: '6.2s', atraso: '-0.4s', bottom: '4vh', inclina: '-4deg' },
  { left: '55%', h: 80, cor: 1, ondul: '5.1s', atraso: '-2.4s', bottom: '7vh', inclina: '10deg' },
  { left: '76%', h: 124, cor: 0, ondul: '7.1s', atraso: '-4.2s', bottom: '2vh', inclina: '-7deg' },
];

// Duas formas de concha alternadas — a vieira em leque e o búzio em espiral —
// porque duas instâncias duma única forma parecem logo quatro coisas diferentes.
// A `interior` e a `risca` só são usadas pelo búzio; a vieira ignora-as.
const CONCHA_PALETA = [
  { pele: '#f0a6b4', clara: '#ffe3ea', interior: '#c98f52', risca: '#dd7f92' },
  { pele: '#f2a95f', clara: '#ffe0ad', interior: '#b5713c', risca: '#d9782f' },
  { pele: '#c9b6ee', clara: '#efe6ff', interior: '#8d76b8', risca: '#a587d8' },
];

interface Concha { forma: 'vieira' | 'espiral'; left: string; h: number; cor: number; tilt: string; bottom: string }
// Espalhadas pela largura toda: com as quatro no terço esquerdo a areia da
// direita ficava vazia e a cena parecia a metade duma cena. A última fica em
// 72% — mais à direita já invadiria o canto do botão de soprar.
const CONCHAS: Concha[] = [
  { forma: 'vieira', left: '11%', h: 58, cor: 0, tilt: '-8deg', bottom: '8vh' },
  { forma: 'espiral', left: '27%', h: 46, cor: 1, tilt: '13deg', bottom: '4vh' },
  { forma: 'vieira', left: '46%', h: 62, cor: 2, tilt: '-4deg', bottom: '6vh' },
  { forma: 'espiral', left: '72%', h: 46, cor: 0, tilt: '15deg', bottom: '3vh' },
];

interface Cavalo { h: number; top: string; nada: string; atraso: string; bob: string; pele: string; barriga: string; barbatana: string }
const CAVALOS: Cavalo[] = [
  { h: 116, top: '42vh', nada: '27s', atraso: '-7s', bob: '3.4s', pele: '#ffb457', barriga: '#ffe3ad', barbatana: '#ff8a5c' },
  { h: 92, top: '66vh', nada: '36s', atraso: '-21s', bob: '4.4s', pele: '#ff9ec7', barriga: '#ffdbe9', barbatana: '#ff6fa5' },
];

// As ostras são a única coisa da cena com uma parte que se mexe por dentro do
// desenho: a valva de cima levanta-se. Vão para os vãos maiores da areia — a
// primeira entre a alga de 55 % e a concha de 72 %, a segunda no vão dos 33 % —
// para que se possam tocar sem disputar o dedo às vizinhas, e nunca para o canto
// de onde se sopra.
//
// As conchas deitadas e as ostras são frias de cor (cinzas e lilases) de
// propósito: a areia é quente e uma concha bege sobre ela desaparecia.
const OSTRA_PALETA = [
  { concha: '#d3d8de', risca: '#a3adb7', interior: '#e6dcf0', carne: '#f2a3ad', perola: '#fffdf7' },
  { concha: '#cbc3c0', risca: '#9d938e', interior: '#f7e4e4', carne: '#e88fa0', perola: '#fff8ee' },
];

interface Ostra { left: string; h: number; bottom: string; tilt: string; cor: number; ciclo: number }
const OSTRAS: Ostra[] = [
  { left: '64%', h: 78, bottom: '2vh', tilt: '-3deg', cor: 0, ciclo: 9000 },
  { left: '33%', h: 62, bottom: '6vh', tilt: '4deg', cor: 1, ciclo: 12500 },
];

// Um só caranguejo, e é de propósito: os outros bichos do fundo estão em três,
// quatro ou cinco porque são paisagem. Este anda, e o que anda uma vez já é
// personagem — a dois deixar de ser um a passear e passava a fila.
const CARANGUEJO_PALETA = [
  { casca: '#e8452e', escura: '#bf2d1c', clara: '#ff9070', iris: '#d9a441' },
];
interface Caranguejo { h: number; bottom: string; passeio: string; atraso: string; cor: number }
const CARANGUEJOS: Caranguejo[] = [
  { h: 64, bottom: '1vh', passeio: '46s', atraso: '-4s', cor: 0 },
];

type Cores = { pele?: string; barriga?: string; barbatana?: string };

// Os três peixes, cada um da sua espécie — é o que faz deles três peixes e não
// três cores do mesmo peixe. Cada um a sua altura de natação e o seu ciclo.
interface Peixe { sprite: (cores?: Cores) => string; top: string; nada: string; atraso: string; h: number }
const PEIXES: Peixe[] = [
  { sprite: PEIXE_TROPICAL, top: '57vh', nada: '17s', atraso: '0s', h: 64 },
  { sprite: PEIXE_PRATA, top: '69vh', nada: '24s', atraso: '-6s', h: 56 },
  { sprite: BAIACU, top: '80vh', nada: '31s', atraso: '-12s', h: 60 },
];

export class BubblesApp {
  private root = document.createElement('div');
  private fx = document.createElement('div');
  private fish: HTMLElement[] = [];
  private live = new Set<HTMLElement>();
  private fagulhas = new Set<HTMLElement>();
  private timeouts: number[] = [];
  private spawner: number | null = null;
  private blowing: number | null = null;
  private blowPos: { x: number; y: number } | null = null;
  // As ostras que estão na areia e os `setTimeout` da respiração delas, que têm
  // de ter lista própria: a lista geral de timeouts é limpa de uma vez no
  // `destroy()`, e a respiração pára e recomeça várias vezes dentro da mesma
  // visita ao app (ecrã bloqueado, segundo plano).
  private ostrasVivas: { el: HTMLElement; corpo: HTMLElement; ciclo: number }[] = [];
  private respirando: number[] = [];

  private pendentes = 0;
  private criadas = 0;
  private giganteFora = false;
  private emFesta = false;
  private vagas = 0;
  private cores = 1;

  private filaFormas: Forma[] = [];
  private ultimaForma: Forma | null = null;
  private fogando = false;
  private filaFogo: { x: number; y: number; cor: Cor }[] = [];

  constructor(private onBack: () => void) {
    this.root.className = 'bubbles';

    const rays = document.createElement('div');
    rays.className = 'bubbles-rays';
    for (let i = 0; i < 3; i++) rays.append(document.createElement('i'));
    const sand = document.createElement('div');
    sand.className = 'bubbles-sand';
    this.root.append(rays, sand);

    // O cenário entra ANTES dos peixes no DOM. Com o mesmo z-index, o elemento
    // que vem depois é que pinta por cima e que leva o toque onde os dois se
    // sobrepõem — assim um peixe a passar continua a ser o peixe.
    this.root.append(this.algas(), this.conchas(), this.ostras(), this.cavalos(), this.caranguejos());

    PEIXES.forEach((peixe) => {
      const f = document.createElement('div');
      f.className = 'bubbles-fish';
      f.style.top = peixe.top;
      f.style.setProperty('--swim', peixe.nada);
      f.style.setProperty('--atraso', peixe.atraso);
      const body = document.createElement('span');
      body.style.setProperty('--h', `${peixe.h}px`);
      body.innerHTML = peixe.sprite();
      f.append(body);
      // O peixe deixou de ser cenário: é um alvo tocável com caixa de 90 px
      // (ver `.bubbles-fish span::before`), e responder a um toque é a única
      // maneira de a criança descobrir que ele está ali.
      f.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resume();
        this.fishSpin(f, e as PointerEvent);
      });
      this.root.append(f);
      this.fish.push(f);
    });

    this.fx.className = 'bubbles-fx';

    const blow = document.createElement('button');
    blow.className = 'bubbles-blow';
    blow.innerHTML = BOLHA_SOPRAR;
    blow.setAttribute('aria-label', 'Soprar bolhas');
    blow.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resume();
      this.startBlow(e as PointerEvent, blow);
    });
    blow.addEventListener('pointermove', (e) => {
      if (this.blowing !== null) this.blowPos = { x: e.clientX, y: e.clientY };
    });
    blow.addEventListener('pointerup', () => this.stopBlow());
    blow.addEventListener('pointercancel', () => this.stopBlow());

    const back = document.createElement('button');
    back.className = 'btn back-btn';
    back.textContent = '🏠';
    back.setAttribute('aria-label', 'Voltar ao início');
    back.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.onBack();
    });

    this.root.append(this.fx, blow, back);
  }

  mount(): void {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = '';
    ui.append(this.root);
    this.startSpawner();
    this.startWave();
    this.respirarOstras();
    // O mar entra com o app. Antes do primeiro gesto o navegador não deixa sair
    // som nenhum, por isso volta a chamar-se a cada toque: é de graça (a segunda
    // chamada não faz nada) e é o que faz o fundo acordar com o primeiro dedo.
    startMar();
    this.root.addEventListener('pointerdown', this.acordaMar, true);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private acordaMar = (): void => { startMar(); };

  destroy(): void {
    this.stopSpawner();
    this.stopBlow();
    this.pararRespiracao();
    this.root.removeEventListener('pointerdown', this.acordaMar, true);
    // O mar das bolhas vai embora COM o brinquedo, não com o contexto de áudio:
    // o `idleSfx()` que se segue adormece o contexto partilhado, mas a pintura e
    // os quebra-cabeças continuam a poder usar o mesmo contexto amanhã.
    pararMar();
    for (const t of this.timeouts) window.clearTimeout(t);
    this.timeouts.length = 0;
    this.live.clear();
    // Fagulhas e rastos vivem dentro de `fx`, que sai com o root — mas a lista
    // tem de ficar vazia para não haver referências a nós mortos.
    this.fagulhas.clear();
    this.filaFogo.length = 0;
    this.fogando = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.root.remove();
    idleSfx();
  }

  // Com o ecrã bloqueado ou a app em segundo plano nada pode criar bolhas nem
  // sair pelos altifalantes, nem uma ostra a abrir-se para ninguém. Não há fala
  // para cortar: este app não fala.
  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.stopSpawner();
      this.stopBlow();
      this.pararRespiracao();
      pararMar();
    } else {
      this.startSpawner();
      this.respirarOstras();
      startMar();
    }
  };

  // ── director de vagas ──────────────────────────────────────────────────

  private startSpawner(): void {
    if (this.spawner === null) this.spawner = window.setInterval(() => this.tick(), RITMO_MS);
  }

  private stopSpawner(): void {
    if (this.spawner !== null) {
      window.clearInterval(this.spawner);
      this.spawner = null;
    }
  }

  private startWave(): void {
    this.vagas++;
    this.cores = Math.min(CORES.length, 1 + this.vagas);
    this.pendentes = BOLHAS_POR_VAGA;
    this.criadas = 0;
    this.giganteFora = false;
    this.emFesta = false;
    this.tick();
  }

  private tick(): void {
    if (this.emFesta || document.visibilityState === 'hidden') return;
    if (this.live.size >= MAX_NO_ECRÃ) return;
    // A gigante entra a meio da vaga, para a criança ter bolhas suficientes
    // antes de ter de se pôr a trabalhar nela. Como ela espera, acumula: nunca
    // mais de duas no ecrã, senão ficam elas a ocupar o lugar todo.
    if (!this.giganteFora && this.criadas >= 2 && this.gigantesNoEcrã() < 2) {
      this.giganteFora = true;
      this.spawn('gigante');
      return;
    }
    if (this.pendentes > 0) {
      this.pendentes--;
      this.spawn(Math.random() < 0.15 ? 'pequena' : 'comum');
    }
  }

  private gigantesNoEcrã(): number {
    let n = 0;
    for (const b of this.live) if (b.dataset.gigante === '1') n++;
    return n;
  }

  // Uma vaga acaba quando não há mais nada para criar nem bolhas normais no
  // ecrã. Uma gigante a meio de toques NÃO conta: ela fica à espera da criança
  // tanto tempo quanto ela quiser, sem castigo, enquanto a vaga seguinte entra.
  private checkFimVaga(): void {
    if (this.emFesta || this.pendentes > 0) return;
    for (const b of this.live) if (b.dataset.gigante !== '1') return;
    this.celebrate();
  }

  /** Fim de vaga: um jingle curto e a vaga seguinte. Já não atira ícones do
   *  topo — num brinquedo cuja lei é que a criança é sempre a autora, um adorno
   *  que cai sem ela o ter provocado é a única coisa que acontecia À criança. O
   *  espectáculo visual continua a ser o fogo de artifício das gigantes. */
  private celebrate(): void {
    this.emFesta = true;
    win();
    this.later(() => this.startWave(), 1600);
  }

  // ── bolhas ─────────────────────────────────────────────────────────────

  private spawn(kind: Kind, from?: { x: number; y: number }): void {
    const [min, max] = DIAM[kind];
    const size = Math.round(min + Math.random() * (max - min));
    const cor = CORES[Math.floor(Math.random() * this.cores)];

    const b = document.createElement('div');
    b.className = 'bubble';
    if (kind === 'gigante') b.dataset.gigante = '1';
    b.dataset.tamanho = String(size);
    b.dataset.cor = cor.css;
    b.style.width = `${size}px`;
    b.style.height = `${size}px`;
    b.style.left = `${from ? Math.max(0, Math.min(innerWidth - size, from.x - size / 2)) : Math.random() * Math.max(1, innerWidth - size)}px`;
    b.style.bottom = from ? `${Math.max(-size / 2, innerHeight - from.y - size / 2)}px` : `${-size - 24}px`;
    const dur = kind === 'gigante' ? 9 + Math.random() * 2.5 : (kind === 'pequena' ? 4 + Math.random() * 2 : 5.5 + Math.random() * 2.5);
    b.style.setProperty('--dur', `${dur.toFixed(2)}s`);
    b.style.setProperty('--wob', `${(2.2 + Math.random() * 1.4).toFixed(2)}s`);
    b.style.setProperty('--c', cor.css);
    if (kind === 'gigante') {
      // A gigante pára a meio do ecrã e fica lá, a boboar, até a criança a
      // acabar. Deixá-la escapar seria perder o prémio por demora.
      b.style.setProperty('--sobe', '58vh');
    }

    const wob = document.createElement('div');
    wob.className = 'bubble-wob';
    const skin = document.createElement('div');
    skin.className = 'bubble-skin';
    wob.append(skin);
    b.append(wob);

    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resume();
      // A gigante pede três toques, e o dedo de uma criança de 2-3 anos fica e
      // arrasta. Capturar o pointer, como no `PuzzleApp`, é o que garante que
      // nenhum gesto do browser (scroll, pinch, callout) lhe cancela o toque a
      // meio do esforço. `touch-action: none` em `.bubble` trata do resto.
      if (b.dataset.gigante === '1') {
        try { b.setPointerCapture(e.pointerId); } catch { /* ponteiros sintéticos */ }
      }
      this.hit(b);
    });
    // A subida acabou: a bolha morre. Sem isto o DOM crescia para sempre.
    // A gigante não — ela ficou parada à espera, e só morre rebentada.
    b.addEventListener('animationend', (e) => {
      if (e.target !== b || e.animationName !== 'floatUp') return;
      if (b.dataset.gigante === '1') return;
      this.drop(b);
    });

    this.root.append(b);
    this.live.add(b);
    this.criadas++;
  }

  private hit(b: HTMLElement): void {
    const size = Number(b.dataset.tamanho) || 90;
    if (b.dataset.gigante === '1') {
      const taps = (Number(b.dataset.taps) || 0) + 1;
      b.dataset.taps = String(taps);
      if (taps < TOQUES_GIGANTE) {
        // Esforço visível e audível: cresce, estremece, sobe uma nota e já
        // salta um punhado de fagulhas — cada vez maior, para o clímax se ver
        // a construir antes do terceiro toque.
        const g = 1 + 0.14 * taps;
        b.style.width = `${Math.round(size * g)}px`;
        b.style.height = `${Math.round(size * g)}px`;
        const skin = b.querySelector('.bubble-skin');
        if (skin) {
          skin.classList.remove('shake');
          void (skin as HTMLElement).offsetWidth;
          skin.classList.add('shake');
        }
        bubbleTapStep(taps);
        const r = b.getBoundingClientRect();
        this.partialSparks(r.left + r.width / 2, r.top + r.height / 2, this.cor(b), 4 + taps * 5);
        return;
      }
    }
    this.pop(b);
  }

  private pop(b: HTMLElement): void {
    const size = Number(b.dataset.tamanho) || 90;
    const cor = this.cor(b);
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const gigante = b.dataset.gigante === '1';

    // Duas camadas no mesmo instante: a bolha a rebentar (o que ela reconhece)
    // e a nota da escala por baixo. Nada de fala à mistura.
    bubbleBurst(size);
    this.burst(cx, cy, cor, gigante ? 12 : 7);
    this.scare(cx);
    this.drop(b, true);

    if (gigante) {
      this.stain(cx, cy, cor);
      this.fireworkAt(cx, cy, cor);
    }
  }

  private cor(b: HTMLElement): Cor {
    return { css: b.dataset.cor || '#2f9ae0' };
  }

  private drop(b: HTMLElement, popped = false): void {
    if (!this.live.delete(b)) return;
    if (popped) {
      const skin = b.querySelector('.bubble-skin');
      if (skin) {
        skin.classList.add('pop');
        this.later(() => b.remove(), 220);
      } else {
        b.remove();
      }
    } else {
      b.remove();
    }
    this.later(() => this.checkFimVaga(), popped ? 230 : 0);
  }

  // ── cor, música e festa ────────────────────────────────────────────────

  private burst(x: number, y: number, cor: Cor, n: number): void {
    for (let i = 0; i < n; i++) {
      const bit = document.createElement('i');
      bit.className = 'bubbles-bit';
      const a = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * (60 + n * 6);
      bit.style.setProperty('--dx', `${Math.round(Math.cos(a) * d)}px`);
      bit.style.setProperty('--dy', `${Math.round(Math.sin(a) * d)}px`);
      bit.style.setProperty('--c', cor.css);
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      this.fx.append(bit);
      this.later(() => bit.remove(), 800);
    }
  }

  // Nódoas de cor persistentes só nas gigantes: seis bolhas comuns a tingir o
  // fundo saturavam a cena ao fim de dez segundos.
  private stain(x: number, y: number, cor: Cor): void {
    const s = document.createElement('div');
    s.className = 'bubbles-stain';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--c', cor.css);
    this.fx.append(s);
    this.later(() => s.remove(), 2600);
  }

  // ── o fogo de artifício das gigantes ───────────────────────────────────

  // Quatro formas, sorteias sem repetir a anterior. É o que faz o trabalho da
  // novidade: 4 formas × 6 cores = 24 espectáculos diferentes.
  private proximaForma(): Forma {
    if (this.filaFormas.length === 0) {
      this.filaFormas = shuffle(FORMAS);
      if (this.ultimaForma && this.filaFormas.length > 1 && this.filaFormas[this.filaFormas.length - 1] === this.ultimaForma) {
        this.filaFormas.splice(this.filaFormas.length - 1, 1);
        this.filaFormas.unshift(this.ultimaForma);
      }
    }
    const f = this.filaFormas.pop() as Forma;
    this.ultimaForma = f;
    return f;
  }

  // Punhado de antecipação nos toques 1 e 2: não é espectáculo, é a criança a
  // ver o clímax crescer. Por isso não dispara o assobio nem bloqueia o fogo.
  private partialSparks(x: number, y: number, cor: Cor, n: number): void {
    const p = palco(x, y);
    this.dispara(p.x, p.y, cor, 'espiral', n, 0.45);
  }

  // Um fogo de cada vez: se uma segunda gigante rebentar enquanto o primeiro
  // está em voo, ela espera. O estouro ouve-se na hora; o espectáculo é que não
  // se sobrepõe.
  private fireworkAt(x: number, y: number, cor: Cor): void {
    if (this.fogando) {
      if (this.filaFogo.length < 2) this.filaFogo.push({ x, y, cor });
      return;
    }
    // A gigante nasce no rebordo de baixo e muitas crianças tocam-lhe logo ali.
    // Sem este recuo, o fogo explodia contra a areia — com a queda de 110 a
    // 250 px, metade do espectáculo ficava fora do ecrã.
    const p = palco(x, y);
    this.dispara(p.x, p.y, cor, this.proximaForma(), FAGULHAS_POR_FOGO, 1);
    this.fogando = true;
    sparkle();
    // Rede de segurança: cada fagulha sai pelo seu `animationend`, mas se o
    // browser não lho der, o `fogando` tem de se libertar sozinho.
    this.later(() => {
      this.fogando = false;
      const seguinte = this.filaFogo.shift();
      if (seguinte) this.fireworkAt(seguinte.x, seguinte.y, seguinte.cor);
    }, 1600);
  }

  private dispara(x: number, y: number, cor: Cor, forma: Forma, n: number, escala: number): void {
    // O clarão no ponto de explosão: sem ele, 20 pontos a abrir lêem-se como
    // papelinhos a cair do ar e não como uma explosão. Só nos fogos a sério (escala 1).
    if (escala === 1) this.flash(x, y, cor);
    // Teto declarado: dois fogos quase simultâneos nunca põem centenas de nós
    // no ar num tablet fraco.
    const permitidas = Math.max(0, Math.min(n, MAX_FAGULHAS - this.fagulhas.size));
    for (let i = 0; i < permitidas; i++) {
      const s = desvios(forma, i, permitidas, escala);
      const el = document.createElement('i');
      el.className = 'spark';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      // Tamanho variável: fagulhas todas do mesmo tamanho lêem-se como um padrão
      // desenhado, e é o tamanho a variar que faz isto parecer fogo.
      el.style.setProperty('--r', `${Math.round((9 + Math.random() * 9) * escala + 4)}px`);
      el.style.setProperty('--c', cor.css);
      el.style.setProperty('--dx', `${s.dx}px`);
      el.style.setProperty('--dy', `${s.dy}px`);
      el.style.setProperty('--queda', `${s.queda}px`);
      el.style.setProperty('--dur', `${s.dur.toFixed(2)}s`);
      el.style.setProperty('--atraso', `${s.atraso.toFixed(2)}s`);
      el.addEventListener('animationend', () => {
        this.fagulhas.delete(el);
        el.remove();
      });
      this.fx.append(el);
      this.fagulhas.add(el);
    }
  }

  // O clarão da explosão: um anel de cor a abrir em ~0,4 s. É o que faz vinte
  // pontos a abrir parecerem uma explosão em vez de papelinhos a cair.
  private flash(x: number, y: number, cor: Cor): void {
    const el = document.createElement('i');
    el.className = 'spark-flash';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--c', cor.css);
    el.addEventListener('animationend', () => el.remove());
    this.fx.append(el);
    this.later(() => el.remove(), 900);
  }

  // ── os peixes ──────────────────────────────────────────────────────────

  private scare(x: number): void {
    let alvo: HTMLElement | null = null;
    let melhor = Infinity;
    for (const f of this.fish) {
      const r = f.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - x);
      if (d < melhor) { melhor = d; alvo = f; }
    }
    if (!alvo || melhor > Math.min(260, innerWidth * 0.32)) return;
    const body = alvo.querySelector('span');
    if (!body) return;
    body.classList.remove('flee');
    void (body as HTMLElement).offsetWidth; // reinicia a animação
    body.classList.add('flee');
  }

  // Toque directo: cabriola e arrancada para o lado oposto ao dedo, com um
  // rasto de bolhinhas decorativas e um glup-glup. Diferente da fuga a um
  // estouro (que é silenciosa) — é assim que a criança percebe que foi ela.
  private fishSpin(f: HTMLElement, e: PointerEvent): void {
    const body = f.querySelector('span');
    if (!body) return;
    const r = f.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    f.style.setProperty('--dir', e.clientX <= cx ? '1' : '-1');
    body.classList.remove('flee', 'spin');
    void (body as HTMLElement).offsetWidth;
    body.classList.add('spin');
    body.addEventListener('animationend', () => body.classList.remove('spin'), { once: true });
    glup();

    const n = 4 + Math.floor(Math.random() * 3);
    const dir = e.clientX <= cx ? 1 : -1;
    this.bolhinhas(cx, cy, dir, n);
  }

  // ── fundo ──────────────────────────────────────────────────────────────
  //
  // Algas, conchas e cavalos-marinhos são tocáveis pelos mesmos motivos que o
  // peixe: um adorno que não responde a nada é uma promessa partida ao lado de
  // um peixe que faz cabriola. Mas continuam a ser adorno — não dão pontos, não
  // dizem palavras e nunca se podem atravessar entre a criança e uma bolha.

  private algas(): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const a of ALGAS) {
      const el = document.createElement('div');
      el.className = 'bubbles-plant';
      el.style.left = a.left;
      el.style.bottom = a.bottom;
      el.style.setProperty('--ondul', a.ondul);
      el.style.setProperty('--atraso', a.atraso);
      el.style.setProperty('--inclina', a.inclina);
      const corpo = document.createElement('span');
      corpo.style.setProperty('--h', `${a.h}px`);
      corpo.innerHTML = ALGA(ALGA_PALETA[a.cor]);
      el.append(corpo);
      this.tocavel(el, corpo, (dir) => {
        // O ar escapa-se pelo pontal de cima da alga, não do meio dela.
        this.tocaCenario(el, corpo, 'onda', puff, dir, 4, 46, 0.14);
      });
      frag.append(el);
    }
    return frag;
  }

  private conchas(): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const c of CONCHAS) {
      const el = document.createElement('div');
      el.className = 'bubbles-shell';
      el.style.left = c.left;
      el.style.bottom = c.bottom;
      const corpo = document.createElement('span');
      corpo.style.setProperty('--h', `${c.h}px`);
      corpo.style.setProperty('--tilt', c.tilt);
      corpo.innerHTML = c.forma === 'vieira' ? CONCHA_VIEIRA(CONCHA_PALETA[c.cor]) : CONCHA_ESPIRAL(CONCHA_PALETA[c.cor]);
      el.append(corpo);
      this.tocavel(el, corpo, (dir) => this.tocaCenario(el, corpo, 'fecha', clique, dir, 3, 34, 0.5));
      frag.append(el);
    }
    return frag;
  }

  /** As ostras. São postas na areia e ficam a respirar sozinhas — abrir, esperar
   *  um bocado, fechar — porque uma criatura que se mexe sem ninguém lhe tocar é
   *  o que faz uma criança parar e olhar. A respiração é TODA silenciosa e não
   *  cria bolha estourável: o que acontece por si não soa nem dá nada, para que o
   *  som e as bolhas continuem a ser prova de que a criança foi a autora.
   *  Tocada, porém, abre-se por inteiro, faz-se ouvir e oferece uma bolha. */
  private ostras(): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const o of OSTRAS) {
      const el = document.createElement('div');
      el.className = 'bubbles-ostra';
      el.style.left = o.left;
      el.style.bottom = o.bottom;
      const corpo = document.createElement('span');
      corpo.style.setProperty('--h', `${o.h}px`);
      corpo.style.setProperty('--tilt', o.tilt);
      corpo.innerHTML = OSTRA(OSTRA_PALETA[o.cor]);
      el.append(corpo);
      this.tocavel(el, corpo, () => this.tocaOstra(el, corpo));
      this.ostrasVivas.push({ el, corpo, ciclo: o.ciclo });
      frag.append(el);
    }
    return frag;
  }

  /** O que a ostra devolve a quem a toca: a valva toda acima, o brilho da
   *  pérola, o seu som e ar a subir — e, se houver lugar no ecrã, uma bolha a
   *  sério a sair-lhe da boca. A bolha é `spawn('pequena')` como a do botão de
   *  soprar: a mesma função, o mesmo `live`, o mesmo limite do ecrã. Uma segunda
   *  classe de bolhas só para as ostras era uma segunda lei para manter. */
  private tocaOstra(el: HTMLElement, corpo: HTMLElement): void {
    const r = el.getBoundingClientRect();
    abraOstra();
    corpo.classList.add('aberta', 'respira');
    this.later(() => corpo.classList.remove('aberta', 'respira'), 2100);
    this.bolhinhas(r.left + r.width * 0.4, r.top + r.height * 0.36, 1, 5, 44, 12);
    if (!this.emFesta && this.live.size <= 4) {
      this.spawn('pequena', { x: r.left + r.width * 0.34, y: r.top + r.height * 0.4 });
    }
  }

  /** Encadeia a respiração de cada ostra com `setTimeout` encadeados, não um
   *  `setInterval`: é o mesmo mecanismo do spawner das bolhas, e com encadeamento
   *  o ciclo sai diferente a cada vez — um ritmo que se repete à risca deixa de
   *  ser vida e passa a ser metrónomo. */
  private respirarOstras(): void {
    if (this.respirando.length) return;
    for (const o of this.ostrasVivas) {
      const pulso = (): void => {
        const r = o.el.getBoundingClientRect();
        o.corpo.classList.add('aberta');
        this.bolhinhas(r.left + r.width * 0.42, r.top + r.height * 0.4, 1, 3, 34, 12);
        this.respirando.push(window.setTimeout(() => o.corpo.classList.remove('aberta'), 1900));
        this.respirando.push(window.setTimeout(pulso, o.ciclo + Math.random() * 5000));
      };
      this.respirando.push(window.setTimeout(pulso, 2500 + Math.random() * 6000));
    }
  }

  /** Parar a respiração é mais do que deixar de agendar: as valvas que ficaram a
   *  meio de uma abertura têm de se fechar, senão recebiam a criança com a boca
   *  aberta num ecrã que ela não estava a ver. */
  private pararRespiracao(): void {
    for (const t of this.respirando) window.clearTimeout(t);
    this.respirando.length = 0;
    for (const o of this.ostrasVivas) o.corpo.classList.remove('aberta');
  }

  private cavalos(): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const h of CAVALOS) {
      const el = document.createElement('div');
      el.className = 'bubbles-horse';
      el.style.top = h.top;
      el.style.setProperty('--nada', h.nada);
      el.style.setProperty('--atraso', h.atraso);
      el.style.setProperty('--bob', h.bob);
      const corpo = document.createElement('span');
      corpo.style.setProperty('--h', `${h.h}px`);
      corpo.innerHTML = CAVALO_MARINHO(h);
      el.append(corpo);
      this.tocavel(el, corpo, (dir) => this.tocaCenario(el, corpo, 'pula', trill, dir, 4, 40, 0.5));
      frag.append(el);
    }
    return frag;
  }

  /** O caranguejo passeia pela areia, da direita para a esquerda como os peixes,
   *  mas ao seu ritmo: os peixes vão na corrente, este vai a pé — 46 segundos a
   *  atravessar o ecrã inteiro. Entra no DOM depois das conchas e antes dos
   *  peixes, por isso pinta por cima das algas mas continua a perder o toque para
   *  quem lhe passa à frente. É tocável como o resto: assusta-se, levanta as
   *  tenazes e deita duas patadas de ar — sem palavra nem pontuação, a mesma lei
   *  de sempre. */
  private caranguejos(): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const c of CARANGUEJOS) {
      const el = document.createElement('div');
      el.className = 'bubbles-caranguejo';
      el.style.bottom = c.bottom;
      el.style.setProperty('--passeio', c.passeio);
      el.style.setProperty('--atraso', c.atraso);
      const corpo = document.createElement('span');
      corpo.style.setProperty('--h', `${c.h}px`);
      corpo.innerHTML = CARANGUEJO(CARANGUEJO_PALETA[c.cor]);
      el.append(corpo);
      this.tocavel(el, corpo, (dir) => this.tocaCenario(el, corpo, 'sustou', pinca, dir, 4, 38, 0.42));
      frag.append(el);
    }
    return frag;
  }

  /** Um gesto, um som, um movimento. O `stopPropagation` é o que impede um
   *  toque no cenário de chegar a uma bolha por baixo, e o `resume()` acorda o
   *  áudio no primeiro toque depois de o tablet ter adormecido. O `--dir` é o
   *  lado do dedo: os elementos dobram-se para o lado OPPOSTO, nunca contra o
   *  dedo que os acabou de tocar — é assim que o peixe foge desde sempre. */
  private tocavel(el: HTMLElement, corpo: HTMLElement, aoTocar: (dir: number) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resume();
      const r = el.getBoundingClientRect();
      const dir = (e as PointerEvent).clientX <= r.left + r.width / 2 ? 1 : -1;
      corpo.style.setProperty('--dir', String(dir));
      aoTocar(dir);
    });
  }

  /** O que o cenário devolve: o som seu, o movimento seu e ar a subir. Sem
   *  palavra, sem pontuação, sem maneira de errar — a mesma lei das bolhas.
   *  `topo` é a fracção da altura do elemento de onde sai o ar: 0.14 numa alga
   *  (foge pelo pontal de cima), 0.5 numa concha (sai-lhe do lado). */
  private tocaCenario(el: HTMLElement, corpo: HTMLElement, classe: string, som: () => void, dir: number, ar: number, sobe: number, topo: number): void {
    const r = el.getBoundingClientRect();
    som();
    corpo.classList.remove(classe);
    void corpo.offsetWidth; // reinicia a animação
    corpo.classList.add(classe);
    corpo.addEventListener('animationend', () => corpo.classList.remove(classe), { once: true });
    this.bolhinhas(r.left + r.width / 2, r.top + r.height * topo, dir, ar, sobe);
  }

  /** Bolhinhas decorativas a subir de um ponto do ecrã. Vivem sempre em `fx`,
   *  a camada sem pointer-events: um adorno não pode tirar um toque a uma
   *  bolha, nem mesmo por acidente. Saída garantida pela animação e, se ela
   *  não chegar ao fim (ecrã bloqueado a meio), pela rede de segurança. */
  private bolhinhas(cx: number, cy: number, dir: number, n: number, sobe = 26, passo = 14): void {
    for (let i = 0; i < n; i++) {
      const t = document.createElement('i');
      t.className = 'bubbles-trail';
      t.style.left = `${cx + dir * i * passo}px`;
      t.style.top = `${cy + (Math.random() * 18 - 9)}px`;
      const d = 12 + Math.random() * 14;
      t.style.width = `${d}px`;
      t.style.height = `${d}px`;
      t.style.setProperty('--sobe', `${-(sobe + Math.random() * 34)}px`);
      t.style.setProperty('--dur', `${(0.7 + Math.random() * 0.5).toFixed(2)}s`);
      t.style.setProperty('--atraso', `${(i * 0.07).toFixed(2)}s`);
      t.addEventListener('animationend', () => t.remove());
      this.fx.append(t);
      this.later(() => t.remove(), 1800);
    }
  }

  // ── soprar ─────────────────────────────────────────────────────────────

  private startBlow(e: PointerEvent, blow: HTMLElement): void {
    this.blowPos = { x: e.clientX, y: e.clientY };
    try { blow.setPointerCapture(e.pointerId); } catch { /* sem captura, continua */ }
    this.spawnFromBlow();
    if (this.blowing === null) this.blowing = window.setInterval(() => this.spawnFromBlow(), 240);
  }

  private spawnFromBlow(): void {
    if (!this.blowPos || this.live.size >= MAX_NO_ECRÃ) return;
    this.spawn('pequena', this.blowPos);
  }

  private stopBlow(): void {
    if (this.blowing !== null) {
      window.clearInterval(this.blowing);
      this.blowing = null;
    }
    this.blowPos = null;
  }

  private later(fn: () => void, ms: number): void {
    this.timeouts.push(window.setTimeout(() => fn(), ms));
  }
}

/** Os deslocamentos das fagulhas, por forma. `escala` encolhe tudo para os
 *  punhados dos toques parciais (que não são espectáculo, são antecipação). */
function desvios(forma: Forma, i: number, n: number, escala: number): Faísca {
  const q = (v: number) => Math.round(v * escala);
  const base = { dur: 0.85 + Math.random() * 0.4, atraso: Math.random() * 0.12 * escala };
  switch (forma) {
    case 'roda': {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const r = q(95 + Math.random() * 60);
      return { ...base, dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r), queda: q(110) };
    }
    case 'chuveiro': {
      const dx = q((Math.random() - 0.5) * 130);
      const dy = -q(150 + Math.random() * 110);
      return { ...base, dx, dy, queda: q(230), atraso: Math.random() * 0.25 * escala, dur: 1 + Math.random() * 0.45 };
    }
    case 'espiral': {
      const a = i * 2.399;
      const r = q(34 + i * (7 - escala * 2));
      return { ...base, dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r * 0.8), queda: q(150), atraso: i * 0.022 * escala };
    }
    case 'coroa': {
      const a = (i / n) * Math.PI * 2;
      const r = q(80 + Math.random() * 45);
      return {
        dx: Math.round(Math.cos(a) * r),
        dy: -q(Math.abs(Math.sin(a)) * 55 + 30),
        queda: q(250),
        dur: 1.05 + Math.random() * 0.5,
        atraso: Math.random() * 0.1,
      };
    }
  }
}

/** Onde o espectáculo pode acontecer: dentro do ecrã e com espaço para as
 *  fagulhas caírem. Uma gigante rebentada junto à areia explodiria fora dele. */
function palco(x: number, y: number): { x: number; y: number } {
  const margemX = Math.min(190, innerWidth * 0.22);
  return {
    x: Math.max(margemX, Math.min(innerWidth - margemX, x)),
    y: Math.max(innerHeight * 0.26, Math.min(innerHeight * 0.58, y)),
  };
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
