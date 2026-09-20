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

/**
 * Cavalo-marinho. A silhueta não foi inventada: foi decalcada de um desenho de
 * colorir — o contorno exterior do bicho seguido píxel a píxel, depois
 * simplificado e suavizado. Fiz isso porque as duas tentativas anteriores
 * falharam no mesmo lugar: pontas na cabeça liam-se crista e um focinho a
 * sair-lhe da cara como um tubo lia-se bico, e o bicho passava a galinha. Um
 * cavalo-marinho tem, e é só isso:
 *
 *   - a cabeça redonda com o focinho a *continuar* a cara, virado para baixo,
 *     sem quebra entre a testa, a face e o tubo da boca;
 *   - um ondulado a correr-lhe do alto da cabeça por todas as costas até à
 *     cauda — uma peça só, e não uma coroa nem uma crina;
 *   - a barriga em gomos, marcados a traço fino;
 *   - uma barbatana de leque com três raios no meio das costas;
 *   - a cauda em caracol, que é o que o anuncia como cavalo-marinho.
 *
 * Decalcar só dá o fora. O que vai por dentro — gomos, leque, caracol, olho —
 * é desenhado por cima, na língua das outras figuras: camadas planas, sem
 * gradientes, contornos com `paint-order="stroke"`.
 */
