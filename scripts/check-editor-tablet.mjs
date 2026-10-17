#!/usr/bin/env node
// Regression check da change openspec `editor-tablet`:
// o editor é uma CENA ESTÁTICA (nada anima, sombras só no edit, DPR ≤ 1.5 em
// toque) e EDITA POR TAP (um dedo que arrasta só navega a câmera; multi-toque
// nunca edita). O jogo continua vivo — ▶ Testar anima o mundo.
//
// Cobre também: paridade de mouse (clique edita / arrasto orbita / direita e
// Enter concluem estrada / roda dá zoom), tap-seleção sem entrada de undo,
// mover objeto = exatamente 1 undo, alvos de toque ≥ 44 px nas duas
// orientações, e 11 px/400 ms como fronteira do gesto.
//
//   node scripts/check-editor-tablet.mjs
//
// Requisitos: dev server no ar (npm run dev) — usa GAME_URL se definido.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Os browsers do Playwright vivem em .pw-browsers/ (ver scripts/*.mjs).
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, '.pw-browsers');
const { chromium } = await import('playwright');

const BASE = process.env.GAME_URL || 'http://localhost:5173/';
const editorUrl = (level) => BASE + (BASE.includes('?') ? '&' : '?') + `editor=1&debug=1&level=${level}`;

const failures = [];
function check(ok, label, detail) {
  console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + label + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(label);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function openEditor(page, level) {
  await page.goto(editorUrl(level), { waitUntil: 'load' });
  await page.waitForSelector('.ed-root');
  await page.waitForFunction(() => document.querySelectorAll('.ed-outliner .ed-item').length > 0, null, { timeout: 60000 });
  await sleep(3500); // modelos + damping assentam
}
async function sectionCount(page, title) {
  const t = await page.$eval('.ed-outliner', (e) => e.innerText);
  // as secções do outliner renderizam UPPERCASE (text-transform)
  const m = t.match(new RegExp(title + ' \\((\\d+)\\)', 'i'));
  return m ? Number(m[1]) : 0;
}

// ---------- 1) cena estática em todos os mundos ----------
for (const level of ['vale', 'ilha', 'deserto', 'neve', 'montanhas']) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openEditor(page, level);
  const cv = page.locator('canvas').first();
  const f1 = await cv.screenshot();
  await sleep(2500);
  const f2 = await cv.screenshot();
  await sleep(2500);
  const f3 = await cv.screenshot();
  check(f1.equals(f2) && f2.equals(f3), `editor idle: três frames consecutivos idênticos (${level})`);
  // desktop DPR 1 mantém ratio de render 1 (comportamento antigo)
  const ratio = await cv.evaluate((el) => el.width / el.getBoundingClientRect().width);
  check(ratio === 1, `desktop DPR 1 mantém ratio 1 (${level})`, String(ratio));
  await ctx.close();
}

