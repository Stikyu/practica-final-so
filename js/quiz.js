// Multiple choice: práctica con feedback inmediato, simulacro de final con
// temporizador y repaso de errores.

import * as datos from './datos.js';
import * as progreso from './progreso.js';
import { escapar, mezclar, citar, formatoTiempo, $, $$ } from './util.js';

let estado = null; // sesión en curso
let temporizador = null;

export function simulacroEnCurso() {
  return estado && estado.modo === 'simulacro' && !estado.terminado;
}

function limpiarTemporizador() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

/* ---------------- Configuración ---------------- */

export async function vistaConfig(raiz, modo) {
  limpiarTemporizador();
  estado = null;
  const [us, todas] = await Promise.all([datos.unidades(), datos.preguntas()]);
  const errores = new Set(progreso.idsConError());
  const esSimulacro = modo === 'simulacro';
  const esErrores = modo === 'errores';
  const titulo = esSimulacro ? 'Simulacro de final' : esErrores ? 'Repasar mis errores' : 'Multiple choice';
  const bajada = esSimulacro
    ? 'Preguntas mezcladas, con tiempo y sin ver las respuestas hasta el final. Al terminar tenés la nota y la revisión de cada pregunta.'
    : esErrores
      ? 'Solo aparecen las preguntas cuya última respuesta fue incorrecta. Si la acertás, sale de la lista.'
      : 'Elegí unidades y cantidad. Después de cada respuesta ves si estuvo bien, cuál era la correcta y por qué.';

  const cuenta = (u) => todas.filter((p) => p.unidad === u.id && (!esErrores || errores.has(p.id))).length;

  raiz.innerHTML = `
    <section class="pagina">
      <h1>${titulo}</h1>
      <p class="bajada">${bajada}</p>
      ${esErrores && errores.size === 0 ? `<div class="aviso ok">No tenés errores pendientes. Practicá en <a href="#/quiz">Multiple choice</a> y volvé después.</div>` : ''}
      <form id="form-config" class="tarjeta config">
        <fieldset>
          <legend>Unidades</legend>
          <div class="chips">
            <label class="chip"><input type="checkbox" id="todas" checked> <span>Todas mezcladas</span></label>
            ${us.map((u) => `<label class="chip"><input type="checkbox" name="unidad" value="${u.id}" checked> <span>U${u.numero} · ${escapar(u.corto)} <small>(${cuenta(u)})</small></span></label>`).join('')}
          </div>
        </fieldset>
        ${esSimulacro ? `
        <fieldset class="fila-campos">
          <label>Preguntas <input type="number" name="n" value="40" min="5" max="300" inputmode="numeric"></label>
          <label>Minutos <input type="number" name="m" value="60" min="1" max="300" inputmode="numeric"></label>
        </fieldset>` : `
        <fieldset>
          <legend>Cantidad</legend>
          <div class="chips">
            ${[10, 20, 50].map((n, i) => `<label class="chip"><input type="radio" name="cantidad" value="${n}" ${i === 0 ? 'checked' : ''}> <span>${n}</span></label>`).join('')}
            <label class="chip"><input type="radio" name="cantidad" value="todas"> <span>Todas</span></label>
          </div>
        </fieldset>`}
        <p class="disponibles" id="disponibles"></p>
        <button class="boton primario grande" type="submit">${esSimulacro ? 'Empezar simulacro' : 'Empezar'}</button>
      </form>
    </section>`;

  const form = $('#form-config', raiz);
  const checks = $$('input[name="unidad"]', form);
  const todasChk = $('#todas', form);
  const seleccion = () => checks.filter((c) => c.checked).map((c) => c.value);
  const pool = () => todas.filter((p) => seleccion().includes(p.unidad) && (!esErrores || errores.has(p.id)));
  const actualizar = () => {
    todasChk.checked = checks.every((c) => c.checked);
    $('#disponibles', form).textContent = `${pool().length} preguntas disponibles con esta selección.`;
  };
  todasChk.addEventListener('change', () => { checks.forEach((c) => { c.checked = todasChk.checked; }); actualizar(); });
  checks.forEach((c) => c.addEventListener('change', actualizar));
  actualizar();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const lista = pool();
    if (!lista.length) { $('#disponibles', form).textContent = 'Elegí al menos una unidad con preguntas.'; return; }
    const fd = new FormData(form);
    if (esSimulacro) {
      const n = Math.max(1, Math.min(lista.length, Number(fd.get('n')) || 40));
      const minutos = Math.max(1, Number(fd.get('m')) || 60);
      iniciar(raiz, { modo: 'simulacro', preguntas: mezclar(lista).slice(0, n), segundos: minutos * 60 });
    } else {
      const c = fd.get('cantidad');
      const n = c === 'todas' ? lista.length : Math.min(lista.length, Number(c));
      iniciar(raiz, { modo: esErrores ? 'errores' : 'practica', preguntas: mezclar(lista).slice(0, n) });
    }
  });
}