export const CAVALO_MARINHO = (cores: { pele?: string; barriga?: string; barbatana?: string } = {}) => {
  const pele = cores.pele ?? '#ffb457';
  const barriga = cores.barriga ?? '#ffe3ad';
  const barbatana = cores.barbatana ?? '#ff8a5c';
  // Vista de 49,7 x 104: o bicho é alto e estreito, e é isso que o decalque
  // disse — as versões antigas eram-lhe largas de mais.
  const corpo = 'M 21.2 0 Q 21.1 0 19.9 0.8 Q 18.7 1.5 17.8 3.8 Q 16.9 6 15.1 6.9 Q 13.3 7.7 14 9.7 Q 14.7 11.7 13.1 14.2 Q 11.4 16.6 10.4 21.1 Q 9.4 25.5 7.8 26.9 Q 6.2 28.2 3.7 28.6 Q 1.1 29 0.6 30.6 Q 0 32.2 0.7 34.1 Q 1.3 35.9 2.9 37.1 Q 4.4 38.2 8.6 36.1 Q 12.8 33.9 17.1 34.3 Q 21.3 34.7 15.7 41.5 Q 10 48.2 9 51.3 Q 8 54.3 8 56.8 Q 7.9 59.3 10.1 64 Q 12.3 68.6 18.8 74.1 Q 25.3 79.6 26.4 81.8 Q 27.4 84 27.4 86.1 Q 27.3 88.1 26.6 89.6 Q 25.8 91 24.3 92.1 Q 22.7 93.2 20 93.1 Q 17.2 92.9 16.3 92 Q 15.3 91 17.9 90.6 Q 20.4 90.2 21.2 87.5 Q 21.9 84.8 20.5 82.9 Q 19.2 81 16.9 80.6 Q 14.6 80.2 11.8 82.2 Q 9 84.1 8.1 87.6 Q 7.2 91 7.8 93.1 Q 8.4 95.2 9.9 97.4 Q 11.4 99.5 13.9 101.1 Q 16.4 102.7 19.1 103.3 Q 21.8 103.9 25.8 103.1 Q 29.7 102.3 32.9 99.6 Q 36.1 96.9 38.2 96.3 Q 40.2 95.6 40.8 93.3 Q 41.3 90.9 42.6 89.4 Q 43.9 87.9 43.5 86 Q 43 84 44.1 81.9 Q 45.2 79.7 44.4 78.4 Q 43.5 77 44.4 74.9 Q 45.2 72.8 43.3 70.4 Q 41.4 67.9 43.6 66.5 Q 45.7 65.1 45.8 62.9 Q 45.9 60.7 46.9 58.8 Q 47.9 56.8 47.2 55.2 Q 46.5 53.6 46.7 51 Q 46.9 48.3 45.8 47.2 Q 44.6 46.1 42.9 46.1 Q 41.2 46 41.6 45 Q 41.9 44 41.3 42.4 Q 40.8 40.8 43.2 39.3 Q 45.5 37.8 45 35.6 Q 44.4 33.4 46.4 31.7 Q 48.4 29.9 47.6 27.5 Q 46.7 25 48.2 22.5 Q 49.6 19.9 47.4 18 Q 45.1 16 45.3 12.8 Q 45.4 9.6 42 8.7 Q 38.6 7.7 37.3 5.1 Q 36 2.4 34.7 2.1 Q 33.4 1.8 30.9 2.9 Q 28.4 3.9 26.3 2.2 Q 24.1 0.5 22.7 0.3 Q 21.2 0 21.2 0 Z';
  // A sombra de si próprio é o próprio desenho uma beatada maior: o corpo todo
  // em cor de barbatana e, por cima, o mesmo corpo em cor de pele reduzido e
  // descaído para cima e para a esquerda. Fica uma orla mais escura nas costas
  // e na barriga — onde a luz não chega — com dois nós e sem gradientes.
  const dentro = 'translate(24.85 52) scale(0.955) translate(-24.85 -52) translate(-0.5 -0.9)';
  // A faixa clara da barriga acompanha a frente do bicho, do queixo ao princípio
  // do caracol.
  const faixa = 'M 12.4 40 C 8.6 47.5 9.2 56.5 14.8 64.4 C 18.8 70 23.6 74.4 27.4 78.6';
  // Os gomos vão da frente da barriga até à linha do peito, e encolhem a descer,
  // como no desenho de origem.
  const gomos: [number, number, number, number][] = [
    [8.8, 41.6, 14.2, 43], [7.2, 47, 13.4, 48.6], [7.4, 52.6, 14.2, 54.2],
    [9.6, 58, 16, 59.6], [13, 63, 19.2, 64.8], [17.2, 67.8, 23, 69.6],
    [21.2, 72, 26, 73.6]
  ];
  const vincos = gomos.map(([fx, fy, ix, iy]) => `M ${fx} ${fy} Q ${(fx + ix) / 2} ${fy + 3.4} ${ix} ${iy}`);
  // O leque fecha-se num ápice contra o corpo e abre para as costas; os três
  // raios estão nos lugares onde o desenho de origem os tem.
  const leque = 'M 33.2 56.6 C 35.6 49 44 46.6 46.8 51.8 C 49.4 56.8 46.6 63.4 40.6 64.8 C 36.6 65.6 33.4 61.6 33.2 56.6 Z';
  const raiosLeque = ['M 34.6 54.4 L 44.8 49.8', 'M 35.2 56.6 L 46 56.8', 'M 35 59.2 L 43.4 63.2'];
  // O caracol da cauda: por fora já vem no decalque; esta é a volta de dentro,
  // a que lhe faz de cauda a enrolar-se.
  const caracol = 'M 25.4 83.6 C 21.4 87.4 15.4 88 12.2 84.6';
  const gomosCauda = ['M 27.4 86.6 L 31 84.8', 'M 28.6 91.4 L 32.4 90.2', 'M 27.6 96.4 L 31.4 96', 'M 24 101 L 26.4 98.2'];
  return `<svg viewBox="0 0 49.7 104" role="img" aria-label="Cavalo-marinho" xmlns="http://www.w3.org/2000/svg">
  <path d="${corpo}" fill="${barbatana}" stroke="${LINHA}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/>
  <path d="${corpo}" fill="${pele}" transform="${dentro}"/>
  <path d="${faixa}" fill="none" stroke="${barriga}" stroke-width="10" stroke-linecap="round" opacity="0.95"/>
  ${raios(vincos, 1.5, TINTA_ESCURA, 0.2)}
  ${raios(['M 27 34 C 31 36 33 40 33 44'], 1.6, barbatana, 0.5)}
  <path d="${caracol}" fill="none" stroke="${barbatana}" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
  ${raios(gomosCauda, 1.5, TINTA_ESCURA, 0.18)}
  <path d="${leque}" fill="${barbatana}" stroke="${LINHA}" stroke-width="2" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(raiosLeque, 1.5, pele, 0.85)}
  <path d="M 6 35.4 C 9 39.2 14 39.8 18.2 36.4" fill="none" stroke="${LINHA}" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>
  ${olho(20.8, 21.4, 4.6)}
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

/** Búzio: concha em espiral construída como espiral A SÉRIO. O primeiro rascunho
 *  punha arcos soltos sobre um vulto e lia-se "batata"; o segundo punha riscas a
 *  sair do CENTRO, que é um sol — não uma concha.
 *
 *  Aqui o desenho É a matemática da concha: uma espiral logarítmica que cresce
 *  2,6 vezes por volta, e o tubo da volta é a faixa entre ela e a volta anterior.
 *  Daí tiram-se todas as peças: a boca é o corte no fim da volta mais gorda, e as
 *  riscas são travessas dessa faixa — por construção ficam DENTRO da concha, não há
 *  ponta nenhuma para fora (a lição das costelas da vieira). O bico fino é o
 *  princípio da espiral, onde a faixa já quase não tem espessura. */
export const CONCHA_ESPIRAL = (cores: { pele?: string; clara?: string; interior?: string; risca?: string } = {}) => {
  const pele = cores.pele ?? '#f2a95f';
  const clara = cores.clara ?? '#ffe0ad';
  const interior = cores.interior ?? '#a5652f';
  const risca = cores.risca ?? '#d9782f';
  const ax = 57, ay = 37;                    // o eixo da espiral, perto do centro
  const k = Math.log(2.6) / (Math.PI * 2);   // 2,6× por volta
  const r0 = 6.2, fim = 10.2, fase = -0.78;  // `fase` põe a boca virada para a esquerda
  const raio = (t: number) => r0 * Math.exp(k * t);
  const pto = (r: number, t: number): [number, number] => [ax + r * Math.cos(t + fase), ay + r * Math.sin(t + fase)];
  const fora: string[] = [];
  for (let t = 0; t <= fim + 1e-6; t += 0.28) {
    const [x, y] = pto(raio(t), t);
    fora.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const dentro: string[] = [];
  for (let t = fim; t >= -1e-6; t -= 0.28) {
    const [x, y] = pto(raio(t) / 2.6, t);
    dentro.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const volta = 'M ' + fora.join(' L ') + ' L ' + dentro.join(' L ') + ' Z';
  // Travessas da faixa: cada uma vai de uma borda da volta à outra, com uma
  // ligeira torção no meio para a risca seguir a volta em vez de a cortar à réguá.
  const riscas: string[] = [];
  for (let t = 1.7; t < fim - 0.5; t += 0.92) {
    const r1 = (raio(t) / 2.6) * 1.08, r2 = raio(t) * 0.93;
    const [x1, y1] = pto(r1, t);
    const [x2, y2] = pto(r2, t);
    const [xm, ym] = pto((r1 + r2) / 2, t + 0.3);
    riscas.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${xm.toFixed(1)} ${ym.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  // A boca: uma lente no corte da última volta. Enche para DENTRO, quase nada
  // para fora — quando era o contrário, a abertura saía da silhueta e parecia
  // uma língua de fora.
  const [bx, by] = pto(raio(fim), fim);
  const [ix, iy] = pto(raio(fim) / 2.6, fim);
  const mx = (bx + ix) / 2, my = (by + iy) / 2;
  const nx = -(iy - by), ny = ix - bx;                 // perpendicular ao corte
  const boca = `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(mx + nx * 0.44).toFixed(1)} ${(my + ny * 0.44).toFixed(1)} ${ix.toFixed(1)} ${iy.toFixed(1)}`
    + ` Q ${(mx - nx * 0.02).toFixed(1)} ${(my - ny * 0.02).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} Z`;
  const luz = pto(raio(7.4) * 0.84, 7.4), luz2 = pto(raio(9.9) * 0.84, 9.9);
  return `<svg viewBox="0 0 96 74" role="img" aria-label="Concha" xmlns="http://www.w3.org/2000/svg">
  <path d="${volta}" fill="${pele}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
  ${raios(riscas, 3.6, risca, 0.9)}
  <circle cx="${ax}" cy="${ay}" r="3.4" fill="${risca}"/>
  <path d="M ${luz[0].toFixed(1)} ${luz[1].toFixed(1)} Q ${pto(raio(8.6) * 0.98, 8.6)[0].toFixed(1)} ${pto(raio(8.6) * 0.98, 8.6)[1].toFixed(1)} ${luz2[0].toFixed(1)} ${luz2[1].toFixed(1)}" fill="none" stroke="${clara}" stroke-width="3.2" stroke-linecap="round" opacity="0.65"/>
  <path d="${boca}" fill="${interior}" stroke="${LINHA}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
  <path d="M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(mx - nx * 0.1).toFixed(1)} ${(my - ny * 0.1).toFixed(1)} ${ix.toFixed(1)} ${iy.toFixed(1)}" fill="none" stroke="${clara}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
