// Utilidades compartidas por las vistas.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Mezcla un arreglo (Fisher-Yates) sin modificar el original. */
export function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Markdown mínimo: párrafos, viñetas "- ", **negrita** y `código`. */
export function markdown(texto) {
  const inline = (s) => escapar(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  return texto.split(/\n\s*\n/).map((bloque) => {
    const lineas = bloque.split('\n');
    if (lineas.every((l) => l.trim().startsWith('- '))) {
      return `<ul>${lineas.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`;
    }
    // Párrafo seguido de lista
    const idx = lineas.findIndex((l) => l.trim().startsWith('- '));
    if (idx > 0 && lineas.slice(idx).every((l) => l.trim().startsWith('- '))) {
      return `<p>${inline(lineas.slice(0, idx).join(' '))}</p><ul>${lineas.slice(idx).map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${inline(lineas.join(' '))}</p>`;
  }).join('');
}

/** Texto "Archivo, pág. N" para citar una fuente. */
export function citar(fuente) {
  if (!fuente) return '';
  return fuente.pagina ? `${fuente.archivo}, pág. ${fuente.pagina}` : fuente.archivo;
}

/** Formato de número en español (coma decimal). */
export function num(x, dec = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  const r = Math.round(x * 10 ** dec) / 10 ** dec;
  return r.toLocaleString('es-AR', { maximumFractionDigits: dec });
}

/** Lee un número escrito por el usuario: acepta coma decimal y separadores de miles. */
export function leerNumero(texto) {
  if (texto === null || texto === undefined) return NaN;
  let s = String(texto).trim().replace(/\s/g, '').replace('%', '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

export function formatoTiempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