/* ---------------- Sesión ---------------- */

function prepararPregunta(p) {
  // Mezcla las opciones guardando el índice original (V/F queda en orden).
  const idx = p.opciones.map((_, i) => i);
  const orden = p.tipo === 'vf' ? idx : mezclar(idx);
  const correctas = new Set(Array.isArray(p.correcta) ? p.correcta : [p.correcta]);
  return { ...p, orden, correctas };
}

function iniciar(raiz, cfg) {
  estado = {
    ...cfg,
    preguntas: cfg.preguntas.map(prepararPregunta),
    actual: 0,
    respuestas: [], // índices originales elegidos
    respondida: false,
    terminado: false,
    inicio: Date.now(),
  };
  if (cfg.modo === 'simulacro') {
    estado.restante = cfg.segundos;
    temporizador = setInterval(() => {
      estado.restante--;
      const reloj = document.getElementById('reloj');
      if (reloj) {
        reloj.textContent = formatoTiempo(Math.max(0, estado.restante));
        reloj.classList.toggle('urgente', estado.restante <= 60);
      }
      if (estado.restante <= 0) terminarSimulacro(raiz, true);
    }, 1000);
  }
  dibujar(raiz);
}

function dibujar(raiz) {
  if (estado.terminado) return;
  if (estado.modo === 'simulacro') dibujarSimulacro(raiz);
  else dibujarPractica(raiz);
}

function badges(p) {
  return `
    <span class="badge">U${p.unidad.slice(1)} · ${escapar(p.tema || '')}</span>
    <span class="badge ${p.origen === 'original' ? 'original' : 'generada'}" title="${p.origen === 'original' ? 'Pregunta tomada del material' : 'Pregunta generada a partir de la teoría del material'}">${p.origen === 'original' ? 'Original' : 'Generada'}</span>
    ${p.estado === 'sin verificar' ? '<span class="badge alerta" title="La respuesta no figura explícitamente en el material">Sin verificar</span>' : ''}`;
}

function opcionesHTML(p, elegidas, mostrarCorreccion) {
  const tipoInput = p.tipo === 'multiple' ? 'checkbox' : 'radio';
  return p.orden.map((i, k) => {
    let clase = '';
    if (mostrarCorreccion) {
      if (p.correctas.has(i)) clase = 'correcta';
      else if (elegidas.includes(i)) clase = 'incorrecta';
    } else if (elegidas.includes(i)) clase = 'elegida';
    return `
      <label class="opcion ${clase}">
        <input type="${tipoInput}" name="op" value="${i}" ${elegidas.includes(i) ? 'checked' : ''} ${mostrarCorreccion ? 'disabled' : ''}>
        <span class="letra">${String.fromCharCode(65 + k)}</span>
        <span class="texto">${escapar(p.opciones[i])}</span>
      </label>`;
  }).join('');
}

