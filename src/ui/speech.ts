// Web Speech API helper: fala em voz alta um nome curto (pt-PT) dos itens
// dos quebra-cabeças. Se o speechSynthesis não existir (ou falhar), chama
// onDone imediatamente, para o chamante seguir (ex.: tocar o som gravado).
// A mesma filosofia de fallback do resto do app (GLB -> primitivas, MP3 -> sfx).

function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const norm = (l: string) => l.toLowerCase().replace('_', '-');
    return (
      voices.find((v) => norm(v.lang) === 'pt-pt') ??
      voices.find((v) => norm(v.lang).startsWith('pt')) ??
      null
    );
  } catch {
    return null;
  }
}

// Fala o nome do item em pt-PT. 'onDone' é chamado quando a fala termina
// (ou imediatamente, se não houver suporte) — os quebra-cabeças usam isso
// para tocar o som do animal logo depois do nome.
export function speakName(text: string, onDone?: () => void): void {
  const synth = window.speechSynthesis;
  if (!synth) {
    if (onDone) onDone();
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-PT';
    const v = pickPortugueseVoice();
    if (v) u.voice = v;
    u.rate = 0.9; // um pouco mais devagar: é para criança
    u.pitch = 1.05;
    let finished = false;
    let timer = 0;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      if (timer) window.clearTimeout(timer);
      if (onDone) onDone();
    };
    u.onend = finish;
    u.onerror = () => finish();
    // Rede de segurança: alguns navegadores não disparam 'end' de forma
    // confiável — limita a espera para o som não ficar pendurado.
    const estimate = 1100 + text.length * 90;
    timer = window.setTimeout(finish, estimate + 900);
    synth.speak(u);
  } catch {
    if (onDone) onDone();
  }
}
