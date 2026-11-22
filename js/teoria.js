// Resúmenes de teoría por unidad.

import * as datos from './datos.js';
import { escapar, markdown, citar } from './util.js';

export async function vistaTeoria(raiz, unidadId) {
  const [us, teoria] = await Promise.all([datos.unidades(), datos.teoria()]);
  const actual = us.find((u) => u.id === unidadId) || us[0];
  const t = teoria.find((x) => x.id === actual.id);
  const idx = us.indexOf(actual);
  raiz.innerHTML = `
    <section class="pagina teoria">
      <h1>Teoría</h1>
      <p class="bajada">Resumen corto de cada unidad, armado con los apuntes de la cátedra. Cada sección indica de qué archivo sale.</p>
      <nav class="tabs" aria-label="Unidades">
        ${us.map((u) => `<a href="#/teoria/${u.id}" class="${u.id === actual.id ? 'activa' : ''}">U${u.numero}</a>`).join('')}
      </nav>
      <h2>Unidad ${actual.numero} · ${escapar(actual.titulo)}</h2>
      <div class="indice tarjeta">
        <strong>En esta unidad</strong>
        <ol>${t.secciones.map((s, i) => `<li><a href="#/teoria/${actual.id}" data-ancla="sec-${i}">${escapar(s.titulo)}</a></li>`).join('')}</ol>
      </div>
      ${t.secciones.map((s, i) => `
        <article class="tarjeta seccion-teoria" id="sec-${i}">
          <h3>${escapar(s.titulo)}</h3>
          ${markdown(s.contenido)}
          <p class="fuente">Fuente: ${s.fuentes.map((f) => escapar(citar(f))).join(' · ')}</p>
        </article>`).join('')}
      <div class="acciones entre">
        ${idx > 0 ? `<a class="boton" href="#/teoria/${us[idx - 1].id}">← U${us[idx - 1].numero}</a>` : '<span></span>'}
        <a class="boton primario" href="#/quiz">Practicar preguntas</a>
        ${idx < us.length - 1 ? `<a class="boton" href="#/teoria/${us[idx + 1].id}">U${us[idx + 1].numero} →</a>` : '<span></span>'}
      </div>
    </section>`;
  raiz.querySelectorAll('[data-ancla]').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    document.getElementById(a.dataset.ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}