function esCorrecta(p, elegidas) {
  return elegidas.length === p.correctas.size && elegidas.every((i) => p.correctas.has(i));
}

/* ----- Práctica / errores ----- */

function dibujarPractica(raiz) {
  const p = estado.preguntas[estado.actual];
  const elegidas = estado.respuestas[estado.actual] || [];
  const total = estado.preguntas.length;
  const aciertos = estado.respuestas.filter((r, i) => r && esCorrecta(estado.preguntas[i], r)).length;
  const correcta = estado.respondida && esCorrecta(p, elegidas);
  raiz.innerHTML = `
    <section class="pagina quiz">
      <div class="quiz-cabecera">
        <a href="#/${estado.modo === 'errores' ? 'errores' : 'quiz'}" class="volver">← Salir</a>
        <span>Pregunta ${estado.actual + 1} de ${total}</span>
        <span class="puntaje">✔ ${aciertos}</span>
      </div>
      <div class="barra"><div style="width:${(estado.actual / total) * 100}%"></div></div>
      <article class="tarjeta pregunta">
        <div class="badges">${badges(p)}</div>
        <h2 class="enunciado">${escapar(p.enunciado)}</h2>
        ${p.tipo === 'multiple' ? '<p class="ayuda">Puede haber más de una respuesta correcta.</p>' : ''}
        <form id="form-opciones" class="opciones">${opcionesHTML(p, elegidas, estado.respondida)}</form>
        ${estado.respondida ? `
          <div class="feedback ${correcta ? 'ok' : 'mal'}">
            <strong>${correcta ? '¡Correcto!' : 'Incorrecto.'}</strong>
            ${correcta ? '' : `La respuesta correcta es: <em>${[...p.correctas].map((i) => escapar(p.opciones[i])).join(' · ')}</em>`}
            <p>${escapar(p.explicacion)}</p>
            <p class="fuente">Fuente: ${escapar(citar(p.fuente))}</p>
          </div>` : ''}
        <div class="acciones">
          ${!estado.respondida && p.tipo === 'multiple' ? '<button class="boton primario" id="responder">Responder</button>' : ''}
          ${estado.respondida ? `<button class="boton primario" id="siguiente">${estado.actual + 1 < total ? 'Siguiente →' : 'Ver resultado'}</button>` : ''}
        </div>
      </article>
    </section>`;

  const form = $('#form-opciones', raiz);
  const responder = (lista) => {
    if (estado.respondida) return;
    estado.respuestas[estado.actual] = lista;
    estado.respondida = true;
    progreso.registrarRespuesta(p.id, esCorrecta(p, lista));
    dibujarPractica(raiz);
    $('#siguiente', raiz)?.focus();
  };
  if (!estado.respondida) {
    if (p.tipo === 'multiple') {
      form.addEventListener('change', () => {
        estado.respuestas[estado.actual] = $$('input:checked', form).map((x) => Number(x.value));
      });
      $('#responder', raiz).addEventListener('click', () => {
        const lista = $$('input:checked', form).map((x) => Number(x.value));
        if (lista.length) responder(lista);
      });
    } else {
      form.addEventListener('change', (ev) => responder([Number(ev.target.value)]));
    }
  }
  $('#siguiente', raiz)?.addEventListener('click', () => {
    estado.actual++;
    estado.respondida = false;
    if (estado.actual >= total) resultadoPractica(raiz);
    else { dibujarPractica(raiz); window.scrollTo({ top: 0 }); }
  });
}