// ---------- 2) desktop: paridade de mouse + gesto ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openEditor(page, 'vale');
  const cv = page.locator('canvas').first();
  const box = await cv.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // unidades do reconhecedor, importadas do módulo real
  const units = await page.evaluate(async () => {
    const m = await import('/src/editor/EditorApp.ts');
    const g = { startX: 0, startY: 0, startT: 0, moved: false, multi: false };
    return {
      e11: m.isTapGesture(g, 11, 0, 400, 1),
      e12: m.isTapGesture(g, 12, 0, 400, 1),
      e13: m.isTapGesture(g, 13, 0, 400, 1),
      moved: m.isTapGesture({ ...g, moved: true }, 2, 0, 100, 1),
      tooSlow: m.isTapGesture(g, 3, 0, 600, 1),
      multi: m.isTapGesture({ ...g, multi: true }, 2, 0, 100, 1),
      secondFinger: m.isTapGesture(g, 2, 0, 100, 2),
      thresholds: [m.TAP_MAX_MOVE_PX, m.TAP_MAX_MS]
    };
  });
  check(units.e11 && units.e12 && !units.e13, 'fronteira do gesto: 11/12 px são tap, 13 px é arrasto', JSON.stringify(units));
  check(!units.moved && !units.tooSlow && !units.multi && !units.secondFinger, 'arrasto/demorado/multi-toque nunca são tap');
  check(units.thresholds[0] === 12 && units.thresholds[1] === 500, 'constantes TAP_MAX_MOVE_PX=12 / TAP_MAX_MS=500');

  // clique com ferramenta coloca
  await page.getByRole('button', { name: '🏠 Casa', exact: true }).click();
  const n0 = await sectionCount(page, 'Casas');
  await page.mouse.click(cx, cy);
  await sleep(900);
  const n1 = await sectionCount(page, 'Casas');
  check(n1 === n0 + 1, 'clique com a ferramenta coloca', `${n0} -> ${n1}`);

  // arrasto com ferramenta ativa: orbita e NÃO coloca
  const before = await cv.screenshot();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(cx + i * 25, cy + i * 6);
  await page.mouse.up();
  await sleep(700);
  check((await sectionCount(page, 'Casas')) === n1, 'arrasto com ferramenta ativa não coloca');
  check(!before.equals(await cv.screenshot()), 'arrasto orbitou a câmera (mundo mudou)');

  // estrada: pontos por clique + concluir por clique direito
  await page.getByRole('button', { name: '🛤️ Estrada', exact: true }).click();
  const r0 = await sectionCount(page, 'Estradas');
  await page.mouse.click(cx - 90, cy + 40);
  await sleep(400);
  await page.mouse.click(cx + 90, cy + 40);
  await sleep(400);
  check(await page.getByRole('button', { name: '✔ Concluir' }).isVisible(), '✔ Concluir aparece com 2 pontos');
  await page.mouse.click(cx, cy, { button: 'right' });
  await sleep(900);
  const r1 = await sectionCount(page, 'Estradas');
  check(r1 === r0 + 1, 'clique direito conclui a rascunhada', `${r0} -> ${r1}`);

  // ... e Enter também conclui (teclado inalterado)
  await page.mouse.click(cx - 80, cy + 60);
  await sleep(300);
  await page.mouse.click(cx + 80, cy + 60);
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(900);
  const r2 = await sectionCount(page, 'Estradas');
  check(r2 === r1 + 1, 'Enter conclui a rascunhada', `${r1} -> ${r2}`);

  // apagar: colocamos uma casa NOVA sob o cursor e a apagamos ali mesmo — com a
  // câmera parada entre os dois cliques, o toque só pode acertar o objeto recém-posto
  await page.getByRole('button', { name: '🏠 Casa', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(700);
  const hDel = await sectionCount(page, 'Casas');
  // a colocação seleciona a casa nova: o painel de propriedades abre com um
  // segundo "🗑️ Apagar" — clicar o da barra de ferramentas
  await page.locator('.ed-top').getByRole('button', { name: '🗑️ Apagar', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(800);
  const hDelAfter = await sectionCount(page, 'Casas');
  check(hDelAfter === hDel - 1, 'toque em modo apagar remove o objeto recém-colocado', `${hDel} -> ${hDelAfter}`);

  // mover objeto: drag move, UM undo repõe; tap-seleção não cria undo
  await page.getByRole('button', { name: '👆 Selecionar', exact: true }).click();
  await page.getByRole('button', { name: '🏠 Casa', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(900);
  await page.getByRole('button', { name: '👆 Selecionar', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(500);
  const propsSel = '.ed-props input[type=number]';
  check((await page.locator(propsSel).count()) >= 2, 'toque em objeto abre as propriedades');
  const btnUndo = page.locator('.ed-btn[title*="Desfazer"]');
  const depth0 = await page.evaluate(() => window.__debug.undoDepth());
  await page.mouse.click(cx, cy); // tap-seleção outra vez
  await sleep(400);
  const depth1 = await page.evaluate(() => window.__debug.undoDepth());
  check(depth1 === depth0, 'tap-seleção não cria entrada de undo', `${depth0} -> ${depth1}`);
  const posBefore = await page.locator(propsSel).evaluateAll((els) => els.map((e) => e.value).join(','));
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 14, cy + i * 4);
  await page.mouse.up();
  await sleep(900);
  const posMoved = await page.locator(propsSel).evaluateAll((els) => els.map((e) => e.value).join(','));
  check(posMoved !== posBefore, 'arrasto move o objeto');
  await btnUndo.click();
  await sleep(900);
  await page.mouse.click(cx, cy);
  await sleep(500);
  const posUndone = await page.locator(propsSel).evaluateAll((els) => els.map((e) => e.value).join(','));
  check(posUndone === posBefore, 'um undo repõe a posição (move = 1 entrada)', `${posUndone} vs ${posBefore}`);

  // roda do mouse: zoom sem editar
  const shotA = await cv.screenshot();
  const hc = await sectionCount(page, 'Casas');
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -400);
  await sleep(800);
  check(!(await shotA.equals(await cv.screenshot())), 'roda do mouse continua dando zoom');
  check((await sectionCount(page, 'Casas')) === hc, 'roda do mouse não edita');

  await ctx.close();
}

// ---------- 2b) fora dos limites: soltar o arrasto devolve + avisa ----------
// página limpa: sem estradas desenhadas, para o ponteiro--down pegar a casa e
// não uma alça de estrada que porventura cruze o mesmo pixel
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openEditor(page, 'vale');
  const box = await page.locator('canvas').first().boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.getByRole('button', { name: '🏠 Casa', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(900);
  await page.getByRole('button', { name: '👆 Selecionar', exact: true }).click();
  await page.mouse.click(cx, cy);
  await sleep(500);
  const propsSel = '.ed-props input[type=number]';
  const pos0 = await page.locator(propsSel).evaluateAll((els) => els.map((e) => e.value).join(','));
  const d0 = await page.evaluate(() => window.__debug.undoDepth());
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(cx - i * 10, Math.max(box.y + 6, cy - i * 55));
  await page.mouse.up();
  await sleep(700);
  const toastTxt = (await page.locator('.ed-status').textContent()) ?? '';
  check(/Não dá para colocar aqui/.test(toastTxt), 'soltar fora dos limites mostra o aviso de limite', JSON.stringify(toastTxt));
  const pos1 = await page.locator(propsSel).evaluateAll((els) => els.map((e) => e.value).join(','));
  check(pos1 === pos0, 'soltar fora dos limites devolve o objeto (sem mover)', `${pos0} -> ${pos1}`);
  check((await page.evaluate(() => window.__debug.undoDepth())) === d0, 'revert fora dos limites não cria undo');
  await ctx.close();
}

// ---------- 3) tablet: DPR, swipe/pinche/tap ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  await openEditor(page, 'vale');
  const cv = page.locator('canvas').first();
  const box = await cv.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  const ratio = await cv.evaluate((el) => el.width / el.getBoundingClientRect().width);
  check(coarse && ratio <= 1.51, 'tablet: render scale limitado a 1.5', `ratio=${ratio.toFixed(2)} coarse=${coarse}`);

  await page.getByRole('button', { name: '🏠 Casa', exact: true }).tap();
  const t0 = await sectionCount(page, 'Casas');
  const shotA = await cv.screenshot();
  const cdp = await ctx.newCDPSession(page);
  // swipe com um dedo: orbita, nunca edita
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 6; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 22, y: cy + i * 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
  const t1 = await sectionCount(page, 'Casas');
  check(t1 === t0, 'swipe de um dedo não coloca', `${t0} -> ${t1}`);
  check(!(await shotA.equals(await cv.screenshot())), 'swipe de um dedo orbitou a câmera');
  // pinch com dois dedos: nunca edita
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 60, y: cy, id: 1 }, { x: cx + 60, y: cy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 100, y: cy, id: 1 }, { x: cx + 100, y: cy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
  check((await sectionCount(page, 'Casas')) === t1, 'pince com dois dedos nunca edita');
  // toque simples: edita
  await page.touchscreen.tap(cx, cy);
  await sleep(900);
  check((await sectionCount(page, 'Casas')) === t1 + 1, 'toque simples coloca');
  await ctx.close();
}

// ---------- 4) alvos de toque ≥ 44 px (duas orientações) ----------
for (const vp of [{ width: 1180, height: 820 }, { width: 820, height: 1180 }]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  await openEditor(page, 'vale');
  const small = await page.evaluate(() => {
    const sels = ['.ed-top button', '.ed-pal', '.ed-outliner .ed-item', '.ed-props select', '.ed-props input[type=number]', '.ed-top select', '.ed-top input[type=text]'];
    const bad = [];
    for (const sel of sels) {
      for (const e of document.querySelectorAll(sel)) {
        if (!e.offsetParent) continue; // controlo escondido não é alvo
        const r = e.getBoundingClientRect();
        if (r.width < 43.5 || r.height < 43.5) bad.push(`${sel} "${(e.innerText || e.placeholder || '').slice(0, 20)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
      }
    }
    return bad;
  });
  check(small.length === 0, `controles interativos ≥ 44 px (${vp.width}×${vp.height})`, small.slice(0, 6).join(' | '));
  await ctx.close();
}

// ---------- 5) ▶ Testar: o jogo continua vivo ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openEditor(page, 'vale');
  // a barra superior pode quebrar linha a 1024 px; clicar pelo DOM
  await page.evaluate(() => [...document.querySelectorAll('.ed-top button')].find((b) => /Testar/.test(b.textContent))?.click());
  await page.waitForFunction(() => window.__diag?.().games > 0, null, { timeout: 30000 });
  await sleep(4000);
  const cv = page.locator('canvas').first();
  const g1 = await cv.screenshot();
  await sleep(2500);
  const g2 = await cv.screenshot();
  check(!g1.equals(g2), '▶ Testar roda o jogo real com ambience viva (frames mudam)');
  const diag = await page.evaluate(() => window.__diag());
  check(diag.games >= 1 && !diag.editor, 'modo ao vivo assumiu (sem editor por trás)', JSON.stringify(diag));
  // sair do ▶ Testar volta ao editor (o botão 🏠 do HUD reage a pointerdown)
  await page.locator('.hud-home').dispatchEvent('pointerdown');
  await page.waitForFunction(() => window.__diag?.().editor === true, null, { timeout: 60000 });
  const back = await page.evaluate(() => window.__diag());
  check(back.editor === true && back.games === 0, 'sair do ▶ Testar devolve o editor', JSON.stringify(back));
  // o editor renasce estático (não comparar frames antes dos modelos assentarem)
  await page.waitForFunction(() => document.querySelectorAll('.ed-outliner .ed-item').length > 0, null, { timeout: 60000 });
  await sleep(3500);
  const e1 = await page.locator('canvas').first().screenshot();
  await sleep(2500);
  const e2 = await page.locator('canvas').first().screenshot();
  check(e1.equals(e2), 'editor volta estático depois do ▶ Testar');
  await ctx.close();
}

await browser.close();
console.log(failures.length === 0 ? '\nTODOS OS CHECKS OK' : `\nFALHAS: ${failures.length}\n - ${failures.join('\n - ')}`);
process.exit(failures.length === 0 ? 0 : 1);
