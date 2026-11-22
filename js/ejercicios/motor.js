// Motor genérico de ejercicios: dibuja casilleros, corrige y muestra la
// resolución paso a paso. Cada tipo de ejercicio (tipos.js) devuelve
// "bloques" de casilleros con su valor esperado y la lista de pasos.

import { escapar, leerNumero, $, $$ } from '../util.js';

/* ---------- Constructores de casilleros ---------- */

export const campoNumero = (id, esperado, opts = {}) => ({ id, tipo: 'numero', esperado, ancho: 's', ...opts });
export const campoTexto = (id, esperado, opts = {}) => ({ id, tipo: 'texto', esperado, ancho: 's', ...opts });
export const campoSelect = (id, esperado, opciones, opts = {}) => ({ id, tipo: 'select', esperado: String(esperado), opciones, ancho: 'm', ...opts });

const normalizar = (s) => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '').replace(/^[-–—]$/, '');

export function corregirCampo(c, valor) {
  if (c.validar) return c.validar(valor);
  if (c.tipo === 'numero') {
    const v = leerNumero(valor);
    if (Number.isNaN(v)) return false;
    const tol = Math.max(c.tol ?? 0.01, (c.tolRel ?? 1e-4) * Math.abs(c.esperado));
    return Math.abs(v - c.esperado) <= tol;
  }
  if (c.tipo === 'select') return String(valor) === c.esperado;
  const alternativas = [c.esperado, ...(c.alternativas || [])].map(normalizar);
  return alternativas.includes(normalizar(valor));
}

function mostrarEsperado(c) {
  if (c.mostrar !== undefined) return c.mostrar;
  if (c.tipo === 'select') {
    const op = c.opciones.find((o) => String(Array.isArray(o) ? o[0] : o) === c.esperado);
    return op ? (Array.isArray(op) ? op[1] : op) : c.esperado;
  }
  if (c.tipo === 'numero') return Number.isInteger(c.esperado) ? String(c.esperado) : c.esperado.toLocaleString('es-AR', { maximumFractionDigits: 3 });
  return c.esperado === '' ? '–' : String(c.esperado);
}

/* ---------- Dibujo ---------- */

