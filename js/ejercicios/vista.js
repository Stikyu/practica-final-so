// Vistas de la sección de ejercicios: listado por unidad y pantalla de cada tipo.

import * as datos from '../datos.js';
import * as progreso from '../progreso.js';
import { escapar, citar, $, $$ } from '../util.js';
import { TIPOS, tipoPorId } from './tipos.js';
import { montar } from './motor.js';
import { parsearProceso, parsearIniciales, verificarSemaforos } from '../solvers/sincronizacion.js';

const ORIGEN = {
  material: ['Del material', 'original'],
  adaptado: ['Adaptado del material', 'adaptado'],
  generada: ['Generado al azar', 'generada'],
};

export async function vistaLista(raiz) {
  const [us, ejs] = await Promise.all([datos.unidades(), datos.ejercicios()]);
  const prog = progreso.leer().ejercicios;
  raiz.innerHTML = `
    <section class="pagina">
      <h1>Ejercicios</h1>
      <p class="bajada">Ejercicios interactivos armados con el material. En cada uno completás los casilleros, apretás <strong>Corregir</strong> y, si te trabás, mirás la <strong>resolución paso a paso</strong>. En los temas algorítmicos podés <strong>generar ejercicios nuevos</strong> con datos aleatorios.</p>
      ${us.map((u) => {
        const tipos = TIPOS.filter((t) => t.unidad === u.id);
        if (!tipos.length) return '';
        return `<h2>U${u.numero} · ${escapar(u.titulo)}</h2>
          <div class="grilla-tarjetas">
            ${tipos.map((t) => {
              const n = ejs.filter((e) => e.tipo === t.id).length;
              const p = prog[t.id];
              return `<a class="tarjeta tarjeta-enlace" href="#/ejercicios/${t.id}">
                <h3>${escapar(t.nombre)}</h3>
                <p>${escapar(t.descripcion)}</p>
                <div class="badges">${n ? `<span class="badge original">${n} del material</span>` : ''}<span class="badge generada">Generador aleatorio</span>${p ? `<span class="badge">${p.perfectos}/${p.intentos} perfectos</span>` : ''}</div>
              </a>`;
            }).join('')}
          </div>`;
      }).join('')}
    </section>`;
}

export async function vistaTipo(raiz, tipoId) {
  const tipo = tipoPorId[tipoId];
  if (!tipo) { raiz.innerHTML = '<section class="pagina"><p>Ese tipo de ejercicio no existe.</p><a href="#/ejercicios">Volver</a></section>'; return; }
  const [us, todos] = await Promise.all([datos.unidades(), datos.ejercicios()]);
  const u = us.find((x) => x.id === tipo.unidad);
  const delMaterial = todos.filter((e) => e.tipo === tipo.id);
  const ops = tipo.opcionesGenerador || [];

  raiz.innerHTML = `
    <section class="pagina">
      <a href="#/ejercicios" class="volver">← Ejercicios</a>
      <h1>${escapar(tipo.nombre)}</h1>
      <p class="bajada">U${u.numero} · ${escapar(u.titulo)} — ${escapar(tipo.descripcion)}</p>
      <div class="tarjeta selector-ejercicio">
        ${delMaterial.length ? `<div><strong>Del material:</strong><div class="chips" id="lista-material">
          ${delMaterial.map((e) => `<button type="button" class="chip-boton" data-ej="${e.id}">${escapar(e.titulo)}</button>`).join('')}
        </div></div>` : ''}
        <div class="generador">
          <strong>Ejercicio nuevo:</strong>
          ${ops.map((o) => `<label>${escapar(o.label)} <select data-op="${o.id}">${o.valores.map(([v, t]) => `<option value="${escapar(v)}">${escapar(t)}</option>`).join('')}</select></label>`).join('')}
          <button type="button" class="boton primario" id="generar">Generar ejercicio nuevo</button>
        </div>
      </div>
      <div id="ejercicio"></div>
    </section>`;

  const area = $('#ejercicio', raiz);
  const mostrar = (ej) => {
    $$('[data-ej]', raiz).forEach((b) => b.classList.toggle('activo', b.dataset.ej === ej.id));
    const [txtOrigen, claseOrigen] = ORIGEN[ej.origen] || ORIGEN.generada;
    area.innerHTML = `
      <article class="tarjeta ejercicio">
        <div class="badges">
          <span class="badge ${claseOrigen}">${txtOrigen}</span>
          ${ej.fuente ? `<span class="badge">Fuente: ${escapar(citar(ej.fuente))}</span>` : ''}
          ${ej.origen !== 'generada' && !ej.esperado ? '<span class="badge alerta" title="El material no trae la resolución: la calcula la página">Resolución calculada por la página</span>' : ''}
        </div>
        <h2>${escapar(ej.titulo)}</h2>
        ${ej.nota ? `<div class="aviso">${escapar(ej.nota)}</div>` : ''}
        <div class="enunciado-ej">${tipo.personalizado ? '' : tipo.enunciado(ej.datos)}</div>
        <div id="cuerpo"></div>
      </article>`;
    const cuerpo = $('#cuerpo', area);
    if (tipo.id === 'semaforos') montarSemaforos(cuerpo, ej.datos);
    else montar(cuerpo, tipo.construir(ej.datos), (perfecto) => progreso.registrarEjercicio(tipo.id, perfecto));
  };

  delMaterial.forEach((e) => $(`[data-ej="${e.id}"]`, raiz).addEventListener('click', () => mostrar(e)));
  $('#generar', raiz).addEventListener('click', () => {
    const opciones = Object.fromEntries($$('[data-op]', raiz).map((s) => [s.dataset.op, s.value]));
    const datosNuevos = tipo.generar(Math.random, opciones);
    mostrar({ id: `gen-${Date.now()}`, titulo: 'Ejercicio generado', origen: 'generada', datos: datosNuevos });
  });

  if (delMaterial.length) mostrar(delMaterial[0]);
  else $('#generar', raiz).click();
}

