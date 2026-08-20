// DOM building helpers for the editor's panel UI.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/** A read-only label/value row. */
export function rowText(label: string, value: string): HTMLElement {
  const row = el('div', 'ed-row');
  row.appendChild(el('label', '', label));
  row.appendChild(el('span', '', value));
  return row;
}

/** A text input row that commits on change (trims; caller validates). */
export function textRow(label: string, value: string, onCommit: (v: string) => void): HTMLElement {
  const row = el('div', 'ed-row');
  row.appendChild(el('label', '', label));
  const input = el('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('change', () => onCommit(input.value.trim()));
  row.appendChild(input);
  return row;
}

/** A number input row, clamped to [min, max] on commit. */
export function numRow(
  label: string,
  value: number,
  onCommit: (v: number) => void,
  min = -140,
  max = 140,
  step = 1
): HTMLElement {
  const row = el('div', 'ed-row');
  row.appendChild(el('label', '', label));
  const input = el('input');
  input.type = 'number';
  input.step = String(step);
  input.min = String(min);
  input.max = String(max);
  input.value = String(Math.round(value * 10) / 10);
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (!Number.isFinite(v)) return;
    const cv = Math.max(min, Math.min(max, v));
    input.value = String(cv);
    onCommit(cv);
  });
  row.appendChild(input);
  return row;
}

/** A select row; missing `current` values get an extra option so state is visible. */
export function selectRow(
  label: string,
  opts: [string, string][],
  current: string,
  onCommit: (v: string) => void
): HTMLElement {
  const row = el('div', 'ed-row');
  row.appendChild(el('label', '', label));
  const sel = el('select');
  for (const [v, l] of opts) sel.appendChild(new Option(l, v));
  if (!Array.from(sel.options).some((o) => o.value === current)) sel.appendChild(new Option(current, current));
  sel.value = current;
  sel.addEventListener('change', () => onCommit(sel.value));
  row.appendChild(sel);
  return row;
}