function resultadoPractica(raiz) {
  estado.terminado = true;
  const total = estado.preguntas.length;
  const ok = estado.preguntas.filter((p, i) => esCorrecta(p, estado.respuestas[i] || [])).length;
  const falladas = estado.preguntas.filter((p, i) => !esCorrecta(p, estado.respuestas[i] || []));
  const pct = Math.round((ok / total) * 100);
  raiz.innerHTML = `
    <section class="pagina">
      <h1>Resultado</h1>
      <div class="tarjeta resultado">
        <div class="nota-grande ${pct >= 60 ? 'ok' : 'mal'}">${pct}%</div>
        <p>${ok} de ${total} correctas.</p>
        <div class="acciones">
          <a class="boton primario" href="#/${estado.modo === 'errores' ? 'errores' : 'quiz'}">Otra ronda</a>
          ${falladas.length ? '<a class="boton" href="#/errores">Repasar mis errores</a>' : ''}
          <a class="boton" href="#/progreso">Ver estadísticas</a>
        </div>
      </div>
      ${falladas.length ? `<h2>Para repasar</h2>${falladas.map((p) => revisionHTML(p, estado.respuestas[estado.preguntas.indexOf(p)] || [])).join('')}` : ''}
    </section>`;
}

/* ----- Simulacro ----- */

function dibujarSimulacro(raiz) {
  const p = estado.preguntas[estado.actual];
  const elegidas = estado.respuestas[estado.actual] || [];
  const total = estado.preguntas.length;
  const contestadas = estado.respuestas.filter((r) => r && r.length).length;
  raiz.innerHTML = `
    <section class="pagina quiz">
      <div class="quiz-cabecera simulacro">
        <span>Pregunta ${estado.actual + 1} de ${total}</span>
        <span class="reloj" id="reloj" aria-live="off">${formatoTiempo(estado.restante)}</span>
        <button class="boton chico" id="terminar">Terminar</button>
      </div>
      <nav class="grilla-preguntas" aria-label="Ir a pregunta">
        ${estado.preguntas.map((_, i) => `<button class="${i === estado.actual ? 'actual' : ''} ${estado.respuestas[i] && estado.respuestas[i].length ? 'hecha' : ''}" data-ir="${i}">${i + 1}</button>`).join('')}
      </nav>
      <article class="tarjeta pregunta">
        <div class="badges"><span class="badge">U${p.unidad.slice(1)}</span></div>
        <h2 class="enunciado">${escapar(p.enunciado)}</h2>
        ${p.tipo === 'multiple' ? '<p class="ayuda">Puede haber más de una respuesta correcta.</p>' : ''}
        <form id="form-opciones" class="opciones">${opcionesHTML(p, elegidas, false)}</form>
        <div class="acciones entre">
          <button class="boton" id="anterior" ${estado.actual === 0 ? 'disabled' : ''}>← Anterior</button>
          <span class="ayuda">${contestadas}/${total} respondidas</span>
          <button class="boton primario" id="proxima" ${estado.actual === total - 1 ? 'disabled' : ''}>Siguiente →</button>
        </div>
      </article>
    </section>`;
  const form = $('#form-opciones', raiz);
  form.addEventListener('change', () => {
    estado.respuestas[estado.actual] = $$('input:checked', form).map((x) => Number(x.value));
    $$('.opcion', form).forEach((o) => o.classList.toggle('elegida', o.querySelector('input').checked));
    const btn = $(`[data-ir="${estado.actual}"]`, raiz);
    btn.classList.toggle('hecha', estado.respuestas[estado.actual].length > 0);
  });
  const ir = (i) => { estado.actual = i; dibujarSimulacro(raiz); window.scrollTo({ top: 0 }); };
  $('#anterior', raiz).addEventListener('click', () => ir(estado.actual - 1));
  $('#proxima', raiz).addEventListener('click', () => ir(estado.actual + 1));
  $$('[data-ir]', raiz).forEach((b) => b.addEventListener('click', () => ir(Number(b.dataset.ir))));
  $('#terminar', raiz).addEventListener('click', () => {
    const faltan = total - estado.respuestas.filter((r) => r && r.length).length;
    if (confirm(faltan ? `Te quedan ${faltan} preguntas sin responder. ¿Terminar igual?` : '¿Terminar el simulacro?')) terminarSimulacro(raiz, false);
  });
}

