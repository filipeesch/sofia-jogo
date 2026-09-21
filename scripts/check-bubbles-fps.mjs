#!/usr/bin/env node
// Regression check: "a cena das Bolhas continua a correr a 60 fps".
//
// As Bolhas nao tem canvas nem Three.js: sao DOM e CSS. Isso nao e de graca.
// Cada figura de cenario (algas, conchas, ostras, cavalos, caranguejo, peixes)
// e um <svg> com dezenas de nos, e muitas estao sempre a mexer-se sozinhas:
// os peixes passam, as algas balancam, as ostras respiram e o caranguejo
// passeia com as patas. Somam-se as bolhas, que saem de um spawner e do soprar
// continuo. O risco de uma cena assim num tablet e cair o framerate e a
// animacao ficar "aos saltos" para uma crianca de dois anos.
//
// Este teste abre as Bolhas num browser real e mede fps em tres situacoes:
//
//   1. a cena sozinha   — sem ninguem a tocar, só a vida propria + a musica
//   2. a cena soprando  — o dedo no botao de soprar, o ecra cheio de bolhas
//   3. soprando com o CPU 4x mais lento — aproximacao de um tablet modesto
//
//   node scripts/check-bubbles-fps.mjs
//
// Requisitos: dev server no ar (npm run dev) -- usa GAME_URL se definido.

import path from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, '.pw-browsers');
const { chromium } = await import('playwright');

const BASE = process.env.GAME_URL || 'http://localhost:5173/';
const DEBUG_URL = BASE + (BASE.includes('?') ? '&' : '?') + 'debug=1';

// Um tablet razoavel faz 60 fps; com o CPU quatro vezes mais lento ainda deve
// segurar os 30 fps, que e o minimo para um movimento se ler como continuo.
const FPS_CALMA = 50;
const FPS_PIOR = 30;

const failures = [];
function check(ok, label, detail) {
  console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + label + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(label + (detail ? ' -- ' + detail : ''));
}

/**
 * Mata os frames do browser e conta os intervalos entre requestAnimationFrame.
 * A contagem comeca agora e so para em stopFps; enquanto la esta, a cena vive
 * a sua vida normal (spawner, music, figuras animadas).
 */
async function startFps(page) {
  await page.evaluate(function () {
    const w = window;
    const estado = { deltas: [], id: 0, anterior: 0 };
    w.__fps = estado;
    function passo(t) {
      if (estado.anterior) estado.deltas.push(t - estado.anterior);
      estado.anterior = t;
      estado.id = requestAnimationFrame(passo);
    }
    estado.id = requestAnimationFrame(passo);
  });
}

/** Lê os frames acumulados e o estado da cena no mesmo instante. */
async function stopFps(page, etiqueta) {
  const m = await page.evaluate(function () {
    const w = window;
    const estado = w.__fps;
    cancelAnimationFrame(estado.id);
    const d = estado.deltas.slice().sort(function (a, b) { return a - b; });
    const q = function (p) {
      return d.length ? d[Math.min(d.length - 1, Math.floor(d.length * p))] : 0;
    };
    const fps = function (ms) { return ms > 0 ? 1000 / ms : 0; };
    const cena = document.querySelector('.bubbles');
    const um = function (s) { return cena ? cena.querySelectorAll(s).length : 0; };
    // A janela de diagnostico so existe com ?debug=1 e oferece funcoes, nao
    // valores: estado() devolve { tocando, ganho, fontes } e nivel() o RMS.
    const mar = w.__mar || null;
    let estadoMar = 'ausente', fontes = -1, nivel = -1;
    if (mar) {
      const e = mar.estado();
      estadoMar = e.tocando ? 'tocando' : 'parada';
      fontes = e.fontes;
      nivel = Math.round(mar.nivel() * 10000) / 10000;
    }
    return {
      frames: d.length,
      mediana: Math.round(fps(q(0.5)) * 10) / 10,
      p10: Math.round(fps(q(0.9)) * 10) / 10,
      piorFrame: Math.round(q(1) * 10) / 10,
      framesLentos: d.filter(function (x) { return x > 20; }).length,
      bolhas: um('.bubble'),
      nos: um('.bubbles-plant svg *, .bubbles-shell svg *, .bubbles-ostra svg *, .bubbles-horse svg *, .bubbles-caranguejo svg *, .bubbles-baleia svg *, .bubbles-fish svg *'),
      figuras: um('.bubbles-plant, .bubbles-shell, .bubbles-ostra, .bubbles-horse, .bubbles-caranguejo, .bubbles-baleia, .bubbles-fish'),
      ostras: um('.bubbles-ostra'),
      caranguejos: um('.bubbles-caranguejo'),
      baleias: um('.bubbles-baleia'),
      // O numero que importa num tablet nao e o dos nos parados, e o das
      // animacoes que estao a decorrer ao mesmo tempo: cada uma e um lugar na
      // composicao. Sao todas de transform/opacity, por isso vivem no
      // compositor e e por isso que o CPU 4x mais lento nao se nota.
      animacoes: Array.from(document.getAnimations()).filter(function (a) {
        return a.playState === 'running';
      }).length,
      mar: estadoMar,
      nivel: nivel,
      fontes: fontes,
    };
  });
  const lentosPct = m.frames ? Math.round((m.framesLentos / m.frames) * 100) : 0;
  console.log(
    '  ' + etiqueta.padEnd(22) +
    ' fps mediano ' + String(m.mediana).padStart(5) +
    '  |  10% piores ' + String(m.p10).padStart(5) +
    '  |  pior frame ' + String(m.piorFrame).padStart(6) + ' ms' +
    '  |  frames > 20 ms ' + m.framesLentos + '/' + m.frames + ' (' + lentosPct + '%)'
  );
  console.log(
    '  ' + ''.padEnd(22) +
    ' ' + m.bolhas + ' bolhas, ' + m.figuras + ' figuras de cenario (' +
    m.ostras + ' ostras, ' + m.caranguejos + ' caranguejo, ' + m.baleias + ' baleia), ' +
    m.animacoes + ' animacoes a decorrer, ' + m.nos + ' nos de svg' +
    '  |  musica ' + m.mar + ' (' + m.fontes + ' fontes, nivel ' + m.nivel + ')'
  );
  return m;
}

