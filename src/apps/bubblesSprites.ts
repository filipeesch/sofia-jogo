// Os desenhos do fundo das bolhas.
//
// Uma figura por constante, todas aqui ao lado umas das outras para o traço se
// poder comparar. A linguagem é sempre a mesma, por esta ordem de camadas:
//
//   1. corpo com contorno — `paint-order="stroke"` põe o traço POR DEBAIXO do
//      preenchimento, por isso a linha fica a contornar por fora em vez de comer
//      meio píxel do desenho: é o aspecto de brinquedo adesivo do resto do jogo;
//   2. sombra de si próprio — uma faixa mais escura na barriga/lado de baixo;
//   3. luz — uma faixa clara no lombo, com opacidade, sem gradientes;
//   4. textura — escamas, costelas, nervuras e raios, sempre traços finos a
//      baixa opacidade: é o detalhe que se vê de perto e desaparece de longe,
//      que é como o detalhe a sério se comporta;
//   5. olho — branco, pupila e um ponto de brilho. Sem o ponto de brilho um
//      boneco parece morto, e uma criança de 3 anos dá-se conta disso.
//
// Deliberadamente NÃO há `<defs>` nem `url(#...)` partilhados: dois exemplares
// do mesmo desenho na mesma página partilham o id, e o segundo ficaria com as
// cores do primeiro. Toda a profundidade é camadas planas — o que custa menos
// num tablet fraco do que gradientes e muito menos do que filtros.
//
// Todos os bichos virados para a ESQUERDA: é para onde o `swim` os leva.
//
// Cores por instância: cada figura recebe uma paleta (`{ pele, barriga,
// barbatana }`) com valores de recurso, por isso o mesmo desenho serve várias
// cores sem duplicar um único path. É uma função a receber um objeto, não
// variáveis CSS: as figuras não têm estados de cor que mudem em runtime, e um
// `url(#gradiente)` partilhado entre instâncias trocar-lhes-ia as cores.

// Cores de contorno e brilho comuns a toda a cena. Uma só família para não
// haver uma figura de cada cor do arco-íris.
const TINTA_ESCURA = '#1d3d52';
const LUZ = '#ffffff';

/** Contorno padrão das figuras. Fino em relação ao viewBox (~120 unidades). */
const LINHA = 'rgba(20, 52, 74, 0.55)';

/** Um olho com brilho. É a mesma função para os seis bichos — é ela que faz os
 *  seis parecerem da mesma família antes de qualquer outra coisa. */
function olho(cx: number, cy: number, r: number, cor = '#22303c'): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${LUZ}"/>`
    + `<circle cx="${cx - r * 0.18}" cy="${cy}" r="${r * 0.58}" fill="${cor}"/>`
    + `<circle cx="${cx + r * 0.34}" cy="${cy - r * 0.4}" r="${r * 0.24}" fill="${LUZ}"/>`;
}

/** Raio de barbatana: um traço fino do corpo para a borda. Vários juntos são o
 *  "tecido" que um emoji nunca teve. */
function raios(lista: string[], espessura = 1.6, cor = LINHA, opacidade = 0.45): string {
  return lista.map((d) => `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${espessura}" stroke-linecap="round" opacity="${opacidade}"/>`).join('');
}

// ── Peixes ─────────────────────────────────────────────────────────────────

/** Peixe-tropical: corpo de folha, dorsal e anal em leque, cauda de bandeira e
 *  duas barras verticais, como um peixe-palhaço de água quente. */
