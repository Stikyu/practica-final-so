// Verificación del contenido y de los correctores.
//   node tests/verificar.mjs
// 1) Cada pregunta tiene enunciado, opciones, respuesta válida, explicación y fuente.
// 2) Cada ejercicio del material con resultados conocidos ('esperado') da lo
//    mismo con los correctores de la página.
// 3) Los generadores aleatorios producen ejercicios que los correctores resuelven.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolverPlanificacion, generarPlanificacion } from '../js/solvers/planificacion.js';
import { resolverReemplazo, generarReemplazo } from '../js/solvers/reemplazo.js';
import * as mem from '../js/solvers/memoria.js';
import { algoritmoSeguridad, evaluarSolicitud, validarSecuencia, generarBanquero } from '../js/solvers/banquero.js';
import { resolverDisco, generarDisco } from '../js/solvers/disco.js';
import * as sinc from '../js/solvers/sincronizacion.js';
import * as calc from '../js/solvers/calculos.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => JSON.parse(readFileSync(join(raiz, p), 'utf8'));
let errores = 0;
let ok = 0;
const fallo = (msg) => { errores++; console.error(`  ✗ ${msg}`); };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cerca = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const check = (cond, msg) => { if (cond) ok++; else fallo(msg); };

/* ---------- 1. Preguntas ---------- */
console.log('Preguntas');
const unidades = leer('data/unidades.json').unidades;
const archivosValidos = new Set(leer('data/unidades.json').archivos);
const ids = new Set();
let totalPreguntas = 0;
for (const u of unidades) {
  const ruta = `data/preguntas/${u.id}.json`;
  if (!existsSync(join(raiz, ruta))) { fallo(`Falta ${ruta}`); continue; }
  const { preguntas } = leer(ruta);
  for (const p of preguntas) {
    totalPreguntas++;
    const donde = `${u.id}/${p.id}`;
    if (ids.has(p.id)) fallo(`${donde}: id repetido`);
    ids.add(p.id);
    if (p.unidad !== u.id) fallo(`${donde}: unidad "${p.unidad}" no coincide con el archivo`);
    if (!p.enunciado || p.enunciado.length < 10) fallo(`${donde}: enunciado vacío o muy corto`);
    if (!['unica', 'multiple', 'vf'].includes(p.tipo)) fallo(`${donde}: tipo inválido`);
    if (!Array.isArray(p.opciones) || p.opciones.length < 2) fallo(`${donde}: faltan opciones`);
    if (new Set(p.opciones).size !== p.opciones.length) fallo(`${donde}: opciones repetidas`);
    const correctas = Array.isArray(p.correcta) ? p.correcta : [p.correcta];
    if (!correctas.length || correctas.some((c) => !Number.isInteger(c) || c < 0 || c >= p.opciones.length)) fallo(`${donde}: respuesta correcta fuera de rango`);
    if (p.tipo === 'unica' && Array.isArray(p.correcta)) fallo(`${donde}: tipo "unica" con varias correctas`);
    if (!p.explicacion || p.explicacion.length < 20) fallo(`${donde}: falta explicación`);
    if (!p.fuente || !archivosValidos.has(p.fuente.archivo)) fallo(`${donde}: fuente inválida (${p.fuente && p.fuente.archivo})`);
    if (!['original', 'generada'].includes(p.origen)) fallo(`${donde}: origen inválido`);
    if (!['verificada', 'sin verificar'].includes(p.estado)) fallo(`${donde}: estado inválido`);
    ok++;
  }
  console.log(`  ${u.id}: ${preguntas.length} preguntas`);
}
console.log(`  Total: ${totalPreguntas}`);

/* ---------- 2. Teoría ---------- */
console.log('Teoría');
const teoria = leer('data/teoria.json');
for (const u of unidades) {
  const t = teoria.unidades.find((x) => x.id === u.id);
  check(t && t.secciones.length > 0, `Falta la teoría de ${u.id}`);
  if (t) for (const s of t.secciones) check(s.fuentes && s.fuentes.every((f) => archivosValidos.has(f.archivo)), `Teoría ${u.id} "${s.titulo}": fuente inválida`);
}