function inputHTML(c) {
  const etiqueta = c.label ? ` aria-label="${escapar(c.label)}"` : '';
  if (c.tipo === 'select') {
    return `<select class="campo ancho-${c.ancho}" data-campo="${c.id}"${etiqueta}>
      <option value="">—</option>
      ${c.opciones.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${escapar(v)}">${escapar(t)}</option>`; }).join('')}
    </select>`;
  }
  const modo = c.tipo === 'numero' ? 'inputmode="decimal"' : 'autocapitalize="characters" autocomplete="off" spellcheck="false"';
  return `<input class="campo ancho-${c.ancho}" data-campo="${c.id}" ${modo} placeholder="${escapar(c.placeholder || '')}"${etiqueta}>`;
}

function celdaHTML(celda, modoSolucion) {
  if (celda === null || celda === undefined) return '<td></td>';
  if (celda.texto !== undefined) return `<td class="dato">${celda.html ? celda.texto : escapar(celda.texto)}</td>`;
  return `<td>${modoSolucion ? `<span class="valor-sol">${escapar(mostrarEsperado(celda))}</span>` : inputHTML(celda)}</td>`;
}

export function bloquesHTML(bloques, modoSolucion = false) {
  return bloques.map((b) => {
    const titulo = b.titulo ? `<h4>${escapar(b.titulo)}</h4>` : '';
    const ayuda = b.ayuda && !modoSolucion ? `<p class="ayuda">${b.ayuda}</p>` : '';
    if (b.tipo === 'html') return `<div class="bloque">${titulo}${b.html}</div>`;
    if (b.tipo === 'campos') {
      return `<div class="bloque">${titulo}${ayuda}<div class="grilla-campos">
        ${b.campos.map((c) => `<label class="campo-etiquetado"><span>${c.etiquetaHTML || escapar(c.label)}</span>${modoSolucion ? `<span class="valor-sol">${escapar(mostrarEsperado(c))}</span>` : inputHTML(c)}</label>`).join('')}
      </div></div>`;
    }
    if (b.tipo === 'tabla') {
      return `<div class="bloque">${titulo}${ayuda}<div class="tabla-scroll"><table class="tabla-ej ${b.clase || ''}">
        ${b.encabezado ? `<thead><tr>${b.etiquetas !== false ? '<th></th>' : ''}${b.encabezado.map((h) => `<th>${escapar(h)}</th>`).join('')}</tr></thead>` : ''}
        <tbody>${b.filas.map((f) => `<tr>${b.etiquetas !== false ? `<th scope="row">${f.etiquetaHTML || escapar(f.etiqueta)}</th>` : ''}${f.celdas.map((c) => celdaHTML(c, modoSolucion)).join('')}</tr>`).join('')}</tbody>
      </table></div></div>`;
    }
    return '';
  }).join('');
}

function todosLosCampos(bloques) {
  const lista = [];
  for (const b of bloques) {
    if (b.tipo === 'campos') lista.push(...b.campos);
    if (b.tipo === 'tabla') b.filas.forEach((f) => f.celdas.forEach((c) => { if (c && c.id) lista.push(c); }));
  }
  return lista;
}

/* ---------- Ejercicio interactivo ---------- */

/**
 * Monta un ejercicio en `raiz`.
 * @param {HTMLElement} raiz
 * @param {{bloques:any[], pasos:string[], extraSolucion?:string, nota?:string}} armado
 * @param {(perfecto:boolean)=>void} alCorregir
 */
export function montar(raiz, armado, alCorregir) {
  const campos = todosLosCampos(armado.bloques);
  raiz.innerHTML = `
    <form class="form-ejercicio" autocomplete="off">${bloquesHTML(armado.bloques)}</form>
    <div class="resultado-correccion" aria-live="polite"></div>
    <div class="acciones">
      <button type="button" class="boton primario" data-accion="corregir">Corregir</button>
      <button type="button" class="boton" data-accion="resolucion">Ver resolución paso a paso</button>
      <button type="button" class="boton fantasma" data-accion="limpiar">Borrar respuestas</button>
    </div>
    <section class="resolucion" hidden></section>`;
  const form = $('.form-ejercicio', raiz);
  const salida = $('.resultado-correccion', raiz);
  const resol = $('.resolucion', raiz);

  $('[data-accion="corregir"]', raiz).addEventListener('click', () => {
    let ok = 0;
    let vacios = 0;
    for (const c of campos) {
      const el = $(`[data-campo="${c.id}"]`, form);
      const valor = el.value;
      const bien = corregirCampo(c, valor);
      if (!String(valor).trim() && !bien) vacios++;
      el.classList.toggle('ok', bien);
      el.classList.toggle('mal', !bien);
      el.title = bien ? 'Correcto' : `Incorrecto${c.pista ? `: ${c.pista}` : ''}`;
      if (bien) ok++;
    }
    const perfecto = ok === campos.length;
    salida.innerHTML = `<div class="aviso ${perfecto ? 'ok' : ok / campos.length >= 0.6 ? '' : 'mal'}">
      ${perfecto ? '¡Todo correcto! 🎉' : `${ok} de ${campos.length} casilleros correctos.${vacios ? ` Quedan ${vacios} sin completar.` : ''} Los que están en rojo tienen errores.`}
    </div>`;
    alCorregir?.(perfecto);
  });

  $('[data-accion="limpiar"]', raiz).addEventListener('click', () => {
    $$('[data-campo]', form).forEach((el) => { el.value = ''; el.classList.remove('ok', 'mal'); });
    salida.innerHTML = '';
  });

  $('[data-accion="resolucion"]', raiz).addEventListener('click', () => {
    if (!resol.hidden) { resol.hidden = true; return; }
    resol.hidden = false;
    let visibles = 1;
    const dibujarPasos = () => {
      resol.innerHTML = `
        <h3>Resolución paso a paso</h3>
        <ol class="pasos">${armado.pasos.slice(0, visibles).map((p) => `<li>${p}</li>`).join('')}</ol>
        ${visibles < armado.pasos.length ? `
          <div class="acciones">
            <button type="button" class="boton" data-paso="uno">Siguiente paso (${visibles}/${armado.pasos.length})</button>
            <button type="button" class="boton fantasma" data-paso="todos">Mostrar todos</button>
          </div>` : `
          <h3>Resultado</h3>
          ${armado.extraSolucion || ''}
          <div class="solucion">${bloquesHTML(armado.bloques, true)}</div>
          <button type="button" class="boton fantasma" data-paso="rellenar">Copiar la solución en mis casilleros</button>`}`;
      $('[data-paso="uno"]', resol)?.addEventListener('click', () => { visibles++; dibujarPasos(); });
      $('[data-paso="todos"]', resol)?.addEventListener('click', () => { visibles = armado.pasos.length; dibujarPasos(); });
      $('[data-paso="rellenar"]', resol)?.addEventListener('click', () => {
        for (const c of campos) {
          const el = $(`[data-campo="${c.id}"]`, form);
          el.value = c.tipo === 'select' ? c.esperado : (c.valorRelleno ?? mostrarEsperado(c)).replace(/^–$/, '');
          el.classList.remove('ok', 'mal');
        }
        salida.innerHTML = '';
      });
    };
    dibujarPasos();
    resol.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
