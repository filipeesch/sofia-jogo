#!/usr/bin/env node
// Regression check: "sair para o launcher não fecha o jogo".
//
// O sintoma original: às vezes, ao voltar ao launcher (home), a música do jogo
// continuava a tocar e o jogo continuava a consumir GPU/CPU em fundo. A causa
// e um Game orfao: startLevel e async (carrega GLBs), por isso um segundo
// toque no cartao da fase -- ou a escolha de outra fase -- durante o
// carregamento cria um segundo Game de que ninguem guarda referencia, e o botao
// home so destroi o ultimo.
//
// Este teste abre o jogo num browser real e verifica que, depois de voltar ao
// launcher, nao fica nenhum canvas nem nenhum AudioContext aberto, e que os
// ciclos de render pararam.
//
//   node scripts/check-exit-cleanup.mjs
//
// Requisitos: dev server no ar (npm run dev) -- usa GAME_URL se definido.

import path from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Os browsers do Playwright vivem em .pw-browsers/ (ver scripts/*.mjs).
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, '.pw-browsers');
const { chromium } = await import('playwright');

const BASE = process.env.GAME_URL || 'http://localhost:5173/';
const DEBUG_URL = BASE + (BASE.includes('?') ? '&' : '?') + 'debug=1';

const failures = [];
let step = 0;
function check(ok, label, detail) {
  console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + label + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(label + (detail ? ' -- ' + detail : ''));
}

/** Instrumenta AudioContext para contar contextes criados/fechados. */
function instrumentAudio() {
  const w = window;
  w.__audioProbe = { list: [] };
  const AC = w.AudioContext || w.webkitAudioContext;
  if (!AC) return;
  function Wrapped() {
    const ctx = new AC(...arguments);
    // Guarda quem criou o context (AudioManager do jogo vs. sfx partilhado)
    // para o relatorio dizer exactamente o que ficou aberto.
    const stack = String(new Error().stack || '').split(String.fromCharCode(10)).slice(2, 6)
      .map(function (s) { return s.trim().replace(/^at\s+/, '').split('/').slice(-1)[0]; })
      .filter(Boolean).join(' <- ');
    const rec = { ctx: ctx, closed: false, by: stack };
    w.__audioProbe.list.push(rec);
    const origClose = ctx.close.bind(ctx);
    ctx.close = function () {
      rec.closed = true;
      return origClose();
    };
    return ctx;
  }
  Wrapped.prototype = AC.prototype;
  w.AudioContext = Wrapped;
}

/** Estado observavel do jogo: ecra actual, numero de canvases, AudioContexts. */
const probeState = () => {
  const w = window;
  const list = (w.__audioProbe && w.__audioProbe.list) || [];
  const open = list.filter(function (r) { return !r.closed; });
  return {
    // NB: o seletor de fases tem de ser detectado pela grelha ('.home-grid'),
    // nao por '.home' — essa classe e o contentor do ecra do seletor. O botao
    // de saida do jogo e '.btn.hud-home' justamente para nao colidir com ela.
    screen: document.querySelector('.launcher') ? 'launcher'
      : document.querySelector('.ed-root') ? 'editor'
      : document.querySelector('.home-grid') ? 'levelselect'
      : document.querySelector('.btn.hud-home') ? 'game'
      : 'other',
    canvases: document.querySelectorAll('#app canvas').length,
    appChildren: document.getElementById('app').childElementCount,
    audioOpen: open.length,
    audioOpenBy: open.map(function (r) { return r.by + ' [' + r.ctx.state + ']'; }),
    audioRunning: open.filter(function (r) { return r.ctx.state === 'running'; }).length,
    // O context de música do jogo (AudioManager) é o que se ouve; o de sfx é a
    // cache partilhada dos sons gravados, que só precisa de estar acordada
    // quando alguém toca alguma coisa.
    musicRunning: open.filter(function (r) { return r.by.indexOf('AudioManager') >= 0 && r.ctx.state === 'running'; }).length,
    musicSuspended: open.filter(function (r) { return r.by.indexOf('AudioManager') >= 0 && r.ctx.state === 'suspended'; }).length,
    games: typeof w.__diag === 'function' ? w.__diag().games : null
  };
};

/**
 * Quantos canvases estao a ser renderizados activamente (pixels mudam entre
 * duas amostras). Requer ?debug=1 (preserveDrawingBuffer).
 */
const renderProbe = async () => {
  const hash = function (url) {
    let h = 0;
    for (let i = 0; i < url.length; i += 97) h = (h * 31 + url.charCodeAt(i)) | 0;
    return h;
  };
  const grab = function () {
    return Array.from(document.querySelectorAll('#app canvas')).map(function (c) {
      try {
        return hash(c.toDataURL('image/png'));
      } catch (e) {
        return -1;
      }
    });
  };
  const a = grab();
  await new Promise(function (r) { setTimeout(r, 700); });
  const b = grab();
  return { active: a.filter(function (v, i) { return v !== b[i]; }).length, canvases: a.length };
};

const settle = (page, ms) => page.waitForTimeout(ms === undefined ? 900 : ms);

/**
 * Dispara varios pointerdowns no mesmo tick — e assim que a crianca toca duas
 * vezes, e o unico modo deterministico de apanhar a corrida entre dois
 * carregamentos de fase (o clique do Playwright espera que o elemento fique
 * estavel, o que ja deixa o primeiro carregamento terminar).
 */
async function tapAll(page, names) {
  await page.evaluate(function (labels) {
    const cards = Array.from(document.querySelectorAll('.home-card, .app-card'));
    for (const label of labels) {
      const el = cards.find(function (n) { return n.getAttribute('aria-label') === label; });
      if (!el) {
        throw new Error('cartao nao encontrado: ' + label + ' | ecras: ' + document.body.className +
          ' | cartões: ' + cards.map(function (n) { return n.getAttribute('aria-label'); }).join(','));
      }
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    }
  }, names);
}
const levelCard = (page, name) => page.locator('.home-card[aria-label="' + name + '"]');
const appCard = (page, name) => page.locator('.app-card[aria-label="' + name + '"]');

async function openGame(page, appName, levelName) {
  await appCard(page, appName).click();
  await levelCard(page, levelName).click();
  await page.locator('.btn.hud-home').waitFor({ timeout: 30000 });
}

async function quitToLauncher(page) {
  await page.locator('.btn.hud-home').click();
  await page.locator('.launcher').waitFor({ timeout: 10000 });
  await settle(page);
}

async function assertNothingRunning(page, label) {
  const s = await page.evaluate(probeState);
  check(s.screen === 'launcher', label + ': voltou ao launcher', 'screen=' + s.screen);
  check(s.canvases === 0, label + ': nenhum canvas do jogo por terra', 'canvases=' + s.canvases);
  check(s.appChildren === 0, label + ': #app ficou vazio (nem jogo nem editor)', 'appChildren=' + s.appChildren);
  // No launcher nada pode estar a tocar: nem a música do jogo (o context é
  // fechado), nem a cache partilhada de sons (suspendida por idleSfx()).
  check(s.audioRunning === 0, label + ': nenhum AudioContext a correr (sem musica em fundo)',
    'running=' + s.audioRunning + (s.audioOpenBy.length ? ' -> ' + s.audioOpenBy.join(' | ') : ''));
  if (s.games !== null) check(s.games === 0, label + ': nenhum Game vivo', 'games=' + s.games);
  const rp = await page.evaluate(renderProbe);
  check(rp.active === 0, label + ': nenhum loop de render activo', 'active=' + rp.active + ', canvases=' + rp.canvases);
}

// Browser: o build do Playwright em .pw-browsers/ (se existir), senao um
// Chrome/Chromium do sistema.
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

// A porta 5173 costuma estar ocupada por outro projeto qualquer; dizer logo
// que aquilo não é o jogo poupa um timeout confuso.
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
  console.error('  GAME_URL=http://127.0.0.1:5174/ npm run check:exit');
  process.exit(1);
}

