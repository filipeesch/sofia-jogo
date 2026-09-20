// Ferramenta descartável de decalque.
//
// Lê um BMP 24 bits (top-down) de uma imagem de colorir a preto e branco,
// limpa o fundo, segue o contorno exterior da figura e devolve esse contorno
// como um path SVG suavizado, já com a escala pedida. É o modo honesto de
// «copiar a imagem e trabalhá-la»: a silhueta vem do desenho de referência, o
// que se pinta por cima é nosso.
//
//   node trace.mjs ref-cavalo.bmp <altura viewBox> <eps> [limiar]
//
// Imprime JSON com a path e o viewBox, e escreve <nome>-trace.svg para ver.

import { readFileSync, writeFileSync } from 'node:fs';

const [ficheiro, alvoAlturaArg, epsArg, limiarArg] = process.argv.slice(2);
const ALVO_H = Number(alvoAlturaArg || 104);
const EPS = Number(epsArg || 9);
const LIMIAR = Number(limiarArg || 128);

const buf = readFileSync(ficheiro);
if (buf.toString('latin1', 0, 2) !== 'BM') throw new Error('não é BMP');
const largura = buf.readInt32LE(0x12);
const alturaBruta = buf.readInt32LE(0x16);
const topoParaBaixo = alturaBruta < 0;
const altura = Math.abs(alturaBruta);
const bpp = buf.readUInt16LE(0x1C);
const offset = buf.readUInt32LE(0x0A);
if (bpp !== 24) throw new Error('só BMP de 24 bits, este tem ' + bpp);

const stride = Math.floor((largura * 3 + 3) / 4) * 4;
// 1 = tinta, 0 = fundo.
const mask = new Uint8Array(largura * altura);
for (let y = 0; y < altura; y++) {
  const linhaOrigem = topoParaBaixo ? y : altura - 1 - y;
  const base = offset + linhaOrigem * stride;
  for (let x = 0; x < largura; x++) {
    const i = base + x * 3;            // BGR
    const lum = (buf[i] * 114 + buf[i + 1] * 587 + buf[i + 2] * 299) / 1000;
    if (lum < LIMIAR) mask[y * largura + x] = 1;
  }
}

// ── três afinações de laboratório ─────────────────────────────────────────
//
// * CROP="x,y,l,a": só interessa o que está dentro desta caixa. O resto é
//   apagado, por isso o que fica passa a estar rodeado de «fora» e o percursos
//   do contorno corta direito onde o bicho se ia ligar ao corpo — que é
//   exactamente onde o corpo o vai tapar quando o desenho for montado.
// * ERODE=r: faz desaparecer tudo o que é mais fino do que 2r. Serve para as
//   antenas (traço de 7 px) sem tocar nos contornos grossos (16 px).
// * GLOBAL="x,y,l,a,altura": em vez de cada recorte ter a sua própria escala,
//   todos os recortes falam no MESMO sistema de coordenadas, que é o do bicho
//   inteiro. É o que permite desmontar um caranguejo em peças e torná-lo a
//   montar no mesmo sítio.
// * APAGA="x,y,l,a;x,y,l,a": apaga caixas antes de tudo. Serve para cortar
//   antenas e bigodes que saem da peça: o caminhante de Moore odeia bicos
//   finos — fecha um laço à volta deles e desiste do resto da figura.
if (process.env.APAGA) {
  for (const troço of process.env.APAGA.split(';')) {
    const [ax, ay, al, aa] = troço.split(',').map(Number);
    for (let y = ay; y < ay + aa; y++) {
      for (let x = ax; x < ax + al; x++) {
        if (x >= 0 && y >= 0 && x < largura && y < altura) mask[y * largura + x] = 0;
      }
    }
  }
}
if (process.env.CROP) {
  const [cx, cy, cl, ca] = process.env.CROP.split(',').map(Number);
  for (let y = 0; y < altura; y++) {
    const dentro = y >= cy && y < cy + ca;
    for (let x = 0; x < largura; x++) {
      if (!dentro || x < cx || x >= cx + cl) mask[y * largura + x] = 0;
    }
  }
}
const ERODE = Number(process.env.ERODE || 0);
if (ERODE > 0) {
  const tmp = new Uint8Array(largura * altura);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let v = mask[y * largura + x];
      if (!v) continue;
      for (let dx = -ERODE; dx <= ERODE; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= largura || !mask[y * largura + xx]) { v = 0; break; }
      }
      tmp[y * largura + x] = v;
    }
  }
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let v = tmp[y * largura + x];
      if (!v) continue;
      for (let dy = -ERODE; dy <= ERODE; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura || !tmp[yy * largura + x]) { v = 0; break; }
      }
      mask[y * largura + x] = v;
    }
  }
}
// DILATE=r: o passo seguinte à erosão. Uma erosão a solo deixa degraus de 1 px
// que tornam a figura 8-ligada mas não 4-ligada, e o caminhante de Moore fecha
// um laço antecipado nesses degraus. Abrir (erosão + dilatação) alisa-os.
const DILATE = Number(process.env.DILATE || 0);
if (DILATE > 0) {
  const tmp = new Uint8Array(largura * altura);
  tmp.set(mask);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (tmp[y * largura + x]) continue;
      let v = 0;
      for (let dx = -DILATE; dx <= DILATE && !v; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < largura && tmp[y * largura + xx]) v = 1;
      }
      if (v) mask[y * largura + x] = 1;
    }
  }
  tmp.set(mask);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (tmp[y * largura + x]) continue;
      let v = 0;
      for (let dy = -DILATE; dy <= DILATE && !v; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < altura && tmp[yy * largura + x]) v = 1;
      }
      if (v) mask[y * largura + x] = 1;
    }
  }
}