/** Descobre o browser disponivel (mesma regra dos outros checks). */
function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cached = path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium_headless_shell-1237');
  try {
    if (statSync(path.join(cached, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'))) return undefined;
  } catch {
    // cai para o Chrome do sistema
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) {
    try { if (statSync(c)) return c; } catch { /* tenta o proximo */ }
  }
  return undefined;
}

async function assertItIsTheGame() {
  try {
    const res = await fetch(DEBUG_URL);
    const html = await res.text();
    if (html.includes('Avião Aventureiro')) return;
  } catch {
    // cai para a mensagem de ajuda
  }
  console.error('GAME_URL (' + BASE + ') não serve este jogo.');
  console.error('Sobe o dev server (npm run dev) e, se a porta for outra:');
  console.error('  GAME_URL=http://127.0.0.1:5174/ npm run check:fps-bolhas');
  process.exit(1);
}

const DURACAO_MS = 6000;

await assertItIsTheGame();

const browser = await chromium.launch({
  headless: true,
  executablePath: findBrowser(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
// 1024x640 e o tablet da família; a cena inteira é medida em vh/vw.
const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
const page = await context.newPage();
page.on('pageerror', function (e) { console.log('  [pageerror] ' + String(e).slice(0, 200)); });
const client = await context.newCDPSession(page);

try {
  console.log('');
  await page.goto(DEBUG_URL, { waitUntil: 'networkidle' });
  await page.locator('.app-card[aria-label="Bolhas"]').click();
  await page.locator('.bubble').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);

  // Um toque numa bolha acorda o AudioContext ( politica do Safari ) e poe a
  // musica do mar a tocar: sem isto mediamos a cena muda, nao a cena real.
  await page.locator('.bubble').first().click({ force: true });
  await page.waitForTimeout(1200);

  console.log('Bolhas em cena, a medir ' + Math.round(DURACAO_MS / 1000) + ' s por situacao:');
  console.log('');

  // 1 — a cena a viver sozinha: peixes a passar, algas, ostras a respirar,
  //     caranguejo a passear, musica. Ninguem toca em nada.
  await startFps(page);
  await page.waitForTimeout(DURACAO_MS);
  const calma = await stopFps(page, '1. cena sozinha');
  check(calma.mediana >= FPS_CALMA, 'a cena sozinha segura ' + FPS_CALMA + ' fps', 'mediano=' + calma.mediana);
  check(calma.framesLentos <= calma.frames * 0.02, 'a cena sozinha nao tem mais de 2% de frames lentos',
    calma.framesLentos + '/' + calma.frames);
  check(calma.mar === 'tocando', 'a musica do mar estava a tocar durante a medicao', 'mar=' + calma.mar);
  check(calma.caranguejos === 1, 'ha um caranguejo a passear na cena', 'caranguejos=' + calma.caranguejos);
  check(calma.ostras >= 2, 'ha duas ostras a respirar na cena', 'ostras=' + calma.ostras);

  // 2 — pior caso: dedo colado no botao de soprar, que lanca uma bolha de 240
  //     em 240 ms ate ao limite do ecra, enquanto o spawner faz o seu trabalho.
  const blow = await page.locator('.bubbles-blow').boundingBox();
  await page.mouse.move(blow.x + blow.width / 2, blow.y + blow.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await startFps(page);
  await page.waitForTimeout(DURACAO_MS);
  const soprando = await stopFps(page, '2. soprando sem parar');
  await page.mouse.up();
  check(soprando.mediana >= FPS_CALMA, 'a cena soprando segura ' + FPS_CALMA + ' fps', 'mediano=' + soprando.mediana);
  check(soprando.bolhas >= 6, 'a cena estava mesmo cheia de bolhas', 'bolhas=' + soprando.bolhas);

  // 3 — o mesmo pior caso, mas com o CPU quatro vezes mais lento. Vale como
  //     limite inferior, nao como simulacao fiel de um tablet: o throttle
  //     atrasa a main thread, e nesta cena quase nada corre la (a musica tem um
  //     cronometro de 250 ms e o spawner de 900 ms). O que se paga num tablet e
  //     o que vai para a composicao, e isso mede-se na linha de cima.
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(1500);
  await page.mouse.move(blow.x + blow.width / 2, blow.y + blow.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await startFps(page);
  await page.waitForTimeout(DURACAO_MS);
  const lento = await stopFps(page, '3. soprando, CPU 4x');
  await page.mouse.up();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check(lento.mediana >= FPS_PIOR, 'com CPU 4x mais lento ainda segura ' + FPS_PIOR + ' fps', 'mediano=' + lento.mediana);
  check(lento.piorFrame < 200, 'com CPU 4x mais lento nenhum frame e um corte visivel', 'pior=' + lento.piorFrame + ' ms');

  console.log('');
  console.log(failures.length ? 'FALHOU: ' + failures.length + ' problema(s)' : 'TUDO OK -- a cena das Bolhas nao custa o framerate');
} finally {
  await browser.close();
}

if (failures.length) {
  console.log('');
  console.log('Falhas:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
