// Planificación de CPU: FCFS, SJF, SRTF, RR, prioridades (no apropiativa,
// apropiativa y con RR). Funciones puras: sirven en el navegador y en Node.
//
// Convenciones (las mismas que usa la cátedra en Unidad 3b):
//   T = Tf - Ti (tiempo de servicio / retorno), E = T - t, I = t / T.
//   Prioridad: el número MÁS CHICO es la prioridad MÁS ALTA.
//   Desempates: menor llegada y, si empatan, el orden en que se cargaron.
//   Round Robin "cátedra": la CPU recorre los procesos en ronda (lista
//   circular ordenada por llegada). Un proceso que llega justo cuando vence
//   el quantum se considera llegado antes de ese vencimiento.
//   Round Robin "cola": cola FIFO clásica (Silberschatz). Al vencer el
//   quantum, primero se encolan los que llegaron y después el desalojado.

export const ALGORITMOS = {
  FCFS: 'FCFS (primero en llegar, primero en ser atendido)',
  SJF: 'SJF (trabajo más corto primero, no apropiativo)',
  SRTF: 'SRTF (menor tiempo restante, apropiativo)',
  RR: 'Round Robin',
  PRIORIDAD: 'Prioridades (no apropiativo)',
  PRIORIDAD_AP: 'Prioridades (apropiativo)',
  PRIORIDAD_RR: 'Prioridades con Round Robin',
};

const redondear = (x) => Math.round(x * 100) / 100;

function ordenLlegada(procesos) {
  return procesos
    .map((p, i) => ({ ...p, _i: i }))
    .sort((a, b) => a.llegada - b.llegada || a._i - b._i);
}

/**
 * @param {{algoritmo:string, procesos:{id:string,llegada:number,rafaga:number,prioridad?:number}[], quantum?:number, rrModo?:'catedra'|'cola'}} datos
 */