// Menor caixa que contém toda a tinta.
let minX = largura, maxX = -1, minY = altura, maxY = -1;
for (let y = 0; y < altura; y++) {
  for (let x = 0; x < largura; x++) {
    if (!mask[y * largura + x]) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const temTinta = (x, y) => x >= 0 && y >= 0 && x < largura && y < altura && mask[y * largura + x] === 1;

// Antes de seguir o contorno, o desenho de colorir passa a FIGURA CHEIA: tudo
// o que não é alcançável a partir da borda sem atravessar tinta é interior. Um
// contorno de traço fino é um caso terrível para seguir bordas (as diagonais
// fazem o caminhante saltar de uma margem para a outra); o corpo cheio, esse é
// gordo e liso, e o contorno torna-se bem comportado.
const fora = new Uint8Array(largura * altura);
const fila = new Int32Array(largura * altura);
let topo = 0;
for (let x = 0; x < largura; x++) {
  for (const y of [0, altura - 1]) {
    const i = y * largura + x;
    if (!mask[i] && !fora[i]) { fora[i] = 1; fila[topo++] = i; }
  }
}
for (let y = 0; y < altura; y++) {
  for (const x of [0, largura - 1]) {
    const i = y * largura + x;
    if (!mask[i] && !fora[i]) { fora[i] = 1; fila[topo++] = i; }
  }
}
while (topo > 0) {
  const i = fila[--topo];
  const x = i % largura, y = (i - x) / largura;
  const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1,
                    y > 0 ? i - largura : -1, y < altura - 1 ? i + largura : -1];
  for (const j of vizinhos) {
    if (j >= 0 && !mask[j] && !fora[j]) { fora[j] = 1; fila[topo++] = j; }
  }
}
let solido = new Uint8Array(largura * altura);
for (let i = 0; i < solido.length; i++) solido[i] = (mask[i] || !fora[i]) ? 1 : 0;

// SUBTRAI="a.json,b.json": tira do sólido as peças que já foram decalcadas. É
// assim que uma peça fica com o contorno da peça por trás em vez de uma costura
// recta: o braço de um caranguejo não acaba em régua, acaba onde a carapaça o
// tapa. Os polígonos são os contornos simplificados, já em píxeis.
if (process.env.SUBTRAI) {
  for (const ficheiroPolygonos of process.env.SUBTRAI.split(',')) {
    const poly = JSON.parse(readFileSync(ficheiroPolygonos, 'utf8'));
    let minPy = 1e9, maxPy = -1e9;
    for (const [, py] of poly) { if (py < minPy) minPy = py; if (py > maxPy) maxPy = py; }
    for (let y = Math.max(0, Math.floor(minPy)); y <= Math.min(altura - 1, Math.ceil(maxPy)); y++) {
      let dentro = false;
      for (let x = 0; x < largura; x++) {
        let cruza = 0;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j];
          if ((yi <= y) !== (yj <= y)) {
            const t = (y - yi) / (yj - yi);
            if (xi + t * (xj - xi) > x) cruza++;
          }
        }
        if (cruza & 1) solido[y * largura + x] = 0;
      }
    }
  }
}
const temCorpo = (x, y) => x >= 0 && y >= 0 && x < largura && y < altura && solido[y * largura + x] === 1;