/* ---------------- Semáforos ---------------- */

function trazaEjemplo(procesos, iniciales, limite = 60) {
  const sems = { ...iniciales };
  const pcs = procesos.map(() => 0);
  const pasos = [];
  let salida = '';
  for (let k = 0; k < limite; k++) {
    let avanzo = false;
    for (let i = 0; i < procesos.length && !avanzo; i++) {
      const ins = procesos[i][pcs[i]];
      if (!ins) continue;
      if (ins.op === 'wait') {
        if ((sems[ins.s] ?? 0) > 0) { sems[ins.s]--; pasos.push(`P${i + 1}: wait(${ins.s}) pasa → ${ins.s} = ${sems[ins.s]}`); pcs[i]++; avanzo = true; }
        continue;
      }
      if (ins.op === 'signal') { sems[ins.s] = (sems[ins.s] ?? 0) + 1; pasos.push(`P${i + 1}: signal(${ins.s}) → ${ins.s} = ${sems[ins.s]}`); }
      else { salida += ins.v; pasos.push(`P${i + 1}: imprime ${ins.v} → salida "${salida}"`); }
      pcs[i]++;
      avanzo = true;
    }
    if (!avanzo) break;
  }
  return pasos;
}

function montarSemaforos(raiz, d) {
  raiz.innerHTML = `
    <div class="enunciado-ej">
      <p>${escapar(d.enunciado)}</p>
      <p>Salidas permitidas: ${d.permitidas.map((s) => `<code>${escapar(s)}</code>`).join(' o ')}</p>
      <p class="ayuda">Una instrucción por línea: <code>wait(S)</code>, <code>signal(S)</code> y <code>print(X)</code>. La página prueba <strong>todos</strong> los intercalados posibles de los procesos: tu solución es correcta si ninguno produce otra salida ni se queda trabado (deadlock).</p>
    </div>
    <div class="procesos">
      ${d.programas.map((p, i) => `<label class="proceso"><span>P${i + 1}</span><textarea rows="8" spellcheck="false" data-proc="${i}">${escapar(p)}</textarea></label>`).join('')}
    </div>
    <label class="campo-etiquetado ancho-completo"><span>Valores iniciales</span><input class="campo ancho-l" id="iniciales" placeholder="S1=1, S2=0" spellcheck="false"></label>
    <div class="resultado-correccion" aria-live="polite"></div>
    <div class="acciones">
      <button type="button" class="boton primario" id="verificar">Verificar todos los intercalados</button>
      <button type="button" class="boton" id="ver-sol">Ver resolución paso a paso</button>
      <button type="button" class="boton fantasma" id="restaurar">Volver al enunciado</button>
    </div>
    <section class="resolucion" hidden></section>`;
  const salida = $('.resultado-correccion', raiz);
  const resol = $('.resolucion', raiz);

  $('#verificar', raiz).addEventListener('click', () => {
    const parseos = $$('[data-proc]', raiz).map((t) => parsearProceso(t.value));
    const ini = parsearIniciales($('#iniciales', raiz).value);
    const errores = [...parseos.flatMap((p, i) => p.errores.map((e) => `P${i + 1}: ${e}`)), ...ini.errores];
    if (errores.length) { salida.innerHTML = `<div class="aviso mal">${errores.map(escapar).join('<br>')}</div>`; return; }
    const r = verificarSemaforos(parseos.map((p) => p.ops), ini.valores, d.permitidas);
    const lista = r.salidas.map((s) => `<li class="${d.permitidas.includes(s) ? 'ok' : 'mal'}"><code>${escapar(s)}</code> ${d.permitidas.includes(s) ? '✔ permitida' : '✘ no permitida'}</li>`).join('');
    salida.innerHTML = `
      <div class="aviso ${r.correcta ? 'ok' : 'mal'}">
        ${r.correcta ? '¡Correcto! Todos los intercalados posibles dan una salida permitida y ninguno se traba.' : 'Todavía no: revisá las salidas posibles.'}
        ${r.sinInicializar.length ? `<br>Semáforos sin valor inicial (se toman como 0): ${r.sinInicializar.map(escapar).join(', ')}.` : ''}
        ${r.incompleto ? '<br>Hay demasiados intercalados para revisarlos todos.' : ''}
      </div>
      <p><strong>Salidas posibles (${r.salidas.length}):</strong></p><ul class="salidas">${lista || '<li>Ninguna ejecución termina.</li>'}</ul>
      ${r.deadlocks.length ? `<p><strong>Deadlock:</strong> hay intercalados que se traban después de imprimir ${r.deadlocks.map((s) => `<code>${escapar(s)}</code>`).join(', ')}.</p>` : ''}`;
    progreso.registrarEjercicio('semaforos', r.correcta);
  });

  $('#restaurar', raiz).addEventListener('click', () => {
    $$('[data-proc]', raiz).forEach((t, i) => { t.value = d.programas[i]; });
    $('#iniciales', raiz).value = '';
    salida.innerHTML = '';
  });

  $('#ver-sol', raiz).addEventListener('click', () => {
    if (!resol.hidden) { resol.hidden = true; return; }
    const progs = d.solucion.programas.map((t) => parsearProceso(t).ops);
    const ini = parsearIniciales(d.solucion.iniciales).valores;
    const r = verificarSemaforos(progs, ini, d.permitidas);
    const traza = trazaEjemplo(progs, ini);
    resol.hidden = false;
    resol.innerHTML = `
      <h3>Resolución</h3>
      ${d.explicacion ? `<p>${escapar(d.explicacion)}</p>` : ''}
      <p>Valores iniciales: <code>${escapar(d.solucion.iniciales)}</code></p>
      <div class="procesos">${d.solucion.programas.map((p, i) => `<div class="proceso"><span>P${i + 1}</span><pre>${escapar(p)}</pre></div>`).join('')}</div>
      <p><strong>Una ejecución posible, paso a paso:</strong></p>
      <ol class="pasos">${traza.map((t) => `<li>${escapar(t)}</li>`).join('')}</ol>
      <p>Probando todos los intercalados, las únicas salidas posibles son ${r.salidas.map((s) => `<code>${escapar(s)}</code>`).join(' y ')}${r.deadlocks.length ? ' (¡hay deadlock!)' : ', sin deadlock'}.</p>
      <button type="button" class="boton fantasma" id="copiar-sol">Copiar la solución en el editor</button>`;
    $('#copiar-sol', resol).addEventListener('click', () => {
      $$('[data-proc]', raiz).forEach((t, i) => { t.value = d.solucion.programas[i]; });
      $('#iniciales', raiz).value = d.solucion.iniciales;
    });
    resol.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