await assertItIsTheGame();

const executablePath = findBrowser();
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--autoplay-policy=no-user-gesture-required']
});
const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
await context.addInitScript(instrumentAudio);
const page = await context.newPage();
page.on('pageerror', function (e) { console.log('  [pageerror] ' + String(e).slice(0, 200)); });

try {
  step++;
  console.log('');
  console.log('[' + step + '] arranque normal: Avião -> Vale Vivo, depois home');
  await page.goto(DEBUG_URL, { waitUntil: 'load' });
  await page.locator('.launcher').waitFor();
  await openGame(page, 'Avião', 'Vale Vivo');
  let s = await page.evaluate(probeState);
  check(s.canvases === 1, 'jogo aberto tem exactamente 1 canvas', 'canvases=' + s.canvases);
  check(s.musicRunning >= 1, 'jogo aberto tem musica a tocar', 'musicRunning=' + s.musicRunning);
  let rp = await page.evaluate(renderProbe);
  check(rp.active === 1, 'jogo aberto esta a renderizar', 'active=' + rp.active);
  await quitToLauncher(page);
  await assertNothingRunning(page, 'sair normal');

  step++;
  console.log('');
  console.log('[' + step + '] duplo toque no cartao da fase (Carro -> Vale Vivo)');
  await appCard(page, 'Carro').click();
  await levelCard(page, 'Vale Vivo').waitFor();
  await tapAll(page, ['Vale Vivo', 'Vale Vivo']); // dois toques no mesmo tick
  await page.locator('.btn.hud-home').waitFor({ timeout: 30000 });
  await settle(page, 2500);
  s = await page.evaluate(probeState);
  check(s.canvases === 1, 'duplo toque cria apenas um jogo', 'canvases=' + s.canvases);
  await quitToLauncher(page);
  await assertNothingRunning(page, 'duplo toque');

  step++;
  console.log('');
  console.log('[' + step + '] trocar de fase depressa (Vale Vivo -> Mundo da Neve)');
  await appCard(page, 'Carro').click();
  await levelCard(page, 'Vale Vivo').waitFor();
  await tapAll(page, ['Vale Vivo', 'Mundo da Neve']); // troca antes de acabar de carregar
  await page.locator('.btn.hud-home').waitFor({ timeout: 30000 });
  await settle(page, 2500);
  s = await page.evaluate(probeState);
  check(s.canvases === 1, 'troca rapida deixa apenas um jogo', 'canvases=' + s.canvases);
  check(s.screen === 'game', 'troca rapida chegou ao jogo', 'screen=' + s.screen);
  await quitToLauncher(page);
  await assertNothingRunning(page, 'troca rapida');

  step++;
  console.log('');
  console.log('[' + step + '] ecra bloqueado (pause) para musica e render');
  await openGame(page, 'Carro', 'Deserto');
  await settle(page, 800);
  await page.evaluate(function () { window.__debug.pause(); });
  await settle(page, 400);
  s = await page.evaluate(probeState);
  rp = await page.evaluate(renderProbe);
  check(s.musicRunning === 0, 'em pausa a musica do jogo para', 'musicRunning=' + s.musicRunning);
  check(s.musicSuspended >= 1, 'em pausa o AudioContext do jogo fica suspenso', 'suspended=' + s.musicSuspended);
  check(rp.active === 0, 'em pausa o render para', 'active=' + rp.active);
  await page.evaluate(function () { window.__debug.resume(); });
  await settle(page, 600);
  rp = await page.evaluate(renderProbe);
  check(rp.active === 1, 'ao voltar do ecra bloqueado o jogo volta a renderizar', 'active=' + rp.active);
  await quitToLauncher(page);
  await assertNothingRunning(page, 'depois de pausa');

  step++;
  console.log('');
  console.log('[' + step + '] __loadLevel (ferramenta MCP) em serie');
  await page.evaluate(function () {
    window.__loadLevel('vale', 'car');
    window.__loadLevel('neve', 'car');
  });
  await page.locator('.btn.hud-home').waitFor({ timeout: 30000 });
  await settle(page, 2500);
  s = await page.evaluate(probeState);
  check(s.canvases === 1, '__loadLevel em serie deixa apenas um jogo', 'canvases=' + s.canvases);
  await quitToLauncher(page);
  await assertNothingRunning(page, '__loadLevel');

  step++;
  console.log('');
  console.log('[' + step + '] outros apps: Pintura, Bolhas, Quebra-Cabeca');
  for (const tour of [['Pintura', '.paint-back'], ['Bolhas', '.bubbles .back-btn'], ['Quebra-Cabeça', '.animals .back-btn']]) {
    await appCard(page, tour[0]).click();
    await page.locator(tour[1]).waitFor({ timeout: 10000 });
    await settle(page, 400);
    await page.locator(tour[1]).click();
    await page.locator('.launcher').waitFor({ timeout: 10000 });
    await settle(page, 600);
    await assertNothingRunning(page, 'voltar de ' + tour[0]);
  }

  step++;
  console.log('');
  console.log('[' + step + '] editor -> Testar (duplo toque) -> jogo -> editor -> sair');
  await tapAll(page, ['Editor', 'Editor']); // dois toques no cartao do editor
  await page.locator('.ed-live').waitFor({ timeout: 30000 });
  await settle(page, 800);
  s = await page.evaluate(probeState);
  check(s.appChildren === 1, 'editor (com toque duplo) abriu um so canvas', 'appChildren=' + s.appChildren);
  await page.evaluate(function () {
    const b = document.querySelector('.ed-live');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.locator('.btn.hud-home').waitFor({ timeout: 30000 });
  await settle(page, 2500);
  s = await page.evaluate(probeState);
  check(s.canvases === 1, 'duplo toque em Testar cria apenas um jogo', 'canvases=' + s.canvases);
  await page.locator('.btn.hud-home').click(); // volta ao editor com a mesma fase
  await page.locator('.ed-live').waitFor({ timeout: 30000 });
  await settle(page, 1500);
  s = await page.evaluate(probeState);
  // O canvas que fica em #app e o da cena do editor; do jogo nao pode ficar nada.
  check(s.screen === 'editor', 'voltar do modo ao vivo mostra o editor', 'screen=' + s.screen);
  if (s.games !== null) check(s.games === 0, 'voltar do modo ao vivo nao deixa jogos', 'games=' + s.games);
  await page.locator('.ed-top .ed-btn').first().click(); // sair do editor
  await page.locator('.launcher').waitFor({ timeout: 10000 });
  await settle(page);
  await assertNothingRunning(page, 'sair do editor');

  step++;
  console.log('');
  console.log('[' + step + '] os sons acordam quando se toca em algo (idleSfx)');
  s = await page.evaluate(probeState);
  check(s.audioRunning === 0, 'no launcher o AudioContext dos sons esta adormecido', 'running=' + s.audioRunning);
  await appCard(page, 'Bolhas').click();
  await page.locator('.bubble').first().waitFor({ timeout: 15000 });
  await page.locator('.bubble').first().click({ force: true });
  await settle(page, 600);
  s = await page.evaluate(probeState);
  check(s.audioRunning >= 1, 'rebentar uma bolha acorda o AudioContext dos sons', 'running=' + s.audioRunning);
  await page.locator('.bubbles .back-btn').click();
  await page.locator('.launcher').waitFor({ timeout: 10000 });
  await settle(page, 600);
  await assertNothingRunning(page, 'depois das bolhas');
  console.log('');
  console.log(failures.length ? 'FALHOU: ' + failures.length + ' problema(s)' : 'TUDO OK -- nenhum jogo sobrevive ao launcher');
} finally {
  await browser.close();
}

if (failures.length) {
  console.log('');
  console.log('Falhas:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