</svg>`;
};

/** Ostra. Um só desenho com dois grupos nomeados: `<g class="ostra-corpo">` é a
 *  valva de baixo com o leito e a pérola, `<g class="ostra-valva">` é a de cima,
 *  chifrada na direita. Quem abre é o CSS a rodar esse grupo em redor da
 *  charneira — dois desenhos empilhados entregavam o truque pela emenda e pelas
 *  duas sombras.
 *
 *  A charneira fica à DIREITA e a boca à esquerda, como todos os bichos desta
 *  cena virados para a corrente; o grupo da valva roda à volta dela e levanta a
 *  ponta esquerda. Fechada, a valva tapa quase toda a pérola mas deixa ver uma
 *  réstia de carne e um bocado dela — é o convite. */
export const OSTRA = (cores: { concha?: string; risca?: string; interior?: string; carne?: string; perola?: string } = {}) => {
  const concha = cores.concha ?? '#cfd4da';
  const risca = cores.risca ?? '#a8b1ba';
  const interior = cores.interior ?? '#e7ddf0';
  const carne = cores.carne ?? '#f2a3ad';
  const perola = cores.perola ?? '#fffdf7';
  // Valva de baixo: a borda de cima (onde a carne se deita) e o bojo por baixo.
  const cha = 'M 12 62 C 42 74 80 72 106 54 C 98 92 24 90 12 62 Z';
  const leito = 'M 19 60 C 46 50 86 48 103 52 C 88 68 34 70 19 60 Z';
  // Valva de cima: uma aba com a borda ondulada — a ostra é uma concha torta,
  // não um leque arrumado como a vieira.
  const tampa = 'M 102 54 C 88 20 32 14 15 55 C 26 60 30 51 40 57 C 50 63 56 53 66 59 C 76 65 82 55 90 59 C 96 62 100 58 102 54 Z';
  // Costelas a sair da charneira (102,54), todas paradas a 78 % do caminho.
  const charneira: [number, number] = [100, 52];
  const costelas = ([[68, 22], [48, 18], [30, 26], [20, 42]] as [number, number][]).map(([px, py]) => {
    const x = charneira[0] + (px - charneira[0]) * 0.78;
    const y = charneira[1] + (py - charneira[1]) * 0.78;
    return `M ${charneira[0]} ${charneira[1]} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `<svg viewBox="0 0 120 100" role="img" aria-label="Ostra" xmlns="http://www.w3.org/2000/svg">
  <g class="ostra-corpo">
    <path d="${cha}" fill="${concha}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
    ${raios(['M 16 69 C 44 80 80 78 103 61', 'M 21 76 C 48 86 82 83 99 66', 'M 28 82 C 52 89 78 85 94 71'], 2, risca, 0.8)}
    <path d="${leito}" fill="${carne}" stroke="${LINHA}" stroke-width="1.8" stroke-linejoin="round" paint-order="stroke"/>
    <path d="M 26 58 C 48 52 82 51 98 53" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
    <ellipse cx="60" cy="61" rx="13" ry="4.6" fill="${TINTA_ESCURA}" opacity="0.2"/>
    <circle cx="60" cy="46" r="13.6" fill="${perola}" stroke="${LINHA}" stroke-width="2.2" paint-order="stroke"/>
    <path d="M 50 52 C 55 58 66 58 70 52 C 65 55 55 55 50 52 Z" fill="${TINTA_ESCURA}" opacity="0.15"/>
    <circle cx="55" cy="41" r="4" fill="${LUZ}" opacity="0.95"/>
    <circle cx="66" cy="50" r="2.2" fill="${LUZ}" opacity="0.5"/>
  </g>
  <g class="ostra-valva">
    <path d="${tampa}" fill="${interior}" stroke="${LINHA}" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke"/>
    ${raios(costelas, 2.2, risca, 0.8)}
    <path d="M 96 50 C 82 30 44 24 24 48" fill="none" stroke="${LUZ}" stroke-width="2.4" stroke-linecap="round" opacity="0.4"/>
  </g>
  <g class="ostra-brilho" opacity="0">
    <path d="M 80 26 L 82 32 L 88 34 L 82 36 L 80 42 L 78 36 L 72 34 L 78 32 Z" fill="${LUZ}"/>
    <path d="M 34 22 L 35.4 26 L 39.4 27.4 L 35.4 28.8 L 34 32.8 L 32.6 28.8 L 28.6 27.4 L 32.6 26 Z" fill="${LUZ}"/>
  </g>
</svg>`;
};


