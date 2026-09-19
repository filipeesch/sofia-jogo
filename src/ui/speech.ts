// Fala os nomes dos itens em pt-PT (quebra-cabeças e pintura).
//
// On desktop and Android, window.speechSynthesis just works. iOS Safari does
// not, and the failure mode is silence with no error, so everything below
// exists for one of these four reasons (all verified in WebKit's source, the
// WebKit bug tracker and PhET's production announcer):
//
//  1. USER GESTURE. On iOS the very first speak() of a page is DROPPED unless
//     it runs inside a user activation - and, per SpeechSynthesis.cpp, one
//     accepted speak() lifts the restriction for the whole document. So we
//     spend the first tap on a silent volume-0 utterance (primeOnGesture).
//  2. VOICES. getVoices() is empty when the page loads; 'voiceschanged' only
//     exists on Safari >= 16, and downloaded voices may never show up at all
//     (bugs 250665 / 290497). So we never wait for a voice: we poll for one
//     and speak with lang only if none arrives.
//  3. EVENTS. 'end' (and sometimes 'start') is unreliable, and cancel()
//     fires a spurious 'canceled' error on the utterance it just removed.
//     Hence: idempotent finish(), a strong reference to the utterance (if it
//     is garbage collected, 'end' never fires), and two watchdogs.
//  4. SPACING. Speaking right after cancel() in the same tick is a known
//     race; PhET waits 125 ms on Safari - less does not help.
//
// The keep-alive hacks floating around (resume()/pause() every second,
// chunking long texts) are for desktop Chromium's remote voices only, and are
// known to BREAK speech elsewhere - deliberately not used here.

import { resume as resumeAudio } from './sfx';
import { playSound, preloadSound } from './sounds';

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** iPadOS reports "Macintosh", so touch points decide. */
export const IS_IOS =
  /iP(hone|ad|od)/.test(UA) ||
  (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Smallest delay that reliably lets the next utterance start after cancel(). */
const IOS_SPACING_MS = 125;
/** No 'start' (and speaking=false) within this -> this attempt is silent. */
const START_TIMEOUT_MS = 1600;

let voices: SpeechSynthesisVoice[] = [];
let primed = !IS_IOS; // non-iOS has no gesture gate
let silentTries = 0;
let giveUp = false;
let armed = false;

function norm(lang: string): string {
  return lang.toLowerCase().replace('_', '-');
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return (
    voices.find((v) => norm(v.lang) === 'pt-pt') ??
    voices.find((v) => norm(v.lang).startsWith('pt-pt')) ??
    voices.find((v) => norm(v.lang).startsWith('pt')) ??
    null
  );
}

// ---- optional recordings ------------------------------------------------
//
// speechSynthesis is the one part of this app we do not control: on iOS it
// depends on which voice the tablet has downloaded (or ignores the language
// altogether). The vocabulary here is fixed and tiny, so a recorded pt-PT
// clip beats it on every point - and it is the only thing that speaks the
// LETTER NAMES on a device with no Portuguese voice installed.
//
// Drop mp3s in public/voice/ and list them in public/voice/manifest.json
// (see public/voice/manifest.example.json) and they take over. Without that
// file nothing is fetched and everything below is inert.

let clips: Record<string, string> | null = null;
let clipsTried = false;

/** "Dáblio" -> "dablio": the key a clip file is listed under. */
function clipKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

async function loadClips(): Promise<void> {
  if (clipsTried) return;
  clipsTried = true;
  try {
    const res = await fetch('voice/manifest.json');
    if (!res.ok) return; // the normal case: no recordings shipped
    const data = (await res.json()) as { clips?: Record<string, string> };
    const map = data.clips;
    if (!map) return;
    clips = {};
    for (const [k, url] of Object.entries(map)) {
      const key = clipKey(k);
      clips[key] = url;
      void preloadSound(url, 6);
    }
  } catch {
    /* offline or no manifest: the synthesiser carries on */
  }
}

/** True when 'text' has a recording (used to skip the synthesiser). */
export function hasClip(text: string): boolean {
  return !!clips && !!clips[clipKey(text)];
}

function collectVoices(): boolean {
  try {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) {
      voices = list;
      return true;
    }
  } catch { /* no synthesis */ }
  return false;
}

/**
 * Voices arrive asynchronously (and on iOS <= 15 without any event), so:
 * listen for 'voiceschanged' AND poll for a few seconds.
 */
export function initSpeech(): void {
  void loadClips();
  const synth = window.speechSynthesis;
  if (!synth || armed) return;
  armed = true;
  if (collectVoices()) return;
  try { synth.addEventListener?.('voiceschanged', () => { collectVoices(); }); } catch { /* older engines */ }
  const t0 = Date.now();
  const poll = window.setInterval(() => {
    if (collectVoices() || Date.now() - t0 > 4000) window.clearInterval(poll);
  }, 250);
}

/**
 * One silent utterance, spent on the first tap of the session: that is what
 * unlocks speechSynthesis for the rest of the document on iOS. Call once at
 * startup; it installs its own listener and gets out of the way after that.
 */
export function primeOnGesture(): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  initSpeech();
  if (!IS_IOS || primed) { resumeAudio(); return; }
  const handler = (): void => {
    window.removeEventListener('pointerdown', handler, true);
    window.removeEventListener('keydown', handler, true);
    resumeAudio();
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'pt-PT';
      synth.speak(u);
    } catch { /* nothing to do */ }
    primed = true;
  };
  window.addEventListener('pointerdown', handler, { capture: true, passive: true });
  window.addEventListener('keydown', handler, { capture: true });
}