export function resolverPlanificacion(datos) {
  const { algoritmo } = datos;
  const procesos = ordenLlegada(datos.procesos);
  const q = datos.quantum || 1;
  const pasos = [];
  const gantt = [];
  const resta = Object.fromEntries(procesos.map((p) => [p.id, p.rafaga]));
  const fin = {};
  const total = procesos.reduce((s, p) => s + p.rafaga, 0);
  let t = 0;
  const llegados = (tt) => procesos.filter((p) => p.llegada <= tt && resta[p.id] > 0);
  const terminados = () => Object.keys(fin).length === procesos.length;
  const ejecutar = (p, dur) => {
    for (let k = 0; k < dur; k++) gantt.push(p.id);
    t += dur;
    resta[p.id] -= dur;
    if (resta[p.id] === 0) fin[p.id] = t;
  };
  const ocioso = () => {
    const prox = Math.min(...procesos.filter((p) => resta[p.id] > 0).map((p) => p.llegada));
    pasos.push(`t=${t}: no hay procesos listos; la CPU queda ociosa hasta t=${prox}.`);
    while (t < prox) { gantt.push(null); t++; }
  };
  const listaTxt = (ps) => (ps.length ? ps.map((p) => p.id).join(', ') : 'ninguno');

  if (algoritmo === 'FCFS' || algoritmo === 'SJF' || algoritmo === 'PRIORIDAD') {
    while (!terminados()) {
      const listos = llegados(t);
      if (!listos.length) { ocioso(); continue; }
      let elegido;
      if (algoritmo === 'FCFS') {
        elegido = listos[0];
        pasos.push(`t=${t}: listos [${listaTxt(listos)}]. FCFS toma el que llegó primero: ${elegido.id} (llegó en ${elegido.llegada}). Ejecuta ${elegido.rafaga} u.t. sin ser desalojado.`);
      } else if (algoritmo === 'SJF') {
        elegido = [...listos].sort((a, b) => a.rafaga - b.rafaga || a.llegada - b.llegada || a._i - b._i)[0];
        pasos.push(`t=${t}: listos [${listos.map((p) => `${p.id}(${p.rafaga})`).join(', ')}]. SJF elige la ráfaga más corta: ${elegido.id}. Ejecuta completa (${elegido.rafaga} u.t.).`);
      } else {
        elegido = [...listos].sort((a, b) => a.prioridad - b.prioridad || a.llegada - b.llegada || a._i - b._i)[0];
        pasos.push(`t=${t}: listos [${listos.map((p) => `${p.id}(prio ${p.prioridad})`).join(', ')}]. Gana el número de prioridad más chico: ${elegido.id}. Ejecuta completa (${elegido.rafaga} u.t.).`);
      }
      ejecutar(elegido, resta[elegido.id]);
      pasos.push(`t=${t}: termina ${elegido.id}.`);
    }
  } else if (algoritmo === 'SRTF' || algoritmo === 'PRIORIDAD_AP') {
    let actual = null;
    while (!terminados()) {
      const listos = llegados(t);
      if (!listos.length) { ocioso(); actual = null; continue; }
      const clave = algoritmo === 'SRTF' ? (p) => resta[p.id] : (p) => p.prioridad;
      const mejor = Math.min(...listos.map(clave));
      const candidatos = listos.filter((p) => clave(p) === mejor);
      const elegido = candidatos.find((p) => actual && p.id === actual.id) || candidatos[0];
      if (!actual || elegido.id !== actual.id) {
        const detalle = algoritmo === 'SRTF'
          ? listos.map((p) => `${p.id}(resta ${resta[p.id]})`).join(', ')
          : listos.map((p) => `${p.id}(prio ${p.prioridad})`).join(', ');
        const motivo = actual && resta[actual.id] > 0 ? ` Desaloja a ${actual.id}.` : '';
        pasos.push(`t=${t}: listos [${detalle}]. Pasa a ejecutar ${elegido.id}.${motivo}`);
      } else {
        const nuevos = listos.filter((p) => p.llegada === t && p.id !== elegido.id);
        if (nuevos.length) {
          const val = (p) => (algoritmo === 'SRTF' ? `resta ${resta[p.id]}` : `prio ${p.prioridad}`);
          pasos.push(`t=${t}: llega ${nuevos.map((p) => `${p.id} (${val(p)})`).join(', ')}, pero no mejora a ${elegido.id} (${val(elegido)}): sigue ${elegido.id}.`);
        }
      }
      actual = elegido;
      ejecutar(elegido, 1);
      if (fin[elegido.id] !== undefined) { pasos.push(`t=${t}: termina ${elegido.id}.`); actual = null; }
    }
  } else if (algoritmo === 'RR' && (datos.rrModo || 'catedra') === 'catedra') {
    let pos = -1;
    const n = procesos.length;
    while (!terminados()) {
      let elegidoIdx = -1;
      for (let k = 1; k <= n; k++) {
        const idx = (((pos + k) % n) + n) % n;
        const p = procesos[idx];
        if (p.llegada <= t && resta[p.id] > 0) { elegidoIdx = idx; break; }
      }
      if (elegidoIdx < 0) { ocioso(); continue; }
      const p = procesos[elegidoIdx];
      const dur = Math.min(q, resta[p.id]);
      const listos = llegados(t);
      pasos.push(`t=${t}: en la ronda [${listaTxt(listos)}] le toca a ${p.id} (siguiente en orden de llegada). Ejecuta ${dur} u.t.${dur < q ? ' y termina antes de agotar el quantum.' : ''}`);
      ejecutar(p, dur);
      if (fin[p.id] !== undefined) pasos.push(`t=${t}: termina ${p.id}.`);
      pos = elegidoIdx;
    }
  } else if (algoritmo === 'RR') {
    const cola = [];
    const encolados = new Set();
    const admitir = (tt) => {
      for (const p of procesos) {
        if (!encolados.has(p.id) && p.llegada <= tt) { cola.push(p); encolados.add(p.id); }
      }
    };
    admitir(t);
    while (!terminados()) {
      if (!cola.length) { ocioso(); admitir(t); continue; }
      const p = cola.shift();
      const dur = Math.min(q, resta[p.id]);
      pasos.push(`t=${t}: cola [${[p, ...cola].map((x) => x.id).join(', ')}]. Sale ${p.id} y ejecuta ${dur} u.t.`);
      ejecutar(p, dur);
      admitir(t);
      if (fin[p.id] !== undefined) pasos.push(`t=${t}: termina ${p.id}.`);
      else { cola.push(p); pasos.push(`t=${t}: vence el quantum; ${p.id} vuelve al final de la cola.`); }
    }
  } else if (algoritmo === 'PRIORIDAD_RR') {
    const cola = [];
    const encolados = new Set();
    const admitir = (tt) => {
      for (const p of procesos) {
        if (!encolados.has(p.id) && p.llegada <= tt) { cola.push(p); encolados.add(p.id); }
      }
    };
    admitir(t);
    while (!terminados()) {
      if (!cola.length) { ocioso(); admitir(t); continue; }
      const mejor = Math.min(...cola.map((p) => p.prioridad));
      const idx = cola.findIndex((p) => p.prioridad === mejor);
      const p = cola.splice(idx, 1)[0];
      const mismos = cola.filter((x) => x.prioridad === mejor);
      // Si no hay otro proceso con la misma prioridad, sigue sin cortar.
      let dur = mismos.length ? Math.min(q, resta[p.id]) : resta[p.id];
      // Corta antes si llega alguien con prioridad estrictamente mejor.
      const llegadaMejor = procesos
        .filter((x) => !encolados.has(x.id) && x.prioridad < p.prioridad && x.llegada < t + dur)
        .map((x) => x.llegada);
      if (llegadaMejor.length) dur = Math.max(1, Math.min(...llegadaMejor) - t);
      pasos.push(`t=${t}: prioridad más alta disponible = ${mejor}. Ejecuta ${p.id}${mismos.length ? ` (comparte prioridad con ${mismos.map((x) => x.id).join(', ')} → turnos de q=${q})` : ' (único con esa prioridad, sigue hasta terminar)'} durante ${dur} u.t.`);
      ejecutar(p, dur);
      admitir(t);
      if (fin[p.id] !== undefined) pasos.push(`t=${t}: termina ${p.id}.`);
      else cola.push(p);
    }
  } else {
    throw new Error(`Algoritmo desconocido: ${algoritmo}`);
  }

  const resultados = datos.procesos.map((p) => {
    const Tf = fin[p.id];
    const T = Tf - p.llegada;
    const E = T - p.rafaga;
    return { id: p.id, llegada: p.llegada, rafaga: p.rafaga, prioridad: p.prioridad, fin: Tf, retorno: T, espera: E, indice: redondear(p.rafaga / T) };
  });
  const n = resultados.length;
  const promedios = {
    retorno: redondear(resultados.reduce((s, r) => s + r.retorno, 0) / n),
    espera: redondear(resultados.reduce((s, r) => s + r.espera, 0) / n),
    indice: redondear(resultados.reduce((s, r) => s + r.rafaga / r.retorno, 0) / n),
  };
  return { gantt, resultados, promedios, pasos, duracion: gantt.length, ocupado: total };
}