export const PEIXE_TROPICAL = (cores: { pele?: string; barriga?: string; barbatana?: string } = {}) => {
  const pele = cores.pele ?? '#ff9f43';
  const barriga = cores.barriga ?? '#ffd9a8';
  const barbatana = cores.barbatana ?? '#ff6f4d';
  const corpo = 'M 21 43 C 28 22 56 12 79 24 C 91 31 96 38 96 43 C 96 48 91 55 79 62 C 56 74 28 64 21 43 Z';
  return `<svg viewBox="0 0 124 84" role="img" aria-label="Peixe" xmlns="http://www.w3.org/2000/svg">
  <path d="M 93 43 L 119 20 C 113 30 112 36 112 43 C 112 50 113 56 119 66 L 93 43 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 97 40 L 113 27', 'M 98 43 L 113 43', 'M 97 46 L 113 59'], 1.7)}
  <path d="M 50 17 C 60 3 80 4 90 19 C 77 14 63 14 52 21 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 58 15 L 62 6', 'M 68 14 L 72 6', 'M 78 15 L 82 8'], 1.5)}
  <path d="M 55 68 C 65 80 82 78 89 63 C 77 69 64 70 56 64 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 62 71 L 66 78', 'M 72 70 L 76 77'], 1.5)}
  <path d="${corpo}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
  <path d="M 25 49 C 34 61 56 68 76 61 C 56 66 34 60 25 49 Z" fill="${barriga}" opacity="0.95"/>
  <path d="M 27 33 C 38 20 62 15 80 22 C 60 18 38 24 27 33 Z" fill="${LUZ}" opacity="0.3"/>
  <path d="M 53 17 C 48 30 48 56 55 70" fill="none" stroke="${barbatana}" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
  <path d="M 70 21 C 66 33 66 54 71 66" fill="none" stroke="${barbatana}" stroke-width="6.5" stroke-linecap="round" opacity="0.75"/>
  ${raios(['M 32 40 C 38 36 44 36 48 39', 'M 32 47 C 38 44 44 44 48 47'], 1.4, LUZ, 0.4)}
  <path d="M 40 45 C 46 42 52 45 51 51 C 47 54 41 52 40 45 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="1.6" paint-order="stroke" opacity="0.95"/>
  <path d="M 22 44 C 25 47 28 47 30 45" fill="none" stroke="${LINHA}" stroke-width="2" stroke-linecap="round"/>
  ${olho(33, 37, 5.6)}
</svg>`;
};

/** Peixe-prata: fuselado, escuro no lombo e claro na barriga, cauda fendida e
 *  linha lateral — o peixe de cardume. */
export const PEIXE_PRATA = (cores: { pele?: string; barriga?: string; barbatana?: string } = {}) => {
  const pele = cores.pele ?? '#63b8e8';
  const barriga = cores.barriga ?? '#eaf7ff';
  const barbatana = cores.barbatana ?? '#3f8fc6';
  const corpo = 'M 15 37 C 26 17 55 9 79 19 C 90 24 95 31 96 37 C 95 43 90 50 79 55 C 55 65 26 57 15 37 Z';
  return `<svg viewBox="0 0 122 76" role="img" aria-label="Peixe" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.82">
  <path d="M 92 37 L 117 15 L 106 31 L 106 43 L 117 59 L 92 37 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 96 33 L 110 21', 'M 99 37 L 107 37', 'M 96 41 L 110 53'], 1.5)}
  <path d="M 49 15 C 57 4 71 5 78 17 C 67 13 56 13 50 19 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.3" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 57 13 L 60 6', 'M 66 13 L 70 7'], 1.4)}
  <path d="M 52 60 C 60 70 73 68 79 57 C 69 62 59 63 53 57 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
  </g>
  <path d="M 16 42 C 28 54 56 61 80 53 C 56 59 28 52 16 42 Z" fill="${barriga}"/>
  <path d="${corpo}" fill="none" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="${corpo}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke" opacity="0.999"/>
  <path d="M 20 27 C 33 15 58 11 78 17 C 55 15 33 20 20 27 Z" fill="${TINTA_ESCURA}" opacity="0.25"/>
  <path d="M 27 40 C 46 34 70 33 88 36" fill="none" stroke="${TINTA_ESCURA}" stroke-width="2.2" stroke-linecap="round" opacity="0.35"/>
  ${raios(['M 30 46 C 36 43 42 43 46 45', 'M 44 49 C 50 46 56 46 60 48', 'M 58 51 C 64 48 70 48 74 50'], 1.4, TINTA_ESCURA, 0.22)}
  <path d="M 33 24 C 28 33 28 45 34 53" fill="none" stroke="${LINHA}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <path d="M 39 42 C 45 39 51 42 50 48 C 46 51 40 49 39 42 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="1.5" paint-order="stroke" opacity="0.9"/>
  <path d="M 15 38 C 17.5 41 20.5 41 22.5 39.5" fill="none" stroke="${LINHA}" stroke-width="2" stroke-linecap="round"/>
  ${olho(28, 34, 5)}
</svg>`;
};

/** Baiacu: bola com espinhos, barbatanas minúsculas e um olho grande demais —
 *  o mais caricato dos três, e o que uma criança reconhece primeiro. */