// ── Caranguejo ─────────────────────────────────────────────────────────────

/** O caranguejo que anda na areia. É o único bicho do fundo que anda em vez de
 *  ser levado, por isso é o único que tem patas de fora — e elas vivem em dois
 *  grupos (`cang-pernas-e` e `cang-pernas-d`) a alternar, que é o que faz dele um
 *  bicho a passear e não uma figura colada no sítio. As tenazes ficam em
 *  `cang-bracos`: é esse grupo que se levanta quando alguém lhe toca.
 *
 *  A silhueta desta versão vem de um decalque: uma gravura de domínio público de
 *  um caranguejo vermelho, rasterizada a 1375 px, tinta binarizada, interior
 *  preenchido e contorno seguido por caminhante de Moore + RDP num descascador
 *  de teste (`_shots/trace.mjs`, efémero). Daí a carapaça e as tenazes — com a
 *  frente chata, os ombros redondos e a fenda entre os dedos — serem a forma
 *  de um caranguejo a sério e não a minha ideia de um. Braços e patas são à
 *  mão: o decalque não sabe separar peças que se escondem umas atrás das
 *  outras, e uma pata de caranguejo é só três rectas grossas com o joelho mais
 *  alto que o pé — é isso que a faz ler como perna dobrada e não como pelo.
 *
 *  A pose da referência é de frente, e ficou assim de propósito: de lado, com
 *  duas tenazes uma atrás da outra, qualquer caranguejo parece um escaravelho.
 *  O bicho inteiro vive num único sistema de coordenadas (268,8 × 104 = a
 *  raster × 0,1955), por isso cada peça entra exactamente no sítio onde o
 *  desenho a cortou. Patas e braços continuam o mesmo traço desenhado duas
 *  vezes — escuro largo por baixo, cor por cima — que dá contorno e articulação
 *  sem `<defs>` nem máscaras, com pontas redondas para dedos de dois anos. */