/* ---------- 3. Ejercicios del material ---------- */
console.log('Ejercicios del material');
const { ejercicios } = leer('data/ejercicios.json');
for (const e of ejercicios) {
  const { datos, esperado } = e;
  const n = `${e.id}`;
  check(archivosValidos.has(e.fuente.archivo), `${n}: fuente inválida`);
  try {
    switch (e.tipo) {
      case 'planificacion': {
        const r = resolverPlanificacion(datos);
        if (esperado) {
          const g = Array.isArray(esperado.gantt) ? esperado.gantt : esperado.gantt.split('');
          check(igual(r.gantt, g), `${n}: Gantt ${r.gantt.join('')} ≠ ${g.join('')}`);
          if (esperado.fin) for (const [id, v] of Object.entries(esperado.fin)) check(r.resultados.find((x) => x.id === id).fin === v, `${n}: Tf de ${id}`);
          if (esperado.espera) for (const [id, v] of Object.entries(esperado.espera)) check(r.resultados.find((x) => x.id === id).espera === v, `${n}: E de ${id}`);
          if (esperado.promedios) for (const [k, v] of Object.entries(esperado.promedios)) check(cerca(r.promedios[k], v), `${n}: promedio ${k} = ${r.promedios[k]} ≠ ${v}`);
        }
        break;
      }
      case 'reemplazo': {
        const r = resolverReemplazo(datos);
        check(r.fallos === esperado.fallos, `${n}: fallos ${r.fallos} ≠ ${esperado.fallos}`);
        if (esperado.marcosEnFallos) check(igual(r.pasos.filter((p) => p.fallo).map((p) => p.marcos), esperado.marcosEnFallos), `${n}: marcos en cada fallo no coinciden con la diapositiva`);
        break;
      }
      case 'paginacion': {
        const r = mem.resolverPaginacion(datos);
        if (esperado) {
          for (const k of ['tamPagina', 'cantPaginas', 'cantMarcos', 'bitsP', 'bitsD']) check(r[k] === esperado[k], `${n}: ${k}`);
          check(igual(r.traducciones.map((t) => t.fisica), esperado.fisicas), `${n}: direcciones físicas`);
        } else check(r.traducciones.length === datos.direcciones.length, `${n}: traducciones`);
        break;
      }
      case 'segmentacion': check(mem.resolverSegmentacion(datos).length === datos.referencias.length, `${n}`); break;
      case 'base-limite': {
        const r = mem.resolverBaseLimite(datos);
        check(r.ultima === esperado.ultima && igual(r.resultados.map((x) => x.legal), esperado.legales), `${n}`);
        break;
      }
      case 'buddy': {
        const r = mem.resolverBuddy(datos);
        check(r.bloque === esperado.bloque && r.cantDivisiones === esperado.cantDivisiones && r.fragInterna === esperado.fragInterna, `${n}`);
        break;
      }
      case 'asignacion-marcos': {
        const r = mem.resolverAsignacionMarcos(datos);
        check(r.equitativa === esperado.equitativa && igual(r.proporcional, esperado.proporcional), `${n}`);
        break;
      }
      case 'eat': check(cerca(mem.resolverEAT(datos).eat, esperado.eat, 0.5), `${n}`); break;
      case 'amdahl': {
        const r = calc.resolverAmdahl(datos);
        if (esperado.S !== undefined) check(cerca(r.S, esperado.S), `${n}: S`);
        if (esperado.limite !== undefined) check(cerca(r.limite, esperado.limite) && r.S < esperado.limite, `${n}: límite`);
        break;
      }
      case 'inodo': {
        const r = calc.resolverInodo(datos);
        for (const k of Object.keys(esperado)) check(r[k] === esperado[k], `${n}: ${k}`);
        break;
      }
      case 'bloques': {
        const r = calc.resolverBloques(datos);
        for (const k of Object.keys(esperado)) check(r[k] === esperado[k], `${n}: ${k}`);
        break;
      }
      case 'disco': {
        const r = resolverDisco(datos);
        if (esperado) {
          check(r.total === esperado.total, `${n}: total ${r.total} ≠ ${esperado.total}`);
          if (esperado.orden) check(igual(r.orden, esperado.orden), `${n}: orden`);
        } else check(r.orden.length === datos.cola.length, `${n}: orden incompleto`);
        break;
      }
      case 'banquero': {
        const r = algoritmoSeguridad(datos);
        check(r.seguro === esperado.seguro, `${n}: seguro`);
        if (esperado.secuencia) check(igual(r.secuencia, esperado.secuencia) && validarSecuencia(datos, esperado.secuencia), `${n}: secuencia ${r.secuencia}`);
        if (datos.solicitud) check(evaluarSolicitud(datos, datos.solicitud.proceso, datos.solicitud.vector).concede === esperado.concede, `${n}: solicitud`);
        break;
      }
      case 'rms': {
        const r = calc.resolverRMS(datos);
        check(cerca(r.U, esperado.U) && cerca(r.cota, esperado.cota, 0.001) && r.garantizado === esperado.garantizado, `${n}`);
        break;
      }
      case 'buffer': {
        const r = sinc.resolverBuffer(datos);
        check(igual(r.pasos.map((p) => p.in), esperado.in), `${n}: in`);
        check(igual(r.pasos.map((p) => p.out), esperado.out), `${n}: out`);
        check(igual(r.pasos.map((p) => p.bloqueado), esperado.bloqueado), `${n}: bloqueos`);
        break;
      }
      case 'peterson': {
        const r = sinc.resolverPeterson(datos);
        for (const k of ['flag0', 'flag1', 'turn', 'enSC']) check(igual(r.pasos.map((p) => p[k]), esperado[k]), `${n}: ${k}`);
        break;
      }
      case 'semaforos': {
        const progs = datos.solucion.programas.map((t) => sinc.parsearProceso(t).ops);
        const ini = sinc.parsearIniciales(datos.solucion.iniciales).valores;
        const r = sinc.verificarSemaforos(progs, ini, datos.permitidas);
        check(r.correcta && igual([...r.salidas].sort(), [...datos.permitidas].sort()), `${n}: la solución del material no da exactamente las salidas permitidas (${r.salidas})`);
        // Sin semáforos, el enunciado debe permitir salidas incorrectas.
        const sin = sinc.verificarSemaforos(datos.programas.map((t) => sinc.parsearProceso(t).ops), {}, datos.permitidas);
        check(!sin.correcta, `${n}: el enunciado sin semáforos ya sería correcto`);
        break;
      }
      default: fallo(`${n}: tipo desconocido ${e.tipo}`);
    }
  } catch (err) {
    fallo(`${n}: ${err.message}`);
  }
}
console.log(`  ${ejercicios.length} ejercicios revisados`);