export const BAIACU = (cores: { pele?: string; barriga?: string; barbatana?: string } = {}) => {
  const pele = cores.pele ?? '#f7d154';
  const barriga = cores.barriga ?? '#fff4d0';
  const barbatana = cores.barbatana ?? '#e9973f';
  const corpo = 'M 24 47 C 24 26 42 13 61 13 C 81 13 95 27 95 47 C 95 65 80 78 60 78 C 40 78 24 66 24 47 Z';
  // Os espinhos saem da silhueta, calculados à roda do corpo: são o que faz de um
  // baiacu um baiacu. No rascunho estavam DESNUPOR cima do corpo e na mesma cor,
  // por isso não se viam. Vão por BAIXO do corpo e bem mais compridos.
  const cx = 59.5, cy = 45.5, rx = 35, ry = 32;
  const espinhos = [0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((graus) => {
    const a = (graus * Math.PI) / 180;
    const bx = cx + rx * Math.cos(a), by = cy + ry * Math.sin(a);
    const tx = cx + rx * 1.28 * Math.cos(a), ty = cy + ry * 1.28 * Math.sin(a);
    return `M ${bx.toFixed(1)} ${by.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)}`;
  });
  return `<svg viewBox="0 2 112 90" role="img" aria-label="Baiacu" xmlns="http://www.w3.org/2000/svg">
  ${raios(espinhos, 5, pele, 1)}
  ${raios(espinhos, 1.9, LINHA, 0.7)}
  <path d="M 92 47 L 111 33 C 106 41 106 53 111 61 L 92 47 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
  <path d="${corpo}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
  <path d="M 30 57 C 42 73 66 78 86 66 C 68 74 44 70 30 57 Z" fill="${barriga}"/>
  ${raios(['M 54 24 C 60 21 66 21 70 24', 'M 68 21 C 74 18 80 19 84 22', 'M 78 28 C 84 25 89 26 92 29'], 1.5, TINTA_ESCURA, 0.2)}
  <circle cx="47" cy="58" r="2.4" fill="${barbatana}" opacity="0.5"/>
  <circle cx="60" cy="63" r="2.8" fill="${barbatana}" opacity="0.45"/>
  <circle cx="73" cy="58" r="2.2" fill="${barbatana}" opacity="0.5"/>
  <circle cx="53" cy="35" r="2.2" fill="${barbatana}" opacity="0.4"/>
  <circle cx="67" cy="31" r="2" fill="${barbatana}" opacity="0.4"/>
  <path d="M 43 48 C 50 44 58 48 57 56 C 51 60 44 56 43 48 Z" fill="${barbatana}" stroke="${LINHA}" stroke-width="1.7" paint-order="stroke" opacity="0.95"/>
  ${raios(['M 46 49 L 52 54', 'M 50 47 L 55 52'], 1.3)}
  <path d="M 24 44 C 17 42 13 45 13 49 C 13 53 18 55 24 53 Z" fill="${barriga}" stroke="${LINHA}" stroke-width="2.2" paint-order="stroke"/>
  <path d="M 15 48 L 21 48" fill="none" stroke="${LINHA}" stroke-width="1.8" stroke-linecap="round"/>
  ${olho(38, 38, 7.2)}
</svg>`;
};

// ── Cavalo-marinho ─────────────────────────────────────────────────────────

/** Cavalo-marinho. O corpo é feito de traços grossos de extremidade redonda — o
 *  modo mais barato de ter um corpo gordo sem um único contorno fechado. O
 *  contorno desenha-se passando o MESMO traço duas vezes: primeiro largo na cor
 *  da linha, depois mais fino na cor da pele. É o `paint-order` em jeito de
 *  traço, e é o que põe este bicho na mesma família dos outros. */
export const CAVALO_MARINHO = (cores: { pele?: string; barriga?: string; barbatana?: string } = {}) => {
  const pele = cores.pele ?? '#ffb457';
  const barriga = cores.barriga ?? '#ffe3ad';
  const barbatana = cores.barbatana ?? '#ff8a5c';
  const torso = 'M 34 44 C 48 52 48 66 39 76';
  const cauda = 'M 39 76 C 29 82 29 96 41 98 C 49 99 51 90 45 86';
  const barrigaD = 'M 28 48 C 21 56 21 68 29 76';
  // A crina vai ao LONGO DO DORSO, por trás do corpo, e não em cima da cabeça.
  // No rascunho anterior havia uma coroa de pontas no topo da cabeça e uma
  // barbatana debaixo do queixo: isso lê-se crista e brinco, e o bicho passava
  // a galinha. Um cavalo-marinho tem a cabeça lisa e a barbatana dorsal a
  // correr-lhe pelas costas — por isso os picos todos mudaram de lado.
  // O primeiro pico fica ATRÁS da cabeça, não acima dela: enquanto houve uma
  // ponta sobre o crânio, voltou a ler-se crista.
  const pontas: [number, number][] = [[47, 3], [58, 7], [69, 16], [73, 34], [66, 53], [60, 67], [56, 80]];
  const vales: [number, number][] = [[51, 18], [57, 22], [62, 30], [59, 41], [54, 54], [50, 66], [46, 78]];
  const crina = 'M 34 12 ' + pontas.map(([px, py], i) => `L ${px} ${py} L ${vales[i][0]} ${vales[i][1]}`).join(' ')
    + ' C 52 62 58 38 44 18 L 34 12 Z';
  const vincos = vales.map(([vx, vy], i) => `M ${vx} ${vy} L ${(vx + pontas[i][0]) / 2 - 4} ${(vy + pontas[i][1]) / 2 - 2}`);
  return `<svg viewBox="0 0 76 104" role="img" aria-label="Cavalo-marinho" xmlns="http://www.w3.org/2000/svg">
  <path d="${crina}" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(vincos, 1.8, TINTA_ESCURA, 0.22)}
  <path d="${torso}" fill="none" stroke="${LINHA}" stroke-width="27" stroke-linecap="round"/>
  <path d="${cauda}" fill="none" stroke="${LINHA}" stroke-width="15" stroke-linecap="round"/>
  <path d="${torso}" fill="none" stroke="${pele}" stroke-width="23" stroke-linecap="round"/>
  <path d="${cauda}" fill="none" stroke="${pele}" stroke-width="11" stroke-linecap="round"/>
  <path d="${barrigaD}" fill="none" stroke="${barriga}" stroke-width="14" stroke-linecap="round"/>
  ${raios(['M 21 52 L 31 50', 'M 19 59 L 30 58', 'M 19 67 L 31 67', 'M 22 74 L 33 72'], 2.2, pele, 0.75)}
  <circle cx="34" cy="30" r="20.4" fill="${LINHA}"/>
  <circle cx="34" cy="30" r="18.6" fill="${pele}"/>
  <path d="M 26 33 L 9 36" fill="none" stroke="${LINHA}" stroke-width="10" stroke-linecap="round"/>
  <path d="M 26 33 L 9 36" fill="none" stroke="${pele}" stroke-width="7.5" stroke-linecap="round"/>
  <circle cx="7" cy="36" r="5.4" fill="${LINHA}"/>
  <circle cx="7" cy="36" r="4" fill="${pele}"/>
  <path d="M 4.4 37.4 C 6 39 8.4 39 10 37.4" fill="none" stroke="${LINHA}" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
  <circle cx="46" cy="26" r="3" fill="${barbatana}" opacity="0.75"/>
  <circle cx="50" cy="34" r="3.4" fill="${barbatana}" opacity="0.7"/>
  <circle cx="44" cy="40" r="2.6" fill="${barbatana}" opacity="0.65"/>
  <path d="M 23 40 C 26 44 31 45 35 43" fill="none" stroke="${LINHA}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
  ${olho(28, 26, 6.4)}
  <path d="M 40 70 C 50 62 64 64 66 72 C 68 80 56 86 46 82 C 42 80 40 75 40 70 Z" fill="${barriga}" stroke="${LINHA}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 44 73 L 62 68', 'M 44 76 L 63 76', 'M 45 79 L 58 82'], 1.7, pele, 0.8)}
</svg>`;
};

// ── Plantas e conchas ──────────────────────────────────────────────────────

/** Uma folha de alga: uma LÂMINA larga, não uma agulha. É uma lente à volta do
 *  eixo base→ponta, com largura proporcional ao comprimento. O primeiro rascunho
 *  punha os lados quase colados ao eixo e a planta parecia um pau com espinhos.
 *  `brilho` desenha só a lente, sem contorno nem nervura: é a face clara que se
 *  por cima mais curta, como no resto da cena. */
function folhaAlga(x: number, y: number, lado: number, comp: number, cor: string, nervura = '', brilho = false): string {
  const ax = lado * comp;
  const ay = -comp * 0.8;                      // as folhas crescem para cima e para fora
  const L = Math.hypot(ax, ay) || 1;
  // Nas curvas quadráticas o ponto de controlo tem de ficar ao dobro da largura
  // que se quer ver, por isso o 0,54 em vez de 0,27.
  const px = -(ay / L) * comp * 0.54;
  const py = (ax / L) * comp * 0.54;
  const f = (v: number) => v.toFixed(1);
  const tipx = x + ax, tipy = y + ay;
  const mx = x + ax * 0.5, my = y + ay * 0.5;
  const d = `M ${f(x)} ${f(y)} Q ${f(mx + px)} ${f(my + py)} ${f(tipx)} ${f(tipy)}`
    + ` Q ${f(mx - px)} ${f(my - py)} ${f(x + 2.4 * lado)} ${f(y + 2.6)} Z`;
  if (brilho) return `<path d="${d}" fill="${cor}" opacity="0.45"/>`;
  const n = `M ${f(x + lado * 2)} ${f(y + 0.5)} Q ${f(mx + px * 0.14)} ${f(my + py * 0.14)} ${f(tipx - lado * 2.5)} ${f(tipy + 2.5)}`;
  return `<path d="${d}" fill="${cor}" stroke="${LINHA}" stroke-width="2" stroke-linejoin="round" paint-order="stroke"/>`
    + `<path d="${n}" fill="none" stroke="${nervura}" stroke-width="1.7" stroke-linecap="round" opacity="0.5"/>`;
}

// Talo, folhas por ordem de descida [x, y, lado, comprimento]. As folhas do meio
// são as mais compridas: uma alga de verdade abre-se em leque e fecha no topo.
const FOLHAS_ALGA: [number, number, number, number][] = [
  [46, 106, -1, 32], [45, 96, 1, 37], [46, 85, -1, 33], [45, 73, 1, 29],
  [45, 61, -1, 25], [44, 49, 1, 22], [43, 37, -1, 18], [42, 26, 1, 14],
  [41, 16, -1, 11], [40, 9, 1, 9],
];

/** Alga: talo em curva com folhas emparelhadas, nervuras e face clara. É feita a
 *  partir duma tabela para que as cinco algas da cena sejam A MESMA planta em
 *  escalas e cores diferentes, e não cinco rabiscos diferentes. */
export const ALGA = (cores: { folha?: string; clara?: string; talo?: string } = {}) => {
  const folha = cores.folha ?? '#3fae5f';
  const clara = cores.clara ?? '#8ee0a1';
  const talo = cores.talo ?? '#2e8a4c';
  const taloD = 'M 46 118 C 43 96 49 74 45 52 C 42 36 44 22 40 8';
  const folhas = FOLHAS_ALGA.map(([x, y, lado, comp]) => folhaAlga(x, y, lado, comp, folha, clara)).join('');
  // A face clara só nas folhas maiores: nas pequenas perde-se e só custa pixels.
  const luz = FOLHAS_ALGA.filter(l => l[3] >= 24)
    .map(([x, y, lado, comp]) => folhaAlga(x, y - 2, lado, comp * 0.62, clara, '', true)).join('');
  return `<svg viewBox="0 0 96 124" role="img" aria-label="Alga" xmlns="http://www.w3.org/2000/svg">
  <path d="${taloD}" fill="none" stroke="${LINHA}" stroke-width="9" stroke-linecap="round"/>
  <path d="${taloD}" fill="none" stroke="${talo}" stroke-width="6" stroke-linecap="round"/>
  ${folhas}
  ${luz}
  <path d="M 40 8 C 35 4 32 6 31 12" fill="none" stroke="${LINHA}" stroke-width="6" stroke-linecap="round"/>
  <path d="M 40 8 C 35 4 32 6 31 12" fill="none" stroke="${folha}" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M 44 116 C 41 94 47 72 43 50 C 40 34 42 21 38 9" fill="none" stroke="${clara}" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
</svg>`;
};

/** Concha de vieira: leque com a borda ondulada, costelas a sair da charneira e
 *  duas orelhas na base. É A concha de concha. */
export const CONCHA_VIEIRA = (cores: { pele?: string; clara?: string } = {}) => {
  const pele = cores.pele ?? '#f0a6b4';
  const clara = cores.clara ?? '#ffe3ea';
  const corpo = 'M 48 70 C 22 64 8 46 12 27 C 21 33 27 30 33 22 C 39 30 44 31 48 21 C 52 31 57 30 63 22 C 69 30 75 33 84 27 C 88 46 74 64 48 70 Z';
  return `<svg viewBox="0 0 96 82" role="img" aria-label="Concha" xmlns="http://www.w3.org/2000/svg">
  <path d="${corpo}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(['M 48 66 L 22 39', 'M 48 66 L 34 32', 'M 48 66 L 42 30', 'M 48 66 L 54 30', 'M 48 66 L 62 32', 'M 48 66 L 74 39'], 1.9, TINTA_ESCURA, 0.3)}
  <path d="M 20 34 C 27 39 34 42 44 43 C 34 46 25 44 18 40 Z" fill="${clara}" opacity="0.85"/>
  <path d="M 39 63 C 44 68 52 68 57 63 C 54 71 42 71 39 63 Z" fill="${clara}" stroke="${LINHA}" stroke-width="2" paint-order="stroke"/>
  ${raios(['M 44 65 L 45 68.5', 'M 48 66 L 48 69', 'M 52 65 L 51 68.5'], 1.2, TINTA_ESCURA, 0.25)}
</svg>`;
};

/** Búzio: concha com a VOLTA em espiral desenhada a sério. No rascunho eram só
 *  arcos soltos e lia-se "batata"; o que faz de uma concha uma concha em espiral
 *  é a espiral em si, do bico ao centro, com as costelas a sair dela. */
export const CONCHA_ESPIRAL = (cores: { pele?: string; clara?: string; interior?: string } = {}) => {
  const pele = cores.pele ?? '#f6c67a';
  const clara = cores.clara ?? '#fff0cf';
  const interior = cores.interior ?? '#c98f52';
  const corpo = 'M 22 44 C 15 27 33 12 56 12 C 78 12 90 24 88 37 C 86 51 68 62 46 60 C 32 58 25 52 22 44 Z';
  // A abertura é uma fenda comprida a correr junto ao bordo, não uma nódoa: é o
  // que diz "concha aberta" a uma criança de dois anos. O lábio claro é um traço
  // que segue o bordo POR DENTRO — quando ficou de fora, parecia um plátano.
  const abertura = 'M 31 22 C 25 30 25 42 32 51 C 35 42 35 30 37 24 Z';
  const labios = 'M 29.5 25 C 24 31 24 41 30.5 48';
  return `<svg viewBox="0 0 96 74" role="img" aria-label="Concha" xmlns="http://www.w3.org/2000/svg">
  <path d="M 83 27 C 92 25 96 31 92 36 C 89 40 84 39 81 35 Z" fill="${pele}" stroke="${LINHA}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
  <path d="${corpo}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
  <path d="M 60 35 C 67 34 69 40 64 43 C 57 46 51 39 54 31 C 58 21 72 18 80 25" fill="none" stroke="${TINTA_ESCURA}" stroke-width="2.6" stroke-linecap="round" opacity="0.42"/>
  ${raios(['M 54 31 C 47 25 48 17 55 13', 'M 64 43 C 64 51 57 57 48 59', 'M 80 25 C 85 28 88 33 87 39', 'M 30 21 C 35 26 38 33 37 40'], 2.1, TINTA_ESCURA, 0.26)}
  <path d="${abertura}" fill="${interior}" stroke="${LINHA}" stroke-width="1.8" paint-order="stroke"/>
  <path d="${labios}" fill="none" stroke="${clara}" stroke-width="3.2" stroke-linecap="round" opacity="0.95"/>
</svg>`;
};

// ── Comando de soprar ──────────────────────────────────────────────────────

/** Bolhas para o botão de soprar: três, com aro e brilho, todas em branco
 *  translúcido — sobre o gradiente azul do botão é o único contraste que chega
 *  a 30 px e com o dedo à frente. */
export const BOLHA_SOPRAR = `
<svg viewBox="0 0 64 64" role="img" aria-label="Soprar bolhas" xmlns="http://www.w3.org/2000/svg">
  <circle cx="27" cy="35" r="17" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.95)" stroke-width="3"/>
  <path d="M 16 27 C 19 22 24 19 29 19" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="35" cy="42" r="2.4" fill="rgba(255,255,255,0.85)"/>
  <circle cx="46" cy="20" r="9" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.9)" stroke-width="2.6"/>
  <path d="M 41 16 C 43 13 45 12 48 12" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2.8" stroke-linecap="round"/>
  <circle cx="15" cy="14" r="6" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.85)" stroke-width="2.2"/>
  <path d="M 11 12 C 12 10 14 9.4 15.6 9.6" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