function terminarSimulacro(raiz, porTiempo) {
  if (estado.terminado) return;
  limpiarTemporizador();
  estado.terminado = true;
  const total = estado.preguntas.length;
  const resultados = estado.preguntas.map((p, i) => ({ p, elegidas: estado.respuestas[i] || [], ok: esCorrecta(p, estado.respuestas[i] || []) }));
  resultados.forEach((r) => { if (r.elegidas.length) progreso.registrarRespuesta(r.p.id, r.ok); });
  const ok = resultados.filter((r) => r.ok).length;
  const pct = Math.round((ok / total) * 100);
  const nota = Math.round((ok / total) * 100) / 10;
  const usados = estado.segundos - Math.max(0, estado.restante);
  progreso.registrarSimulacro({ nota, porcentaje: pct, total, aciertos: ok });
  const porUnidad = {};
  resultados.forEach((r) => {
    const u = (porUnidad[r.p.unidad] ||= { ok: 0, total: 0 });
    u.total++;
    if (r.ok) u.ok++;
  });
  raiz.innerHTML = `
    <section class="pagina">
      <h1>Resultado del simulacro</h1>
      ${porTiempo ? '<div class="aviso">Se terminó el tiempo.</div>' : ''}
      <div class="tarjeta resultado">
        <div class="nota-grande ${pct >= 60 ? 'ok' : 'mal'}">${nota.toLocaleString('es-AR')}<small>/10</small></div>
        <p><strong>${pct}%</strong> · ${ok} de ${total} correctas · ${resultados.filter((r) => !r.elegidas.length).length} sin responder · tiempo usado ${formatoTiempo(usados)}</p>
        <table class="tabla-chica">
          <thead><tr><th>Unidad</th><th>Aciertos</th><th>%</th></tr></thead>
          <tbody>${Object.entries(porUnidad).sort().map(([u, v]) => `<tr><td>U${u.slice(1)}</td><td>${v.ok}/${v.total}</td><td>${Math.round((v.ok / v.total) * 100)}%</td></tr>`).join('')}</tbody>
        </table>
        <div class="acciones">
          <a class="boton primario" href="#/simulacro">Otro simulacro</a>
          <a class="boton" href="#/errores">Repasar mis errores</a>
        </div>
      </div>
      <h2>Revisión de cada pregunta</h2>
      <div class="filtro-revision chips">
        <label class="chip"><input type="radio" name="filtro" value="todas" checked> <span>Todas</span></label>
        <label class="chip"><input type="radio" name="filtro" value="mal"> <span>Solo incorrectas</span></label>
      </div>
      <div id="revision">${resultados.map((r, i) => revisionHTML(r.p, r.elegidas, i + 1)).join('')}</div>
    </section>`;
  $$('input[name="filtro"]', raiz).forEach((x) => x.addEventListener('change', () => {
    const solo = $('input[name="filtro"]:checked', raiz).value === 'mal';
    $$('#revision .revision', raiz).forEach((el) => { el.hidden = solo && el.classList.contains('ok'); });
  }));
  window.scrollTo({ top: 0 });
}

function revisionHTML(p, elegidas, numero) {
  const ok = esCorrecta(p, elegidas);
  return `
    <article class="tarjeta revision ${ok ? 'ok' : 'mal'}">
      <div class="badges">${numero ? `<span class="badge">#${numero}</span>` : ''}${badges(p)}<span class="badge ${ok ? 'exito' : 'error'}">${ok ? 'Correcta' : elegidas.length ? 'Incorrecta' : 'Sin responder'}</span></div>
      <h3>${escapar(p.enunciado)}</h3>
      <div class="opciones">${opcionesHTML(p, elegidas, true)}</div>
      <p class="explicacion">${escapar(p.explicacion)}</p>
      <p class="fuente">Fuente: ${escapar(citar(p.fuente))}</p>
    </article>`;
}