/** Comprime el Gantt en tramos [{id, desde, hasta}] para dibujarlo. */
export function tramosGantt(gantt) {
  const tramos = [];
  gantt.forEach((id, t) => {
    const ult = tramos[tramos.length - 1];
    if (ult && ult.id === id) ult.hasta = t + 1;
    else tramos.push({ id, desde: t, hasta: t + 1 });
  });
  return tramos;
}

export function generarPlanificacion(rng = Math.random, algoritmo) {
  const algs = Object.keys(ALGORITMOS);
  const alg = algoritmo || algs[Math.floor(rng() * algs.length)];
  const n = 4 + Math.floor(rng() * 2);
  const letras = 'ABCDEFG';
  const procesos = [];
  let llegada = 0;
  for (let i = 0; i < n; i++) {
    procesos.push({
      id: letras[i],
      llegada: alg === 'PRIORIDAD_RR' ? 0 : llegada,
      rafaga: 1 + Math.floor(rng() * 6),
      prioridad: 1 + Math.floor(rng() * 4),
    });
    llegada += Math.floor(rng() * 4);
  }
  const datos = { algoritmo: alg, procesos };
  if (alg === 'RR' || alg === 'PRIORIDAD_RR') {
    datos.quantum = 1 + Math.floor(rng() * 3);
    datos.rrModo = 'catedra';
  }
  if (!alg.startsWith('PRIORIDAD')) procesos.forEach((p) => delete p.prioridad);
  return datos;
}