// Contorno exterior: Moore-neighborhood com memória da direcção de entrada
// (regra de Jacob). Começa no pixel de corpo mais alto e mais à esquerda, que
// é sempre borda, e entra vindo de oeste. Varre os vizinhos pela esquerda a
// partir de onde veio, o que mantém o corpo à direita em cada passo.
const DIRECCOES = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
function contornoExterno() {
  let inicio = null;
  for (let y = 0; y < altura && !inicio; y++) {
    for (let x = 0; x < largura; x++) {
      if (solido[y * largura + x]) { inicio = [x, y]; break; }
    }
  }
  if (!inicio) return [];
  const pontos = [];
  let actual = inicio;
  let anterior = [inicio[0] - 1, inicio[1]];
  // Índice da direcção actual -> anterior. Vínhamos de oeste, logo é [-1, 0].
  let casa = 4;
  for (let passo = 0; passo < 2_000_000; passo++) {
    pontos.push([actual[0], actual[1]]);
    let movido = false;
    for (let t = 6; t >= 1; t--) {           // varrer da esquerda para a direita
      const i = (casa + t) % 8;
      const x = actual[0] + DIRECCOES[i][0];
      const y = actual[1] + DIRECCOES[i][1];
      if (temCorpo(x, y)) {
        anterior = actual; actual = [x, y];
        casa = (i + 4) % 8;                  // de onde viemos, a partir de agora
        movido = true; break;
      }
    }
    if (!movido) break;
    if (actual[0] === inicio[0] && actual[1] === inicio[1] && pontos.length > 100) break;
  }
  return pontos;
}

// Ramer–Douglas–Peucker para deitar fora os pontos que não fazem falta.
function simplificar(pontos, eps) {
  if (pontos.length < 3) return pontos;
  const [ax, ay] = pontos[0], [bx, by] = pontos[pontos.length - 1];
  const dx = bx - ax, dy = by - ay;
  const comp = Math.hypot(dx, dy) || 1;
  let pior = -1, distancia = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = Math.abs(dy * pontos[i][0] - dx * pontos[i][1] + bx * ay - by * ax) / comp;
    if (d > distancia) { distancia = d; pior = i; }
  }
  if (distancia > eps && pior > 0) {
    const a = simplificar(pontos.slice(0, pior + 1), eps);
    const b = simplificar(pontos.slice(pior), eps);
    return a.slice(0, -1).concat(b);
  }
  return [pontos[0], pontos[pontos.length - 1]];
}

if (process.env.DUMP) {
  // Um BMP 24 bits de topo para baixo do que o percursos vai ver, para se poder
  // olhar para ele: sem isto está-se a afinar um algoritmo às cegas.
  const strideD = Math.floor((largura * 3 + 3) / 4) * 4;
  const corpo = Buffer.alloc(strideD * altura);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const v = solido[y * largura + x] ? 255 : 0;
    const o = y * strideD + x * 3;
    corpo[o] = v; corpo[o + 1] = v; corpo[o + 2] = v;
  }
  const cab = Buffer.alloc(54);
  cab.write('BM', 0); cab.writeUInt32LE(54 + corpo.length, 2); cab.writeUInt32LE(54, 10);
  cab.writeUInt32LE(40, 14); cab.writeInt32LE(largura, 18); cab.writeInt32LE(-altura, 22);
  cab.writeUInt16LE(1, 26); cab.writeUInt16LE(24, 28); cab.writeUInt32LE(corpo.length, 34);
  writeFileSync(process.env.DUMP, Buffer.concat([cab, corpo]));
}
const bruto = contornoExterno();
const limpo = simplificar(bruto, EPS);
if (process.env.SALVA) writeFileSync(process.env.SALVA, JSON.stringify(limpo));

// Passamos a caixa da tinta para o canto 0,0 e para a altura pedida.
const global = process.env.GLOBAL ? process.env.GLOBAL.split(',').map(Number) : null;
const ox = global ? global[0] : minX;
const oy = global ? global[1] : minY;
const escala = global ? global[4] / global[3] : ALVO_H / (maxY - minY + 1);
const w = global ? global[2] * escala : (maxX - minX + 1) * escala;
const alvo = limpo.map(([x, y]) => [
  Math.round((x - ox) * escala * 10) / 10,
  Math.round((y - oy) * escala * 10) / 10,
]);