/** iOS jams the engine for the whole tab on text with markup-ish characters. */
function sanitize(text: string): string {
  return text.replace(/[<>&`"'\u2018\u2019\u201C\u201D]/g, '').trim();
}

/** True once speech has failed silently twice: the app may offer a hint. */
export function speechLooksDead(): boolean {
  return giveUp;
}

/**
 * Speaks 'text' in pt-PT. 'onDone' is ALWAYS called (immediately when there is
 * no speech at all) so callers can chain: name first, then the animal sound.
 */
export function speakName(text: string, onDone?: (ok: boolean) => void): void {
  const done = (ok: boolean): void => { if (onDone) onDone(ok); };
  const safe = sanitize(text);
  if (!safe) { done(false); return; }

  // A recording beats the synthesiser: the same voice every time, genuinely
  // pt-PT, and it still works on an iOS device with no Portuguese voice
  // installed (or after giveUp). Missing file -> the fallback below speaks.
  const clip = clips ? clips[clipKey(safe)] : undefined;
  if (clip) {
    playSound(clip, () => synthesise(safe, done), 1, () => done(true));
    return;
  }

  if (giveUp || !window.speechSynthesis) { done(false); return; }
  // Any call from a real tap counts as the unlock (the puzzle speaks from a
  // pointerup handler, which is a user activation).
  if (!primed) primed = true;
  synthesise(safe, done);
}

/**
 * Corta a fala em curso — usado por um app ao voltar para o launcher. Tem de
 * passar por aqui: chamar window.speechSynthesis.cancel() à mão deixaria a
 * utterance em curso sem o 'end'/'error' tratado, e o motor de iOS fica a
 * dizer-se "speaking" para o resto da sessão.
 */
export function cancelSpeech(): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  try { synth.cancel(); } catch { /* ignore */ }
}

/** The speechSynthesis path: clear the queue, then speak (iOS needs a beat). */
function synthesise(safe: string, done: (ok: boolean) => void): void {
  const synth = window.speechSynthesis;
  if (!synth) { done(false); return; }
  try { synth.cancel(); } catch { /* ignore */ }
  if (IS_IOS) window.setTimeout(() => speakNow(synth, safe, done), IOS_SPACING_MS);
  else speakNow(synth, safe, done);
}

function speakNow(synth: SpeechSynthesis, safe: string, done: (ok: boolean) => void): void {
  let settled = false;
  let started = false;
  const u = new SpeechSynthesisUtterance(safe);
  u.lang = 'pt-PT';
  const v = pickVoice();
  // Never assign null: WebKit bug 243055 turns that into silence.
  if (v) u.voice = v;
  u.rate = 0.9; // a little slower: it is for a child
  u.pitch = 1.05;
  u.volume = 1;

  // Some WebKit builds drop 'end' when the utterance object is collectable.
  let keep: SpeechSynthesisUtterance | null = u;

  const startWatch = window.setTimeout(() => {
    if (!started) { try { synth.cancel(); } catch { /* ignore */ } finish(false); }
  }, START_TIMEOUT_MS);
  // Some browsers never fire 'end' at all - do not hang the caller.
  const endWatch = window.setTimeout(() => finish(started), 1100 + safe.length * 90 + 1200);
  // 'start' is unreliable too: watch speechSynthesis.speaking as a second opinion.
  const poll = window.setInterval(() => {
    if (started) { window.clearInterval(poll); return; }
    if (synth.speaking || synth.pending) started = true;
  }, 200);

  function finish(ok: boolean): void {
    if (settled) return;
    settled = true;
    window.clearTimeout(startWatch);
    window.clearTimeout(endWatch);
    window.clearInterval(poll);
    keep = null;
    if (ok) {
      silentTries = 0;
    } else if (!started) {
      silentTries++;
      if (silentTries >= 2) {
        giveUp = true;
        showSoundHint();
      }
    }
    done(ok);
  }

  u.onstart = () => { started = true; };
  u.onend = () => finish(true);
  // Our own cancel() also produces a 'canceled' error; finish() is idempotent
  // so a late 'canceled' after a successful utterance is harmless.
  u.onerror = () => finish(false);

  try {
    synth.speak(u);
  } catch {
    finish(false);
  }
}

// Speech ducks (or is ducked by) everything else on iOS, and a hidden tab
// leaves the engine stuck "speaking" - clear it when the app goes away.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
  });
}

// ---- "is it us or is it the iPad?" -------------------------------------

let hintShown = false;

/**
 * Nothing a web page can see: the iPhone ring/silent switch, the iPad mute
 * button in Control Centre and the hardware volume all silence BOTH
 * speechSynthesis and Web Audio. If speech went silent twice, say so once -
 * in practice this is the actual reason for "no voice on the iPad".
 */
function showSoundHint(): void {
  if (hintShown || typeof document === 'undefined') return;
  hintShown = true;
  const box = document.createElement('div');
  box.className = 'sound-hint';
  box.setAttribute('role', 'status');
  box.innerHTML =
    '<div class="sound-hint-text"><strong>Sem som?</strong> No iPad/iPhone verifique o volume e desligue o modo silencioso. ' +
    'Para voz em português: Ajustes &gt; Acessibilidade &gt; Conteúdo Falado &gt; Vozes &gt; Adicionar voz &gt; Português.</div>' +
    '<button class="sound-hint-close" aria-label="Fechar">\u2715</button>';
  const dismiss = (): void => { box.remove(); };
  box.addEventListener('pointerdown', (e) => { e.stopPropagation(); dismiss(); });
  document.body.append(box);
  window.setTimeout(dismiss, 14000);
}
