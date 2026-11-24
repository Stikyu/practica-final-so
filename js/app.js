// Punto de entrada: enrutador por hash, inicio, estadísticas y tema.

import * as datos from './datos.js';
import * as progreso from './progreso.js';
import * as quiz from './quiz.js';
import { vistaTeoria } from './teoria.js';
import { vistaLista, vistaTipo } from './ejercicios/vista.js';
import { TIPOS } from './ejercicios/tipos.js';
import { escapar, $ } from './util.js';

const raiz = document.getElementById('app');

/* ---------------- Tema claro / oscuro ---------------- */

function aplicarTema(tema) {
  if (tema) document.documentElement.dataset.theme = tema;
  else delete document.documentElement.dataset.theme;
}
try { aplicarTema(localStorage.getItem('so-tema')); } catch { /* sin storage */ }
document.getElementById('tema').addEventListener('click', () => {
  const oscuroAhora = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const nuevo = oscuroAhora ? 'light' : 'dark';
  aplicarTema(nuevo);
  try { localStorage.setItem('so-tema', nuevo); } catch { /* sin storage */ }
});

/* ---------------- Inicio ---------------- */

// La entrada animada de la portada se ve una sola vez por visita.
let primeraVisita = true;

async function vistaInicio() {
  const [us, ps] = await Promise.all([datos.unidades(), datos.preguntas()]);
  const prog = progreso.leer();
  const respondidas = Object.keys(prog.preguntas).length;
  const errores = progreso.idsConError().length;
  const flecha = '<svg class="flecha" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tarjeta = (n, href, titulo, texto, extra = '') => `
    <a class="tarjeta tarjeta-enlace ${extra}" href="${href}">
      <span class="tarjeta-num">${n}</span>
      <h3>${titulo}</h3>
      <p>${texto}</p>
      <span class="tarjeta-ir">Abrir ${flecha}</span>
    </a>`;
  // Round Robin q = 2 · P1(0,5) P2(1,3) P3(2,1) P4(3,2): el ejemplo del panel está resuelto de verdad.
  const tramos = [['P1', 0, 2], ['P2', 2, 4], ['P3', 4, 5], ['P1', 5, 7], ['P4', 7, 9], ['P2', 9, 10], ['P1', 10, 11]];
  const entra = primeraVisita ? ' entra' : '';
  primeraVisita = false;
  raiz.innerHTML = `
    <section class="hero${entra}">
      <div class="hero-interior">
        <div class="hero-texto">
          <p class="antetitulo">Sistemas Operativos · UTN San Nicolás</p>
          <h1>Práctica para el final de Sistemas Operativos</h1>
          <p class="bajada">Preguntas, ejercicios y resúmenes armados con el material de la cátedra. Tu progreso se guarda en este navegador.</p>
          <div class="acciones">
            <a class="boton primario" href="#/quiz">Empezar a practicar</a>
            <a class="boton" href="#/simulacro">Hacer un simulacro</a>
          </div>
          <dl class="datos-hero">
            <div><dt>Preguntas</dt><dd>${ps.length}</dd></div>
            <div><dt>Unidades</dt><dd>${us.length}</dd></div>
            <div><dt>Tipos de ejercicio</dt><dd>${TIPOS.length}</dd></div>
          </dl>
          ${respondidas ? `<p class="resumen-progreso">Respondiste <strong>${respondidas}</strong> de ${ps.length} preguntas distintas${errores ? ` · <a href="#/errores">${errores} para repasar</a>` : ''}.</p>` : ''}
        </div>
        <a class="panel-muestra" href="#/ejercicios/planificacion" aria-label="Abrir los ejercicios de planificación">
          <div class="panel-barra"><span class="panel-puntos" aria-hidden="true"><i></i><i></i><i></i></span><span>planificación · round robin · q = 2</span></div>
          <div class="panel-cuerpo">
            <table class="panel-tabla">
              <thead><tr><th>Proceso</th><th>Llegada</th><th>Ráfaga</th><th>Espera</th></tr></thead>
              <tbody>
                <tr><td><i class="pp p1"></i>P1</td><td>0</td><td>5</td><td>6</td></tr>
                <tr><td><i class="pp p2"></i>P2</td><td>1</td><td>3</td><td>6</td></tr>
                <tr><td><i class="pp p3"></i>P3</td><td>2</td><td>1</td><td>2</td></tr>
                <tr><td><i class="pp p4"></i>P4</td><td>3</td><td>2</td><td>4</td></tr>
              </tbody>
            </table>
            <div class="panel-gantt" aria-hidden="true">
              ${tramos.map(([p, d, h], i) => `<span class="${p.toLowerCase()}" style="flex:${h - d};--i:${i}">${p}</span>`).join('')}
            </div>
            <div class="panel-eje" aria-hidden="true">${[0, 2, 4, 5, 7, 9, 10, 11].map((t) => `<span style="left:${(t / 11) * 100}%">${t}</span>`).join('')}</div>
            <p class="panel-resultado"><span>Espera media</span><strong>4,5</strong></p>
          </div>
        </a>
      </div>
    </section>
    <section class="pagina inicio">
      <div class="encabezado-seccion">
        <h2>Modos de práctica</h2>
        <p class="bajada">Elegí cómo estudiar hoy.</p>
      </div>
      <div class="grilla-tarjetas inicio-tarjetas">
        ${tarjeta('01', '#/quiz', 'Multiple choice', `${ps.length} preguntas por unidad o mezcladas, con explicación y fuente.`, 'destacada')}
        ${tarjeta('02', '#/simulacro', 'Simulacro de final', 'Con tiempo y sin feedback hasta el final. Nota y revisión completa.')}
        ${tarjeta('03', '#/ejercicios', 'Ejercicios', 'Gantt, reemplazo de páginas, paginación, banquero, disco, semáforos y más.')}
        ${tarjeta('04', '#/teoria', 'Teoría', 'Un resumen corto de cada unidad para leer antes de practicar.')}
        ${tarjeta('05', '#/errores', 'Repasar mis errores', errores ? `${errores} preguntas falladas esperando revancha.` : 'Lo que falles va a aparecer acá.')}
        ${tarjeta('06', '#/progreso', 'Estadísticas', 'Porcentaje de aciertos por unidad, para ver qué te falta.')}
      </div>
      <div class="encabezado-seccion">
        <h2>Unidades</h2>
        <p class="bajada">El resumen de teoría de cada una.</p>
      </div>
      <ul class="lista-unidades">${us.map((u) => `<li><a href="#/teoria/${u.id}"><span class="u-num">U${u.numero}</span><span class="u-titulo">${escapar(u.titulo)}</span>${flecha}</a></li>`).join('')}</ul>
    </section>`;
}

/* ---------------- Estadísticas ---------------- */

async function vistaProgreso() {
  const [us, ps] = await Promise.all([datos.unidades(), datos.preguntas()]);
  const prog = progreso.leer();
  const filas = us.map((u) => {
    const deU = ps.filter((p) => p.unidad === u.id);
    let resp = 0; let ac = 0; let vistas = 0; let errores = 0;
    for (const p of deU) {
      const r = prog.preguntas[p.id];
      if (!r) continue;
      vistas++;
      resp += r.respondidas;
      ac += r.aciertos;
      if (r.ultimaCorrecta === false) errores++;
    }
    return { u, total: deU.length, vistas, resp, ac, errores, pct: resp ? Math.round((ac / resp) * 100) : null };
  });
  const totResp = filas.reduce((s, f) => s + f.resp, 0);
  const totAc = filas.reduce((s, f) => s + f.ac, 0);
  const conDatos = filas.filter((f) => f.pct !== null).sort((a, b) => a.pct - b.pct);
  const ejercicios = Object.entries(prog.ejercicios);
  raiz.innerHTML = `
    <section class="pagina">
      <h1>Estadísticas</h1>
      <p class="bajada">Se guardan solo en este navegador. ${totResp ? `En total: <strong>${Math.round((totAc / totResp) * 100)}%</strong> de aciertos en ${totResp} respuestas.` : 'Todavía no respondiste preguntas.'}</p>
      ${conDatos.length ? `<div class="aviso">Lo que más te falta: <strong>U${conDatos[0].u.numero} · ${escapar(conDatos[0].u.titulo)}</strong> (${conDatos[0].pct}% de aciertos).</div>` : ''}
      <div class="tarjeta">
        <div class="barras">
          ${filas.map((f) => `
            <div class="fila-barra">
              <a href="#/teoria/${f.u.id}" class="nombre">U${f.u.numero} · ${escapar(f.u.corto)}</a>
              <div class="barra-pct" role="progressbar" aria-valuenow="${f.pct ?? 0}" aria-valuemin="0" aria-valuemax="100" aria-label="Aciertos en U${f.u.numero}">
                <div class="relleno ${f.pct === null ? '' : f.pct >= 70 ? 'alto' : f.pct >= 40 ? 'medio' : 'bajo'}" style="width:${f.pct ?? 0}%"></div>
              </div>
              <span class="pct">${f.pct === null ? '—' : `${f.pct}%`}</span>
              <span class="detalle">${f.vistas}/${f.total} vistas${f.errores ? ` · <a href="#/errores">${f.errores} errores</a>` : ''}</span>
            </div>`).join('')}
        </div>
      </div>
      ${ejercicios.length ? `<h2>Ejercicios</h2><div class="tarjeta"><div class="tabla-scroll"><table class="tabla-chica"><thead><tr><th>Tipo</th><th>Correcciones</th><th>Perfectas</th></tr></thead><tbody>
        ${ejercicios.map(([t, e]) => `<tr><td><a href="#/ejercicios/${t}">${escapar(t)}</a></td><td>${e.intentos}</td><td>${e.perfectos}</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}
      ${prog.simulacros.length ? `<h2>Simulacros</h2><div class="tarjeta"><div class="tabla-scroll"><table class="tabla-chica"><thead><tr><th>Fecha</th><th>Nota</th><th>%</th><th>Preguntas</th></tr></thead><tbody>
        ${[...prog.simulacros].reverse().map((s) => `<tr><td>${new Date(s.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${s.nota}</td><td>${s.porcentaje}%</td><td>${s.total}</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}
      <h2>Tus datos</h2>
      <div class="acciones">
        <button class="boton" id="exportar">Exportar progreso</button>
        <label class="boton">Importar progreso <input type="file" id="importar" accept="application/json" hidden></label>
        <button class="boton peligro" id="borrar">Borrar todo el progreso</button>
      </div>
    </section>`;
  $('#borrar').addEventListener('click', () => {
    if (confirm('¿Borrar todas tus respuestas, errores y estadísticas?')) { progreso.borrarTodo(); vistaProgreso(); }
  });
  $('#exportar').addEventListener('click', () => {
    const blob = new Blob([progreso.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'progreso-so.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importar').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try { progreso.importar(await f.text()); vistaProgreso(); } catch { alert('El archivo no tiene el formato esperado.'); }
  });
}

/* ---------------- Enrutador ---------------- */

let rutaAnterior = location.hash;

async function enrutar() {
  if (quiz.simulacroEnCurso() && !location.hash.startsWith('#/simulacro')) {
    if (!confirm('Tenés un simulacro en curso. Si salís, se pierde. ¿Salir igual?')) {
      history.replaceState(null, '', rutaAnterior);
      return;
    }
  }
  rutaAnterior = location.hash;
  const [ruta, param] = location.hash.replace(/^#\/?/, '').split('/');
  document.querySelectorAll('.nav a').forEach((a) => {
    const activa = a.getAttribute('href') === `#/${ruta}`;
    a.classList.toggle('activa', activa);
    if (activa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    switch (ruta) {
      case '': await vistaInicio(); break;
      case 'quiz': await quiz.vistaConfig(raiz, 'practica'); break;
      case 'simulacro': await quiz.vistaConfig(raiz, 'simulacro'); break;
      case 'errores': await quiz.vistaConfig(raiz, 'errores'); break;
      case 'teoria': await vistaTeoria(raiz, param); break;
      case 'ejercicios': if (param) await vistaTipo(raiz, param); else await vistaLista(raiz); break;
      case 'progreso': await vistaProgreso(); break;
      default: raiz.innerHTML = '<section class="pagina"><h1>No encontrado</h1><p><a href="#/">Volver al inicio</a></p></section>';
    }
  } catch (err) {
    console.error(err);
    raiz.innerHTML = `<section class="pagina"><div class="aviso mal"><strong>No se pudieron cargar los datos.</strong><br>${escapar(err.message)}<br><br>Si abriste el archivo con doble clic, levantá un servidor local (ver README): los navegadores no dejan leer los JSON desde <code>file://</code>.</div></section>`;
  }
  window.scrollTo({ top: 0 });
  raiz.focus({ preventScroll: true });
}

window.addEventListener('hashchange', enrutar);
window.addEventListener('beforeunload', (ev) => { if (quiz.simulacroEnCurso()) { ev.preventDefault(); ev.returnValue = ''; } });
enrutar();