export const CARANGUEJO = (cores: { casca?: string; escura?: string; clara?: string; iris?: string } = {}) => {
  const casca = cores.casca ?? '#e8452e';
  const escura = cores.escura ?? '#bf2d1c';
  const clara = cores.clara ?? '#ff9070';
  const iris = cores.iris ?? '#d9a441';

  /** Os dois contornos decalcados da referência, já no espaço do bicho. */
  const CARAPACA = 'M 115.6 32.6 Q 115.5 32.6 115.2 32.7 Q 114.9 32.8 114.9 33.9 Q 114.8 35 112.4 35 Q 109.9 35 109.8 34 Q 109.7 33 109 33 Q 108.3 33 104.8 33.5 Q 101.3 34 98.4 34.8 Q 95.6 35.6 93.8 36.5 Q 91.9 37.3 90.4 38.4 Q 88.8 39.5 86.6 41.8 Q 84.3 44 82.6 46.1 Q 80.9 48.1 79.6 47.8 Q 78.2 47.5 78.2 60.6 Q 78.2 73.7 132.9 73.7 Q 187.5 73.7 187.5 62.7 Q 187.5 51.6 184.7 47.7 Q 181.8 43.8 180.4 42.3 Q 178.9 40.7 177 39.1 Q 175 37.5 171.6 36.1 Q 168.1 34.6 163 33.7 Q 157.8 32.8 157.3 32.8 Q 156.8 32.8 156.7 33.9 Q 156.6 35 154.1 35 Q 151.7 35 151.6 33.8 Q 151.5 32.6 133.6 32.6 Q 115.7 32.6 115.6 32.6 Z';
  const TENAZ = 'M 229.4 47.9 Q 229.3 47.9 222.8 48.8 Q 216.2 49.7 214.6 50.2 Q 212.9 50.6 210.2 52.1 Q 207.4 53.6 204.9 53.2 Q 202.3 52.8 202.3 53.7 Q 202.3 54.5 203.8 54.7 Q 205.3 54.9 203.8 55.9 Q 202.3 56.9 202.3 64.1 Q 202.3 71.2 208.4 71.2 Q 214.5 71.2 214.6 75.1 Q 214.6 79 216.9 81 Q 219.1 82.9 220.9 82.9 Q 222.7 82.9 222.8 84.5 Q 222.9 86 227.9 90.3 Q 232.8 94.6 232.5 94.7 Q 232.2 94.8 230.5 93.9 Q 228.7 93.1 225.8 91.2 Q 222.9 89.3 223 90.5 Q 223.1 91.7 228.6 94.6 Q 234 97.5 239.8 99.6 Q 245.5 101.7 246.8 101.7 Q 248.1 101.7 248.5 100.9 Q 248.9 100.1 240 93.4 Q 231.1 86.6 228.2 83.4 Q 225.2 80.3 223.6 77.1 Q 221.9 73.9 225 72.1 Q 228.1 70.2 231.8 69.4 Q 235.4 68.6 238.6 68.7 Q 241.8 68.8 245.2 69.4 Q 248.5 70 253 71.3 Q 257.5 72.5 259.9 73.6 Q 262.2 74.7 263.9 74.5 Q 265.5 74.3 266 73.8 Q 266.5 73.3 266.6 72.5 Q 266.6 71.7 266 70.4 Q 265.3 69 261.7 64.4 Q 258 59.8 253.5 56 Q 248.9 52.2 244.3 50.4 Q 239.7 48.5 234.6 48.2 Q 229.5 47.9 229.4 47.9 Z';

  const traco = (d: string, largo: number, cor: string): string =>
    `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${largo}" stroke-linecap="round" stroke-linejoin="round"/>`;

  /** Uma perna: coxa a sair de debaixo da carapaça, joelho a arquear para
   *  fora, tíbia a cair em bico com o pé redondo. Articulação a mais é o que
   *  faltava à versão anterior, que tinha patas de aranha em bicho de oito
   *  patas curtas. */
  const pata = (bx: number, by: number, kx: number, ky: number, tx: number, ty: number): string =>
    traco(`M ${bx} ${by} Q ${(bx + kx) / 2} ${(by + ky) / 2 - 2} ${kx} ${ky} L ${tx} ${ty}`, 7, escura)
    + traco(`M ${bx} ${by} Q ${(bx + kx) / 2} ${(by + ky) / 2 - 2} ${kx} ${ky} L ${tx} ${ty}`, 4.2, casca)
    + `<circle cx="${kx}" cy="${ky}" r="2.9" fill="${casca}" stroke="${escura}" stroke-width="1.9" paint-order="stroke"/>`
    + `<circle cx="${tx}" cy="${ty}" r="2.6" fill="${casca}" stroke="${escura}" stroke-width="1.9" paint-order="stroke"/>`;

  const pernas = pata(182, 72, 201, 84, 197, 97)
    + pata(187, 74, 217, 87, 213, 98)
    + pata(192, 72, 231, 85, 227, 96.5);

  /** O braço é curto e gordo, acabado num pulso redondo: a tenaz decalcada
   *  liga-se exactamente aí, no corte por onde ela saía da carapaça. */
  const braco = traco('M 180 60 C 188 55 195 53.5 202 56', 7.4, escura)
    + traco('M 180 60 C 188 55 195 53.5 202 56', 4.8, casca)
    + `<circle cx="192" cy="56.5" r="3.6" fill="${casca}" stroke="${escura}" stroke-width="1.8" paint-order="stroke"/>`
    + `<circle cx="205.5" cy="57.5" r="4.8" fill="${casca}" stroke="${escura}" stroke-width="2" paint-order="stroke"/>`;

  const bracoComTenaz = braco
    + `<path d="${TENAZ}" fill="${casca}" stroke="${escura}" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>`
    + `<path d="M 216 62 C 226 57 240 59 250 66" fill="none" stroke="${clara}" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>`;

  const olhoGrande = (cx: number): string =>
    `<circle cx="${cx}" cy="59.5" r="8.4" fill="${LUZ}" stroke="${LINHA}" stroke-width="2.2"/>`
    + `<circle cx="${cx - 1.6}" cy="61.5" r="3.9" fill="${iris}"/>`
    + `<circle cx="${cx - 2.1}" cy="62" r="2.5" fill="#22303c"/>`
    + `<circle cx="${cx + 2.4}" cy="56.6" r="1.8" fill="${LUZ}"/>`;

  const espelho = 'translate(268.8 0) scale(-1 1)';

  return `<svg viewBox="0 0 268.8 104" role="img" aria-label="Caranguejo" xmlns="http://www.w3.org/2000/svg">
  <g class="cang-pernas-e">${pernas}</g>
  <g transform="${espelho}"><g class="cang-pernas-d">${pernas}</g></g>
  <g class="cang-bracos">
    ${bracoComTenaz}
    <g transform="${espelho}">${bracoComTenaz}</g>
  </g>
  <path d="${CARAPACA}" fill="${casca}" stroke="${LINHA}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/>
  <path d="${CARAPACA}" fill="${casca}" transform="translate(133 54) scale(0.955) translate(-133 -54) translate(-0.4 -0.8)"/>
  <path d="M 84 66 C 106 73.2 160 73.4 183 61" fill="none" stroke="${escura}" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
  <path d="M 90 40 C 104 35.5 128 33.8 152 35" fill="none" stroke="${clara}" stroke-width="3.4" stroke-linecap="round" opacity="0.5"/>
  <path d="M 112 34.5 C 108 24 102 12 99 4" fill="none" stroke="${TINTA_ESCURA}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M 154 34.5 C 158 24 164 12 167 4" fill="none" stroke="${TINTA_ESCURA}" stroke-width="1.5" stroke-linecap="round"/>
  ${olhoGrande(119)}
  ${olhoGrande(147.5)}
  <circle cx="128.5" cy="72.5" r="1.8" fill="${escura}"/>
  <circle cx="140.5" cy="72.5" r="1.8" fill="${escura}"/>
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