// Suavização: cada ponto original passa a ser o ponto de controlo de um
// quadrático que passa pelo meio do segmento a seguir. É o truque clássico de
// fechar um polígono em curva sem lhe adicionar pontos.
function suavizar(p) {
  const n = p.length;
  const meio = (a, b) => [Math.round(((a[0] + b[0]) / 2) * 10) / 10, Math.round(((a[1] + b[1]) / 2) * 10) / 10];
  let d = 'M ' + meio(p[n - 1], p[0]).join(' ');
  for (let i = 0; i < n; i++) {
    d += ' Q ' + p[i].join(' ') + ' ' + meio(p[i], p[(i + 1) % n]).join(' ');
  }
  return d + ' Z';
}

// ── os detalhes por dentro ────────────────────────────────────────────────
//
// O contorno exterior já está. O que falta são as linhas de dentro — as
// costelas da barriga, a espiral da cauda, os raios da barbatana, o sorriso e
// o olho. Em vez de os adivinhar, vamos buscá-los ao desenho: a tinta que não
// é contorno é detalhe, e cada mancha de detalhe é um traço fino, por isso
// chega-nos por ela uma linha poligonal ajustada (PCA para achar o eixo,
// médias perpendiculares em fatias, RDP, suavização).
function BFS_sementes(sementes, valido) {
  const dist = new Int32Array(largura * altura).fill(-1);
  let topo = 0;
  const fila = new Int32Array(largura * altura);
  for (const i of sementes) { if (dist[i] < 0) { dist[i] = 0; fila[topo++] = i; } }
  while (topo > 0) {
    const i = fila[--topo];
    const x = i % largura, y = (i - x) / largura;
    const d = dist[i] + 1;
    const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1,
                      y > 0 ? i - largura : -1, y < altura - 1 ? i + largura : -1];
    for (const j of vizinhos) {
      if (j >= 0 && dist[j] < 0 && valido(j)) { dist[j] = d; fila[topo++] = j; }
    }
  }
  return dist;
}

const sementesTinta = [];
for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
  if (mask[y * largura + x]) sementesTinta.push(y * largura + x);
}
// bruto traz [x, y]; os percursos querem índices de píxel.
// A métrica que separa o contorno dos detalhes não é a distância ao longo da
// tinta (as costelas estão ligadas ao contorno e isso não distingue nada): é a
// distância à Região de fora. O traço do contorno encosta ao fundo; os detalhes
// do meio estão separados do fundo por dezenas de píxeis de branco.
const sementesFora = [];
for (let i = 0; i < fora.length; i++) if (fora[i]) sementesFora.push(i);
const distanciaAoFundo = BFS_sementes(sementesFora, () => true);
const DIST_LIMITE = Number(process.env.DIST || 20);

// Componentes conexas de tinta longe do contorno.
const rotulo = new Int32Array(largura * altura).fill(0);
const componentes = [];
for (const i of sementesTinta) {
  if (rotulo[i] || distanciaAoFundo[i] < DIST_LIMITE) continue;
  const id = componentes.length + 1;
  const pixels = [];
  let topo = 0;
  const fila = new Int32Array(200000);
  fila[topo++] = i; rotulo[i] = id;
  while (topo > 0) {
    const j = fila[--topo];
    pixels.push(j);
    const x = j % largura, y = (j - x) / largura;
    const vizinhos = [x > 0 ? j - 1 : -1, x < largura - 1 ? j + 1 : -1,
                      y > 0 ? j - largura : -1, y < altura - 1 ? j + largura : -1];
    for (const k of vizinhos) {
      if (k >= 0 && !rotulo[k] && mask[k] === 1 && distanciaAoFundo[k] >= DIST_LIMITE) {
        rotulo[k] = id; fila[topo++] = k;
      }
    }
  }
  componentes.push(pixels);
}

const paraAlvo = (x, y) => [
  Math.round((x - minX) * escala * 10) / 10,
  Math.round((y - minY) * escala * 10) / 10,
];