/* ---------- 4. Generadores ---------- */
console.log('Generadores aleatorios');
let semilla = 12345;
const rng = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = 0; i < 300; i++) {
  try {
    const p = generarPlanificacion(rng);
    const r = resolverPlanificacion(p);
    check(r.gantt.filter(Boolean).length === p.procesos.reduce((s, x) => s + x.rafaga, 0), 'planificación: el Gantt no suma las ráfagas');
    check(r.resultados.every((x) => x.espera >= 0), 'planificación: espera negativa');
    const rr = resolverPlanificacion({ ...p, algoritmo: 'RR', quantum: 2, rrModo: 'cola' });
    check(rr.resultados.every((x) => x.espera >= 0), 'RR cola: espera negativa');
    const re = generarReemplazo(rng);
    const rre = resolverReemplazo(re);
    check(rre.fallos >= new Set(re.referencias).size, 'reemplazo: menos fallos que páginas distintas');
    const opt = resolverReemplazo({ ...re, algoritmo: 'OPT' }).fallos;
    for (const a of ['FIFO', 'LRU', 'RELOJ']) check(opt <= resolverReemplazo({ ...re, algoritmo: a }).fallos, `reemplazo: OPT peor que ${a}`);
    const pg = mem.generarPaginacion(rng);
    check(mem.resolverPaginacion(pg).traducciones.every((t) => t.fisica < pg.memoriaFisica), 'paginación: física fuera de rango');
    mem.resolverSegmentacion(mem.generarSegmentacion(rng));
    mem.resolverBaseLimite(mem.generarBaseLimite(rng));
    mem.resolverAjuste(mem.generarAjuste(rng));
    const bd = mem.generarBuddy(rng);
    const rb = mem.resolverBuddy(bd);
    check(rb.bloque >= bd.solicitud && rb.bloque / 2 < bd.solicitud, 'buddy: bloque incorrecto');
    mem.resolverAsignacionMarcos(mem.generarAsignacionMarcos(rng));
    mem.resolverEAT(mem.generarEAT(rng));
    const bq = generarBanquero(rng);
    const rbq = algoritmoSeguridad(bq);
    if (rbq.seguro) check(validarSecuencia(bq, rbq.secuencia), 'banquero: secuencia inválida');
    const dk = generarDisco(rng);
    for (const a of ['FCFS', 'SSTF', 'SCAN', 'CSCAN', 'LOOK', 'CLOOK']) {
      const r = resolverDisco({ ...dk, algoritmo: a });
      check(igual([...r.orden].sort((x, y) => x - y), [...dk.cola].sort((x, y) => x - y)), `disco ${a}: no atiende todos los pedidos`);
    }
    const bf = sinc.generarBuffer(rng);
    sinc.resolverBuffer(bf);
    sinc.resolverPeterson(sinc.generarPeterson(rng));
    calc.resolverAmdahl(calc.generarAmdahl(rng));
    calc.resolverInodo(calc.generarInodo(rng));
    calc.resolverBloques(calc.generarBloques(rng));
    calc.resolverRMS(calc.generarRMS(rng));
    if (i < 40) {
      const so = sinc.generarOrdenSemaforos(rng);
      const sol = sinc.solucionOrden(so);
      const r = sinc.verificarSemaforos(sol.programas.map((t) => sinc.parsearProceso(t).ops), sinc.parsearIniciales(sol.iniciales).valores, [so.orden.join('')]);
      check(r.correcta, `semáforos: la solución modelo falla para ${so.orden.join('')}`);
    }
  } catch (err) {
    fallo(`generador (iteración ${i}): ${err.message}`);
  }
}

console.log(`\n${ok} comprobaciones OK, ${errores} errores.`);
process.exit(errores ? 1 : 0);
