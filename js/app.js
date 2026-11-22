// Punto de entrada: enrutador por hash, inicio, estadísticas y tema.

import * as datos from './datos.js';
import * as progreso from './progreso.js';
import * as quiz from './quiz.js';
import { vistaTeoria } from './teoria.js';
import { vistaLista, vistaTipo } from './ejercicios/vista.js';
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

async function vistaInicio() {
  const [us, ps] = await Promise.all([datos.unidades(), datos.preguntas()]);
  const prog = progreso.leer();
  const respondidas = Object.keys(prog.preguntas).length;
  const errores = progreso.idsConError().length;
  raiz.innerHTML = `
    <section class="pagina">
      <div class="hero">
        <h1>Práctica para el final de Sistemas Operativos</h1>
        <p class="bajada">Preguntas, ejercicios y resúmenes armados con el material de la cátedra (UTN San Nicolás). Tu progreso se guarda en este navegador.</p>
        ${respondidas ? `<p class="resumen-progreso">Respondiste <strong>${respondidas}</strong> de ${ps.length} preguntas distintas${errores ? ` · <a href="#/errores">${errores} para repasar</a>` : ''}.</p>` : ''}
      </div>
      <div class="grilla-tarjetas">
        <a class="tarjeta tarjeta-enlace destacada" href="#/quiz"><span class="icono">✅</span><h3>Multiple choice</h3><p>${ps.length} preguntas por unidad o mezcladas, con explicación y fuente.</p></a>
        <a class="tarjeta tarjeta-enlace" href="#/simulacro"><span class="icono">⏱️</span><h3>Simulacro de final</h3><p>Con tiempo y sin feedback hasta el final. Nota y revisión completa.</p></a>
        <a class="tarjeta tarjeta-enlace" href="#/ejercicios"><span class="icono">🧮</span><h3>Ejercicios</h3><p>Gantt, reemplazo de páginas, paginación, banquero, disco, semáforos y más.</p></a>
        <a class="tarjeta tarjeta-enlace" href="#/teoria"><span class="icono">📖</span><h3>Teoría</h3><p>Un resumen corto de cada unidad para leer antes de practicar.</p></a>
        <a class="tarjeta tarjeta-enlace" href="#/errores"><span class="icono">🔁</span><h3>Repasar mis errores</h3><p>${errores ? `${errores} preguntas falladas esperando revancha.` : 'Lo que falles va a aparecer acá.'}</p></a>
        <a class="tarjeta tarjeta-enlace" href="#/progreso"><span class="icono">📊</span><h3>Estadísticas</h3><p>Porcentaje de aciertos por unidad, para ver qué te falta.</p></a>
      </div>
      <h2>Unidades</h2>
      <ul class="lista-unidades">${us.map((u) => `<li><a href="#/teoria/${u.id}"><strong>U${u.numero}</strong> ${escapar(u.titulo)}</a></li>`).join('')}</ul>
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
      ${ejercicios.length ? `<h2>Ejercicios</h2><div class="tarjeta"><table class="tabla-chica"><thead><tr><th>Tipo</th><th>Correcciones</th><th>Perfectas</th></tr></thead><tbody>
        ${ejercicios.map(([t, e]) => `<tr><td><a href="#/ejercicios/${t}">${escapar(t)}</a></td><td>${e.intentos}</td><td>${e.perfectos}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      ${prog.simulacros.length ? `<h2>Simulacros</h2><div class="tarjeta"><table class="tabla-chica"><thead><tr><th>Fecha</th><th>Nota</th><th>%</th><th>Preguntas</th></tr></thead><tbody>
        ${[...prog.simulacros].reverse().map((s) => `<tr><td>${new Date(s.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${s.nota}</td><td>${s.porcentaje}%</td><td>${s.total}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
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
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('activa', a.getAttribute('href') === `#/${ruta}`));
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