// Um traço fino vira uma linha: eixo principal por PCA, fatias ao longo do
// eixo, média da posição perpendicular em cada fatia.
function linhaDoComponente(pixels) {
  let mx = 0, my = 0;
  for (const p of pixels) { mx += p % largura; my += (p - (p % largura)) / largura; }
  mx /= pixels.length; my /= pixels.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pixels) {
    const x = (p % largura) - mx, y = ((p - (p % largura)) / largura) - my;
    sxx += x * x; sxy += x * y; syy += y * y;
  }
  const t = Math.atan2(2 * sxy, sxx - syy) / 2;
  const ux = Math.cos(t), uy = Math.sin(t);
  const vx = -uy, vy = ux;
  const caixas = new Map();
  let minProj = Infinity, maxProj = -Infinity;
  const proj = [];
  for (const p of pixels) {
    const x = (p % largura) - mx, y = ((p - (p % largura)) / largura) - my;
    const a = x * ux + y * uy, b = x * vx + y * vy;
    proj.push([a, b]);
    if (a < minProj) minProj = a; if (a > maxProj) maxProj = a;
  }
  const spano = maxProj - minProj;
  const n = Math.max(2, Math.min(26, Math.round(spano / (EPS * 0.9))));
  for (const [a, b] of proj) {
    const k = Math.min(n - 1, Math.max(0, Math.floor(((a - minProj) / (spano || 1)) * n)));
    const c = caixas.get(k) || [0, 0, 0];
    c[0] += a; c[1] += b; c[2]++; caixas.set(k, c);
  }
  const pts = [];
  for (const k of [...caixas.keys()].sort((a, b) => a - b)) {
    const [sa, sb, c] = caixas.get(k);
    const a = sa / c, b = sb / c;
    pts.push(paraAlvo(mx + a * ux + b * vx, my + a * uy + b * vy));
  }
  return pts;
}

const detalhes = [];
for (const pixels of componentes) {
  if (pixels.length < 260) continue;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pixels) {
    const x = p % largura, y = (p - x) / largura;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = x1 - x0, h = y1 - y0;
  const cheio = pixels.length / ((w + 1) * (h + 1));
  const [cx0, cy0] = paraAlvo((x0 + x1) / 2, (y0 + y1) / 2);
  if (cheio > 0.72 && Math.abs(w - h) < Math.max(8, w * 0.28) && w < 120) {
    detalhes.push({ tipo: 'olho', x: cx0, y: cy0, r: Math.round(((w + h) / 4) * escala * 10) / 10, px: pixels.length });
    continue;
  }
  const pts = linhaDoComponente(pixels);
  if (pts.length < 2) continue;
  const limpa = simplificar(pts, 0.6);
  if (limpa.length < 2) continue;
  const d = 'M ' + limpa.map((p) => p.join(' ')).join(' L ');
  detalhes.push({ tipo: 'linha', d, px: pixels.length, x: cx0, y: cy0 });
}

const caminho = suavizar(alvo);
const altView = global ? Math.round(global[4] * 10) / 10 : ALVO_H;
const svg = `<svg viewBox="0 0 ${Math.round(w * 10) / 10} ${altView}" xmlns="http://www.w3.org/2000/svg">
<path d="${caminho}" fill="#ffb457" stroke="#3a2a1e" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round"/>
${detalhes.filter((x) => x.tipo === 'linha').map((x) => `<path d="${x.d}" fill="none" stroke="#7a4a22" stroke-width="1.2" stroke-linecap="round"/>`).join('\n')}
${detalhes.filter((x) => x.tipo === 'olho').map((x) => `<circle cx="${x.x}" cy="${x.y}" r="${x.r}" fill="#3a2a1e"/>`).join('\n')}
</svg>`;
const destino = process.env.Saida || (ficheiro.replace(/\.(bmp|jpg|png)$/i, '') + '-trace.svg');
writeFileSync(destino, svg);

console.log(JSON.stringify({
  bmp: [largura, altura],
  caixa: [maxX - minX + 1, maxY - minY + 1],
  contornoBruto: bruto.length,
  simplificado: alvo.length,
  viewBox: [Math.round(w * 10) / 10, ALVO_H],
  eps: EPS,
  detalhes: detalhes.length,
  resumo: detalhes.map((x) => x.tipo + '@' + x.x + ',' + x.y + (x.tipo === 'olho' ? ' r' + x.r : '')),
  bytes: svg.length,
  saida: destino,
}, null, 2));
writeFileSync(ficheiro.replace(/\.(bmp|jpg|png)$/i, '') + '-detalhes.json', JSON.stringify(detalhes, null, 1));
console.log(caminho);
