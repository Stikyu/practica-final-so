// Tipos de ejercicio: cada uno sabe generar datos aleatorios, mostrar el
// enunciado y armar los casilleros (con su valor esperado) y la resolución.

import { campoNumero, campoTexto, campoSelect } from './motor.js';
import { escapar, num, leerNumero } from '../util.js';
import { resolverPlanificacion, generarPlanificacion, tramosGantt, ALGORITMOS } from '../solvers/planificacion.js';
import { resolverReemplazo, generarReemplazo, ALGORITMOS_REEMPLAZO } from '../solvers/reemplazo.js';
import * as mem from '../solvers/memoria.js';
import { algoritmoSeguridad, validarSecuencia, evaluarSolicitud, generarBanquero } from '../solvers/banquero.js';
import { resolverDisco, generarDisco, ALGORITMOS_DISCO } from '../solvers/disco.js';
import * as sinc from '../solvers/sincronizacion.js';
import * as calc from '../solvers/calculos.js';

const SI_NO = [['si', 'Sí'], ['no', 'No']];
const tabla = (encabezado, filas) => `<div class="tabla-scroll"><table class="tabla-datos"><thead><tr>${encabezado.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const vacioOk = (v) => ['', '-', '–', '—'].includes(String(v).trim());

/** Interpreta "48 KB", "4 MB", "49152"… y devuelve bytes. */
function leerTamano(texto) {
  const m = String(texto).trim().toUpperCase().replace(',', '.').match(/^([\d.]+)\s*([KMGTP]?)I?B?$/);
  if (!m) return NaN;
  const pot = { '': 0, K: 1, M: 2, G: 3, T: 4, P: 5 }[m[2]];
  return Number(m[1]) * 1024 ** pot;
}

/* =================== U3 · Planificación =================== */

const colores = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)', 'var(--g6)', 'var(--g7)'];

function ganttHTML(gantt, ids) {
  const tramos = tramosGantt(gantt);
  const total = gantt.length;
  return `<div class="gantt" role="img" aria-label="Diagrama de Gantt">
    ${tramos.map((t) => `<div class="gantt-tramo ${t.id ? '' : 'ocioso'}" style="flex:${t.hasta - t.desde};${t.id ? `background:${colores[ids.indexOf(t.id) % colores.length]}` : ''}"><span>${t.id || '·'}</span></div>`).join('')}
  </div>
  <div class="gantt-eje">${tramos.map((t) => `<span style="flex:${t.hasta - t.desde}">${t.desde}</span>`).join('')}<span class="fin">${total}</span></div>`;
}

const planificacion = {
  id: 'planificacion',
  unidad: 'u3',
  nombre: 'Planificación de CPU',
  descripcion: 'FCFS, SJF, SRTF, Round Robin y prioridades: completá el Gantt y los tiempos.',
  opcionesGenerador: [{ id: 'algoritmo', label: 'Algoritmo', valores: [['', 'Cualquiera'], ...Object.entries(ALGORITMOS)] }],
  generar: (rng, op) => generarPlanificacion(rng, op.algoritmo || undefined),
  enunciado(d) {
    const conPrio = d.procesos.some((p) => p.prioridad !== undefined);
    const extra = d.algoritmo === 'RR' || d.algoritmo === 'PRIORIDAD_RR'
      ? `<p>Quantum <strong>q = ${d.quantum}</strong>.${d.algoritmo === 'RR' && (d.rrModo || 'catedra') === 'catedra' ? ' Convención de la cátedra: la CPU recorre los procesos en ronda, en orden de llegada, y un proceso que llega justo cuando vence el quantum se considera llegado antes del vencimiento.' : ''}</p>` : '';
    return `<p>Planificá estos procesos con <strong>${ALGORITMOS[d.algoritmo]}</strong>.${conPrio ? ' El número de prioridad más chico es la prioridad más alta.' : ''}</p>${extra}
      ${tabla(['Proceso', 'Llegada (Ti)', 'Ráfaga (t)', ...(conPrio ? ['Prioridad'] : [])], d.procesos.map((p) => [p.id, p.llegada, p.rafaga, ...(conPrio ? [p.prioridad] : [])]))}
      <p class="ayuda">Fórmulas de la cátedra: T = Tf − Ti, E = T − t, I = t / T. En el Gantt poné en cada casillero el proceso que usa la CPU en esa unidad de tiempo (o "-" si queda ociosa).</p>`;
  },
  construir(d) {
    const r = resolverPlanificacion(d);
    const alt = (id) => (id ? [id.replace(/^P/i, '')] : ['-']);
    return {
      bloques: [
        { tipo: 'tabla', titulo: 'Diagrama de Gantt', clase: 'gantt-input', encabezado: r.gantt.map((_, t) => String(t)), filas: [{ etiqueta: 'CPU', celdas: r.gantt.map((id, t) => campoTexto(`g${t}`, id || '', { ancho: 'xs', alternativas: alt(id) })) }] },
        { tipo: 'tabla', titulo: 'Tiempos por proceso', encabezado: ['Ti', 't', 'Tf', 'T', 'E', 'I'], filas: r.resultados.map((x) => ({ etiqueta: x.id, celdas: [{ texto: x.llegada }, { texto: x.rafaga }, campoNumero(`tf-${x.id}`, x.fin, { ancho: 'xs' }), campoNumero(`t-${x.id}`, x.retorno, { ancho: 'xs' }), campoNumero(`e-${x.id}`, x.espera, { ancho: 'xs' }), campoNumero(`i-${x.id}`, x.indice, { ancho: 'xs', tol: 0.011 })] })) },
        { tipo: 'campos', titulo: 'Promedios', campos: [campoNumero('pt', r.promedios.retorno, { label: 'T promedio', tol: 0.011 }), campoNumero('pe', r.promedios.espera, { label: 'E promedio', tol: 0.011 })] },
      ],
      pasos: [...r.pasos, `Cálculos: ${r.resultados.map((x) => `${x.id}: T = ${x.fin} − ${x.llegada} = ${x.retorno}, E = ${x.retorno} − ${x.rafaga} = ${x.espera}`).join('; ')}.`, `Promedios: T = ${num(r.promedios.retorno)}, E = ${num(r.promedios.espera)}, I = ${num(r.promedios.indice)}.`].map(escapar),
      extraSolucion: ganttHTML(r.gantt, d.procesos.map((p) => p.id)),
    };
  },
};

/* =================== U5 · Reemplazo =================== */

const reemplazo = {
  id: 'reemplazo',
  unidad: 'u5',
  nombre: 'Reemplazo de páginas',
  descripcion: 'FIFO, Óptimo, LRU y Reloj: completá la tabla de marcos y contá los fallos.',
  opcionesGenerador: [{ id: 'algoritmo', label: 'Algoritmo', valores: [['', 'Cualquiera'], ...Object.entries(ALGORITMOS_REEMPLAZO)] }],
  generar: (rng, op) => generarReemplazo(rng, op.algoritmo || undefined),
  enunciado(d) {
    const nota = {
      OPT: ' Si varias páginas no se vuelven a usar, se saca la que entró primero.',
      RELOJ: ' Al cargar o referenciar una página su bit R queda en 1; el puntero empieza en el marco 1 y solo avanza al buscar víctima.',
    }[d.algoritmo] || '';
    return `<p>Aplicá <strong>${ALGORITMOS_REEMPLAZO[d.algoritmo]}</strong> con <strong>${d.marcos} marcos</strong> a la cadena de referencias:</p>
      <p class="cadena">${d.referencias.join(' ')}</p>
      <p class="ayuda">Completá el contenido de cada marco después de cada referencia (dejá vacío o "-" si el marco está libre) y marcá "F" en la fila de fallos cuando haya fallo de página. Una página nueva ocupa el primer marco libre o el marco de la víctima.${nota}</p>`;
  },
  construir(d) {
    const r = resolverReemplazo(d);
    const filas = [];
    for (let m = 0; m < d.marcos; m++) {
      filas.push({ etiqueta: `Marco ${m + 1}`, celdas: r.pasos.map((p, t) => campoTexto(`m${m}-${t}`, p.marcos[m] === null ? '' : String(p.marcos[m]), { ancho: 'xs', alternativas: p.marcos[m] === null ? ['-'] : [] })) });
    }
    filas.push({
      etiqueta: '¿Fallo?',
      celdas: r.pasos.map((p, t) => campoTexto(`f${t}`, p.fallo ? 'F' : '', {
        ancho: 'xs',
        mostrar: p.fallo ? 'F' : '–',
        valorRelleno: p.fallo ? 'F' : '',
        validar: (v) => (p.fallo ? ['F', 'X', 'SI', 'S', '1'].includes(String(v).trim().toUpperCase()) : vacioOk(v) || ['NO', 'N', '0'].includes(String(v).trim().toUpperCase())),
      })),
    });
    return {
      bloques: [
        { tipo: 'tabla', titulo: 'Marcos después de cada referencia', clase: 'marcos', encabezado: d.referencias.map(String), filas },
        { tipo: 'campos', titulo: 'Totales', campos: [campoNumero('fallos', r.fallos, { label: 'Fallos de página' }), campoNumero('aciertos', r.aciertos, { label: 'Aciertos' })] },
      ],
      pasos: [...r.pasos.map((p, t) => `${t + 1}. ${p.texto} Marcos: [${p.marcos.map((x) => (x === null ? '–' : x)).join(' | ')}]${p.bits ? ` · bits R: [${p.bits.join(' ')}]` : ''}`), `Total: ${r.fallos} fallos y ${r.aciertos} aciertos sobre ${d.referencias.length} referencias.`].map(escapar),
    };
  },
};

/* =================== U5 · Paginación =================== */

const paginacion = {
  id: 'paginacion',
  unidad: 'u5',
  nombre: 'Paginación: traducción de direcciones',
  descripcion: 'Calculá tamaño de página, cantidad de páginas y marcos, (p, d) y la dirección física.',
  generar: (rng) => mem.generarPaginacion(rng),
  enunciado(d) {
    return `<p>Espacio lógico de <strong>m = ${d.m}</strong> bits, páginas de <strong>2<sup>n</sup></strong> bytes con <strong>n = ${d.n}</strong> y memoria física de <strong>${d.memoriaFisica} bytes</strong>.</p>
      <p>Tabla de páginas:</p>
      ${tabla(['Página', ...d.tabla.map((_, i) => i)], [['Marco', ...d.tabla]])}
      <p>Traducí las direcciones lógicas: <strong>${d.direcciones.join(', ')}</strong>.</p>
      <p class="ayuda">Dirección física = marco × tamaño de página + d.</p>`;
  },
  construir(d) {
    const r = mem.resolverPaginacion(d);
    return {
      bloques: [
        { tipo: 'campos', titulo: 'Datos', campos: [
          campoNumero('dirs', r.direccionesLogicas, { label: 'Cantidad de direcciones lógicas (2^m)' }),
          campoNumero('tam', r.tamPagina, { label: 'Tamaño de página (bytes)' }),
          campoNumero('pags', r.cantPaginas, { label: 'Cantidad de páginas' }),
          campoNumero('marcos', r.cantMarcos, { label: 'Cantidad de marcos' }),
          campoNumero('bp', r.bitsP, { label: 'Bits de p' }),
          campoNumero('bd', r.bitsD, { label: 'Bits de d' }),
        ] },
        { tipo: 'tabla', titulo: 'Direcciones lógicas de cada página', encabezado: ['Desde', 'Hasta'], filas: d.tabla.map((_, p) => ({ etiqueta: `Página ${p}`, celdas: [campoNumero(`des${p}`, p * r.tamPagina, { ancho: 'xs' }), campoNumero(`has${p}`, (p + 1) * r.tamPagina - 1, { ancho: 'xs' })] })) },
        { tipo: 'tabla', titulo: 'Traducciones', encabezado: ['p', 'd', 'Marco', 'Física'], filas: r.traducciones.map((t, i) => ({ etiqueta: `Lógica ${t.logica}`, celdas: [campoNumero(`p${i}`, t.p, { ancho: 'xs' }), campoNumero(`d${i}`, t.d, { ancho: 'xs' }), campoNumero(`mc${i}`, t.marco, { ancho: 'xs' }), campoNumero(`fi${i}`, t.fisica, { ancho: 'xs' })] })) },
      ],
      pasos: [
        `Direcciones lógicas: 2^${d.m} = ${r.direccionesLogicas} (de 0 a ${r.rangoMax}).`,
        `Tamaño de página: 2^${d.n} = ${r.tamPagina} bytes.`,
        `Cantidad de páginas: ${r.direccionesLogicas} / ${r.tamPagina} = ${r.cantPaginas}. Marcos: ${d.memoriaFisica} / ${r.tamPagina} = ${r.cantMarcos}.`,
        `p usa m − n = ${r.bitsP} bits (los de la izquierda) y d usa n = ${r.bitsD} bits (los de la derecha). La página k abarca de k × ${r.tamPagina} a k × ${r.tamPagina} + ${r.tamPagina - 1}.`,
        ...r.traducciones.map((t) => t.texto),
      ].map(escapar),
    };
  },
};

/* =================== U5 · Segmentación =================== */

const segmentacion = {
  id: 'segmentacion',
  unidad: 'u5',
  nombre: 'Segmentación',
  descripcion: 'Con la tabla de segmentos (base, límite), decidí si cada (s, d) es válida y calculá la física.',
  generar: (rng) => mem.generarSegmentacion(rng),
  enunciado(d) {
    return `<p>Tabla de segmentos:</p>${tabla(['Segmento', 'Límite', 'Base'], d.tabla.map((s, i) => [i, s.limite, s.base]))}
      <p>Para cada dirección lógica (s, d), indicá si es válida y la dirección física (dejala vacía si hay trap).</p>`;
  },
  construir(d) {
    const r = mem.resolverSegmentacion(d);
    return {
      bloques: [{ tipo: 'tabla', titulo: 'Direcciones', encabezado: ['¿Válida?', 'Física'], filas: r.map((x, i) => ({ etiqueta: `(${x.s}, ${x.d})`, celdas: [campoSelect(`v${i}`, x.valida ? 'si' : 'no', [['si', 'Sí'], ['no', 'No (trap)']]), x.valida ? campoNumero(`f${i}`, x.fisica) : campoTexto(`f${i}`, '', { mostrar: 'trap', validar: (v) => vacioOk(v) || /^trap$/i.test(String(v).trim()) })] })) }],
      pasos: ['Se usa s como índice de la tabla, se verifica 0 ≤ d < límite y, si es legal, física = base + d.', ...r.map((x) => `(${x.s}, ${x.d}): ${x.texto}`)].map(escapar),
    };
  },
};

/* =================== U5 · Base y límite =================== */

const baseLimite = {
  id: 'base-limite',
  unidad: 'u5',
  nombre: 'Registros base y límite',
  descripcion: 'Decidí qué direcciones son legales para un proceso protegido con base y límite.',
  generar: (rng) => mem.generarBaseLimite(rng),
  enunciado: (d) => `<p>Un proceso tiene <strong>base = ${d.base}</strong> y <strong>límite = ${d.limite}</strong>. ¿Cuál es su última dirección legal y cuáles de estas direcciones puede usar?</p>`,
  construir(d) {
    const r = mem.resolverBaseLimite(d);
    return {
      bloques: [
        { tipo: 'campos', campos: [campoNumero('ult', r.ultima, { label: 'Última dirección legal' })] },
        { tipo: 'tabla', titulo: '¿Acceso legal?', encabezado: ['¿Legal?'], filas: r.resultados.map((x, i) => ({ etiqueta: String(x.dir), celdas: [campoSelect(`l${i}`, x.legal ? 'si' : 'no', [['si', 'Sí'], ['no', 'No (trap)']])] })) },
      ],
      pasos: [`Una dirección es legal si base ≤ dir < base + límite = ${d.base + d.limite}. La última legal es ${d.base} + ${d.limite} − 1 = ${r.ultima}.`, ...r.resultados.map((x) => x.texto)].map(escapar),
    };
  },
};

/* =================== U5 · Asignación contigua =================== */

const NOMBRE_AJUSTE = { first: 'First-fit (primer ajuste)', best: 'Best-fit (mejor ajuste)', worst: 'Worst-fit (peor ajuste)' };
const ajuste = {
  id: 'ajuste',
  unidad: 'u5',
  nombre: 'Asignación contigua (first/best/worst-fit)',
  descripcion: 'Ubicá procesos en huecos libres con cada estrategia de ajuste.',
  opcionesGenerador: [{ id: 'estrategia', label: 'Estrategia', valores: [['', 'Cualquiera'], ...Object.entries(NOMBRE_AJUSTE)] }],
  generar: (rng, op) => ({ ...mem.generarAjuste(rng), ...(op.estrategia ? { estrategia: op.estrategia } : {}) }),
  enunciado: (d) => `<p>Huecos libres en memoria (en orden): ${tabla(d.huecos.map((_, i) => `Hueco ${i + 1}`), [d.huecos])}</p>
    <p>Llegan, en este orden, procesos de <strong>${d.solicitudes.join(', ')}</strong> KB. Asignalos con <strong>${NOMBRE_AJUSTE[d.estrategia]}</strong>. Cuando un proceso usa un hueco, lo que sobra queda como hueco más chico en el mismo lugar.</p>
    <p class="ayuda">Poné el número de hueco usado, o "-" si ningún hueco alcanza.</p>`,
  construir(d) {
    const r = mem.resolverAjuste(d);
    return {
      bloques: [
        { tipo: 'tabla', titulo: 'Asignaciones', encabezado: ['Hueco usado'], filas: r.asignaciones.map((a, i) => ({ etiqueta: `Proceso de ${a.tam} KB`, celdas: [a.hueco ? campoNumero(`h${i}`, a.hueco, { ancho: 'xs' }) : campoTexto(`h${i}`, '', { ancho: 'xs', mostrar: 'espera', valorRelleno: '', validar: (v) => vacioOk(v) || /^esp/i.test(String(v).trim()) })] })) },
        { tipo: 'tabla', titulo: 'Tamaño final de cada hueco', encabezado: r.restantes.map((_, i) => `Hueco ${i + 1}`), filas: [{ etiqueta: 'KB libres', celdas: r.restantes.map((x, i) => campoNumero(`r${i}`, x, { ancho: 'xs' })) }] },
      ],
      pasos: r.pasos.map(escapar),
    };
  },
};

/* =================== U5 · Buddy System =================== */

const buddy = {
  id: 'buddy',
  unidad: 'u5',
  nombre: 'Buddy System',
  descripcion: 'Calculá el bloque potencia de 2 que entrega el kernel y la fragmentación interna.',
  generar: (rng) => mem.generarBuddy(rng),
  enunciado: (d) => `<p>El kernel administra un segmento de <strong>${d.segmento} KB</strong> con el Buddy System y pide <strong>${d.solicitud} KB</strong>.</p>`,
  construir(d) {
    const r = mem.resolverBuddy(d);
    return {
      bloques: [{ tipo: 'campos', campos: [
        campoNumero('b', r.bloque, { label: 'Tamaño del bloque asignado (KB)' }),
        campoNumero('dv', r.cantDivisiones, { label: 'Cantidad de divisiones a la mitad' }),
        campoNumero('fi', r.fragInterna, { label: 'Fragmentación interna (KB)' }),
      ] }],
      pasos: [`La menor potencia de 2 que contiene ${d.solicitud} KB es ${r.bloque} KB.`, r.divisiones.length ? `Divisiones: ${r.divisiones.join('; ')}.` : 'No hace falta dividir.', `Se desperdician ${r.bloque} − ${d.solicitud} = ${r.fragInterna} KB (fragmentación interna). Al liberar, los compañeros se fusionan otra vez.`].map(escapar),
    };
  },
};

/* =================== U5 · Asignación de marcos =================== */

const asignacionMarcos = {
  id: 'asignacion-marcos',
  unidad: 'u5',
  nombre: 'Asignación de marcos',
  descripcion: 'Repartí marcos libres de forma equitativa y proporcional.',
  generar: (rng) => mem.generarAsignacionMarcos(rng),
  enunciado: (d) => `<p>Hay <strong>${d.marcos} marcos libres</strong> y ${d.tamanos.length} procesos de ${d.tamanos.map((t, i) => `P${i + 1} = ${t} páginas`).join(', ')}.</p>
    <p class="ayuda">Equitativa: m / n para cada uno. Proporcional: ai = si / S × m (redondeá hacia abajo).</p>`,
  construir(d) {
    const r = mem.resolverAsignacionMarcos(d);
    return {
      bloques: [
        { tipo: 'campos', titulo: 'Equitativa', campos: [campoNumero('eq', r.equitativa, { label: 'Marcos por proceso' }), campoNumero('sob', r.sobranEquitativa, { label: 'Marcos que sobran' })] },
        { tipo: 'campos', titulo: 'Proporcional', campos: [campoNumero('S', r.S, { label: 'S (suma de tamaños)' }), ...r.proporcional.map((x, i) => campoNumero(`p${i}`, x, { label: `Marcos para P${i + 1}` }))] },
      ],
      pasos: [`Equitativa: ${d.marcos} / ${d.tamanos.length} = ${r.equitativa} (sobran ${r.sobranEquitativa}).`, `S = ${d.tamanos.join(' + ')} = ${r.S}.`, ...r.exactos.map((x, i) => `P${i + 1}: ${d.tamanos[i]} / ${r.S} × ${d.marcos} = ${num(x)} → ${r.proporcional[i]} marcos.`)].map(escapar),
    };
  },
};

/* =================== U5 · EAT =================== */

const eat = {
  id: 'eat',
  unidad: 'u5',
  nombre: 'Tiempo de acceso efectivo (EAT)',
  descripcion: 'Calculá el EAT con paginación bajo demanda y el impacto de los fallos de página.',
  generar: (rng) => mem.generarEAT(rng),
  enunciado: (d) => `<p>Acceso a RAM: <strong>${d.tMem.toLocaleString('es-AR')} ns</strong>. Servicio de un fallo de página: <strong>${(d.tFallo / 1e6).toLocaleString('es-AR')} ms</strong> (${d.tFallo.toLocaleString('es-AR')} ns). Probabilidad de fallo: <strong>p = ${d.p.toLocaleString('es-AR')}</strong>.</p>
    <p class="ayuda">EAT = (1 − p) × t_RAM + p × t_fallo.</p>`,
  construir(d) {
    const r = mem.resolverEAT(d);
    return {
      bloques: [{ tipo: 'campos', campos: [
        campoNumero('eat', r.eat, { label: 'EAT (ns)', tol: 0.5 }),
        campoNumero('fac', r.factor, { label: '¿Cuántas veces más lento que la RAM?', tol: 0.5, tolRel: 0.01 }),
        campoNumero('x', 1 / r.pMax10, { label: 'Para perder menos del 10 %, p < 1 en … accesos', tolRel: 0.005 }),
      ] }],
      pasos: [
        `EAT = (1 − ${d.p}) × ${d.tMem} + ${d.p} × ${d.tFallo} = ${num((1 - d.p) * d.tMem)} + ${num(d.p * d.tFallo)} = ${num(r.eat)} ns.`,
        `Comparado con la RAM: ${num(r.eat)} / ${d.tMem} ≈ ${num(r.factor, 1)} veces más lento.`,
        `Perder menos del 10 % significa EAT < 1,1 × ${d.tMem} = ${num(1.1 * d.tMem)} ns → p × (${d.tFallo} − ${d.tMem}) < ${num(0.1 * d.tMem)} → p < ${r.pMax10.toExponential(3)}, o sea, menos de 1 fallo cada ${Math.round(1 / r.pMax10).toLocaleString('es-AR')} accesos.`,
      ].map(escapar),
    };
  },
};

/* =================== U2 · Amdahl =================== */

const amdahl = {
  id: 'amdahl',
  unidad: 'u2',
  nombre: 'Ley de Amdahl',
  descripcion: 'Calculá la aceleración de un programa en varios núcleos y su límite.',
  generar: (rng) => calc.generarAmdahl(rng),
  enunciado: (d) => `<p>Un programa tarda <strong>${d.tiempo} s</strong> en un núcleo. El <strong>${num(d.P * 100)} %</strong> del código es paralelizable y se ejecuta en <strong>${d.N} núcleos</strong> (mejora ideal de la parte paralela).</p>
    <p class="ayuda">S = 1 / ((1 − P) + P / N).</p>`,
  construir(d) {
    const r = calc.resolverAmdahl(d);
    return {
      bloques: [{ tipo: 'campos', campos: [
        campoNumero('S', r.S, { label: 'Aceleración S', tol: 0.011 }),
        campoNumero('t', r.tiempoNuevo, { label: 'Nuevo tiempo (s)', tol: 0.051 }),
        campoNumero('lim', r.limite, { label: 'Aceleración máxima con infinitos núcleos', tol: 0.011 }),
      ] }],
      pasos: [
        `Fracción paralela P = ${d.P}; fracción serie 1 − P = ${num(1 - d.P)}; N = ${d.N}.`,
        `S = 1 / (${num(1 - d.P)} + ${d.P} / ${d.N}) = 1 / (${num(1 - d.P)} + ${num(d.P / d.N, 4)}) = 1 / ${num(1 - d.P + d.P / d.N, 4)} = ${num(r.S)}.`,
        `Nuevo tiempo = ${d.tiempo} / ${num(r.S)} = ${num(r.tiempoNuevo)} s.`,
        `Límite: con N → ∞, S → 1 / (1 − P) = 1 / ${num(1 - d.P)} = ${num(r.limite)}. La parte serial pone el techo.`,
      ].map(escapar),
    };
  },
};

/* =================== U6 · Bloques =================== */

const bloques = {
  id: 'bloques',
  unidad: 'u6',
  nombre: 'Bloques y fragmentación interna',
  descripcion: 'Calculá cuántos bloques ocupa un archivo y cuánto se desperdicia.',
  generar: (rng) => calc.generarBloques(rng),
  enunciado: (d) => `<p>Un archivo de <strong>${d.archivo.toLocaleString('es-AR')} bytes</strong> se guarda en un sistema con bloques de <strong>${d.bloque} bytes</strong>.</p>`,
  construir(d) {
    const r = calc.resolverBloques(d);
    return {
      bloques: [{ tipo: 'campos', campos: [campoNumero('b', r.bloques, { label: 'Bloques asignados' }), campoNumero('o', r.ocupado, { label: 'Bytes ocupados en disco' }), campoNumero('w', r.desperdicio, { label: 'Fragmentación interna (bytes)' })] }],
      pasos: [`Bloques = ⌈${d.archivo} / ${d.bloque}⌉ = ${r.bloques}.`, `Ocupa ${r.bloques} × ${d.bloque} = ${r.ocupado} bytes.`, `Desperdicio en el último bloque: ${r.ocupado} − ${d.archivo} = ${r.desperdicio} bytes.`].map(escapar),
    };
  },
};

/* =================== U6 · Inodo =================== */

const inodo = {
  id: 'inodo',
  unidad: 'u6',
  nombre: 'Capacidad del inodo UNIX',
  descripcion: '12 punteros directos más indirecto simple, doble y triple: calculá cuánto direcciona cada uno.',
  generar: (rng) => calc.generarInodo(rng),
  enunciado: (d) => `<p>Bloques de <strong>${calc.formatoBytes(d.bloque)}</strong> y punteros de <strong>${d.puntero} bytes</strong>. El inodo tiene ${d.directos} punteros directos, uno indirecto simple, uno doble y uno triple.</p>
    <p class="ayuda">Podés responder con unidades (por ejemplo "48 KB" o "4 GB") o en bytes.</p>`,
  construir(d) {
    const r = calc.resolverInodo(d);
    const tam = (id, label, v) => campoTexto(id, calc.formatoBytes(v), { label, ancho: 'm', validar: (x) => leerTamano(x) === v });
    return {
      bloques: [{ tipo: 'campos', campos: [
        campoNumero('ppb', r.punterosPorBloque, { label: 'Punteros por bloque de índice' }),
        tam('dir', 'Capacidad directa', r.directa),
        tam('s', 'Indirecto simple', r.simple),
        tam('db', 'Indirecto doble', r.doble),
        tam('tr', 'Indirecto triple', r.triple),
      ] }],
      pasos: [
        `Punteros por bloque = ${d.bloque} / ${d.puntero} = ${r.punterosPorBloque}.`,
        `Directa: ${d.directos} × ${calc.formatoBytes(d.bloque)} = ${calc.formatoBytes(r.directa)}.`,
        `Simple: ${r.punterosPorBloque} × ${calc.formatoBytes(d.bloque)} = ${calc.formatoBytes(r.simple)}.`,
        `Doble: ${r.punterosPorBloque}² × ${calc.formatoBytes(d.bloque)} = ${calc.formatoBytes(r.doble)}.`,
        `Triple: ${r.punterosPorBloque}³ × ${calc.formatoBytes(d.bloque)} = ${calc.formatoBytes(r.triple)}.`,
      ].map(escapar),
    };
  },
};

/* =================== U6 · Disco =================== */

const disco = {
  id: 'disco',
  unidad: 'u6',
  nombre: 'Planificación de disco',
  descripcion: 'FCFS, SSTF, SCAN, C-SCAN, LOOK y C-LOOK: orden de atención y cilindros recorridos.',
  opcionesGenerador: [{ id: 'algoritmo', label: 'Algoritmo', valores: [['', 'Cualquiera'], ...Object.entries(ALGORITMOS_DISCO)] }],
  generar: (rng, op) => ({ ...generarDisco(rng), ...(op.algoritmo ? { algoritmo: op.algoritmo } : {}) }),
  enunciado(d) {
    const dir = ['FCFS', 'SSTF'].includes(d.algoritmo) ? '' : ` El cabezal se mueve hacia <strong>${d.direccion === 'arriba' ? 'cilindros mayores' : 'cilindros menores (hacia 0)'}</strong>.`;
    return `<p>Disco de cilindros 0 a ${d.maxCilindro}. Cola de pedidos (en orden de llegada): <strong>${d.cola.join(', ')}</strong>. Cabezal en el cilindro <strong>${d.cabeza}</strong>.${dir}</p>
      <p>Aplicá <strong>${ALGORITMOS_DISCO[d.algoritmo]}</strong>.</p>
      <p class="ayuda">Escribí el orden en que se atienden los pedidos separados por comas (sin incluir los extremos del disco) y el total de cilindros recorridos.${['CSCAN', 'CLOOK'].includes(d.algoritmo) ? ' Se acepta el total contando o sin contar el salto de retorno.' : ''}${d.algoritmo === 'SSTF' ? ' Si dos pedidos están a la misma distancia, se va al de cilindro menor.' : ''}</p>`;
  },
  construir(d) {
    const r = resolverDisco(d);
    const totales = ['CSCAN', 'CLOOK'].includes(d.algoritmo) ? [r.total, r.totalSinRetorno] : [r.total];
    return {
      bloques: [{ tipo: 'campos', campos: [
        campoTexto('orden', r.orden.join(', '), { label: 'Orden de atención', ancho: 'l', placeholder: 'ej: 65, 67, 37…', validar: (v) => String(v).split(/[\s,;→>-]+/).filter(Boolean).map(Number).join(',') === r.orden.join(',') }),
        campoNumero('total', r.total, { label: 'Cilindros recorridos', mostrar: totales.length > 1 ? `${r.total} (o ${r.totalSinRetorno} sin contar el retorno)` : String(r.total), valorRelleno: String(r.total), validar: (v) => totales.includes(leerNumero(v)) }),
      ] }],
      pasos: [...r.pasos, `Total: ${r.total} cilindros${totales.length > 1 ? ` (${r.totalSinRetorno} sin contar el salto de retorno de ${r.saltoRetorno})` : ''}.`].map(escapar),
      extraSolucion: `<p class="cadena">${r.recorrido.join(' → ')}</p>`,
    };
  },
};

/* =================== U4 · Banquero =================== */

const banquero = {
  id: 'banquero',
  unidad: 'u4',
  nombre: 'Algoritmo del banquero',
  descripcion: 'Calculá Need, decidí si el estado es seguro y encontrá una secuencia segura.',
  generar: (rng) => generarBanquero(rng),
  enunciado(d) {
    const rec = d.recursos;
    const n = d.max.length;
    const fila = (i, m) => [`P${i}`, ...m[i]];
    const sol = d.solicitud ? `<p>Además, <strong>P${d.solicitud.proceso}</strong> pide <strong>(${d.solicitud.vector.join(', ')})</strong>. ¿Se le concede según el banquero?</p>` : '';
    return `<p>Recursos: ${rec.join(', ')}. Disponible = <strong>(${d.disponible.join(', ')})</strong>.</p>
      <div class="dos-columnas">
        <div><p>Allocation (asignado)</p>${tabla(['', ...rec], Array.from({ length: n }, (_, i) => fila(i, d.asignado)))}</div>
        <div><p>Max (máximo)</p>${tabla(['', ...rec], Array.from({ length: n }, (_, i) => fila(i, d.max)))}</div>
      </div>${sol}
      <p class="ayuda">Need = Max − Allocation. Cualquier secuencia segura válida se acepta (escribila como P1, P0, P2…). Si el estado es inseguro, dejá la secuencia vacía.</p>`;
  },
  construir(d) {
    const r = algoritmoSeguridad(d);
    const campos = [
      campoSelect('seg', r.seguro ? 'si' : 'no', SI_NO, { label: '¿El estado es seguro?' }),
      campoTexto('sec', r.seguro ? r.secuencia.join(', ') : '', { label: 'Secuencia segura', ancho: 'l', mostrar: r.seguro ? `${r.secuencia.join(', ')} (u otra válida)` : 'no existe', valorRelleno: r.seguro ? r.secuencia.join(', ') : '', validar: (v) => (r.seguro ? validarSecuencia(d, String(v).split(/[\s,;→>]+/).filter(Boolean).map((x) => (/^\d+$/.test(x) ? `P${x}` : x))) : vacioOk(v) || /^no/i.test(String(v).trim())) }),
    ];
    const pasos = [...r.pasos];
    if (d.solicitud) {
      const ev = evaluarSolicitud(d, d.solicitud.proceso, d.solicitud.vector);
      campos.push(campoSelect('con', ev.concede ? 'si' : 'no', SI_NO, { label: `¿Se concede el pedido de P${d.solicitud.proceso}?` }));
      pasos.push(`Pedido de P${d.solicitud.proceso} (${d.solicitud.vector.join(', ')}): ${ev.motivo}`);
      if (ev.simulacion) {
        pasos.push(`Estado simulado: Disponible = (${ev.nuevo.disponible.join(', ')}).`, ...ev.simulacion.pasos.slice(1));
      }
    }
    return {
      bloques: [
        { tipo: 'tabla', titulo: 'Need = Max − Allocation', encabezado: d.recursos, filas: r.need.map((fila, i) => ({ etiqueta: `P${i}`, celdas: fila.map((x, j) => campoNumero(`n${i}-${j}`, x, { ancho: 'xs' })) })) },
        { tipo: 'campos', titulo: 'Seguridad', campos },
      ],
      pasos: [`Need: ${r.need.map((f, i) => `P${i} = (${f.join(', ')})`).join('; ')}.`, ...pasos].map(escapar),
    };
  },
};

/* =================== U7 · RMS =================== */

const rms = {
  id: 'rms',
  unidad: 'u7',
  nombre: 'Rate-Monotonic (RMS)',
  descripcion: 'Calculá la utilización, la cota de Liu y Layland y si RMS garantiza los plazos.',
  generar: (rng) => calc.generarRMS(rng),
  enunciado: (d) => `<p>Tareas periódicas (plazo = período):</p>${tabla(['Tarea', 'Ejecución t (ms)', 'Período p (ms)'], d.tareas.map((t) => [escapar(t.nombre), t.t, t.p]))}
    <p class="ayuda">Ui = ti / pi. Cota RMS: N(2^(1/N) − 1). Podés responder en decimal (0,4) o en porcentaje (40).</p>`,
  construir(d) {
    const r = calc.resolverRMS(d);
    const pct = (id, label, v) => campoNumero(id, v, { label, mostrar: `${num(v * 100, 1)} %`, valorRelleno: num(v, 4), validar: (x) => { const n = leerNumero(x); if (Number.isNaN(n)) return false; const val = n > 1.5 ? n / 100 : n; return Math.abs(val - v) <= 0.0051; } });
    return {
      bloques: [{ tipo: 'campos', campos: [
        ...d.tareas.map((t, i) => pct(`u${i}`, `U de ${t.nombre}`, r.utilizaciones[i])),
        pct('U', 'Utilización total U', r.U),
        pct('cota', `Cota para N = ${d.tareas.length}`, r.cota),
        campoSelect('gar', r.garantizado ? 'si' : 'no', SI_NO, { label: '¿RMS garantiza los plazos?' }),
        campoSelect('prio', r.prioridades[0], d.tareas.map((t) => t.nombre), { label: 'Tarea de mayor prioridad' }),
      ] }],
      pasos: [
        ...d.tareas.map((t, i) => `${t.nombre}: U = ${t.t} / ${t.p} = ${num(r.utilizaciones[i] * 100, 1)} %.`),
        `U total = ${num(r.U * 100, 1)} %.`,
        `Cota = ${d.tareas.length} × (2^(1/${d.tareas.length}) − 1) = ${num(r.cota * 100, 1)} %.`,
        r.garantizado ? `${num(r.U * 100, 1)} % ≤ ${num(r.cota * 100, 1)} % → RMS garantiza que todas cumplen sus plazos.` : `${num(r.U * 100, 1)} % > ${num(r.cota * 100, 1)} % → la fórmula ya no puede garantizarlo${r.edfFactible ? ' (con EDF, como U ≤ 100 %, sí sería planificable)' : ''}.`,
        `Prioridades (período más corto = más prioridad): ${r.prioridades.join(' > ')}.`,
      ].map(escapar),
    };
  },
};

/* =================== U4 · Buffer circular =================== */

const ESTADOS_BUFFER = ['Vacío', 'Lleno', 'Ni lleno ni vacío'];
const buffer = {
  id: 'buffer',
  unidad: 'u4',
  nombre: 'Buffer circular productor/consumidor',
  descripcion: 'Seguí in, out y los bloqueos en un buffer circular que desperdicia una posición.',
  generar: (rng) => sinc.generarBuffer(rng),
  enunciado: (d) => `<p>BUFFER_SIZE = <strong>${d.tam}</strong>, in = out = 0 al comienzo. El productor se bloquea si <code>(in + 1) % ${d.tam} == out</code> y el consumidor si <code>in == out</code>. Un intento bloqueado no mueve ningún puntero.</p>
    <p class="ayuda">Completá, después de cada evento, si el proceso se bloqueó, los valores de in y out y el estado del buffer.</p>`,
  construir(d) {
    const r = sinc.resolverBuffer(d);
    return {
      bloques: [{ tipo: 'tabla', titulo: 'Traza', encabezado: ['¿Se bloquea?', 'in', 'out', 'Estado'], filas: r.pasos.map((p, i) => ({
        etiqueta: `T${i + 1} · ${p.op.tipo === 'P' ? `Productor agrega '${p.op.item}'` : 'Consumidor extrae'}`,
        celdas: [campoSelect(`b${i}`, p.bloqueado ? 'si' : 'no', SI_NO, { ancho: 's' }), campoNumero(`in${i}`, p.in, { ancho: 'xs' }), campoNumero(`out${i}`, p.out, { ancho: 'xs' }), campoSelect(`e${i}`, p.estado, ESTADOS_BUFFER, { ancho: 'm' })],
      })) }],
      pasos: r.pasos.map((p, i) => escapar(`T${i + 1}: ${p.texto} Buffer: [${p.buffer.map((x) => x ?? '·').join(' | ')}] → ${p.estado}.`)),
    };
  },
};

/* =================== U4 · Peterson =================== */

const textoAccion = (i, a) => ({ flag: `flag[${i}] = true`, turn: `turn = ${1 - i}`, entra: 'vuelve a evaluar el while', sc: 'ejecuta en la sección crítica', sale: `sale: flag[${i}] = false` }[a]);
const peterson = {
  id: 'peterson',
  unidad: 'u4',
  nombre: 'Traza de Peterson',
  descripcion: 'Seguí flag[0], flag[1], turn y quién está en la sección crítica.',
  generar: (rng) => sinc.generarPeterson(rng),
  enunciado: () => `<p>Dos procesos usan Peterson: <code>flag[i] = true; turn = j; while (flag[j] && turn == j);</code> sección crítica; <code>flag[i] = false;</code></p>
    <p class="ayuda">Al ejecutar <code>turn = j</code> el proceso evalúa enseguida el while: si la condición es falsa entra a la sección crítica; si es verdadera, espera. Al comienzo, ambas banderas están en false y turn no tiene valor.</p>`,
  construir(d) {
    const r = sinc.resolverPeterson(d);
    const TF = [['true', 'true'], ['false', 'false']];
    return {
      bloques: [{ tipo: 'tabla', titulo: 'Traza', encabezado: ['flag[0]', 'flag[1]', 'turn', 'En la SC'], filas: r.pasos.map((p, i) => ({
        etiqueta: `T${i + 1} · P${p.proceso}: ${textoAccion(p.proceso, p.accion)}`,
        celdas: [campoSelect(`f0${i}`, String(p.flag0), TF, { ancho: 's' }), campoSelect(`f1${i}`, String(p.flag1), TF, { ancho: 's' }), campoSelect(`t${i}`, p.turn === null ? '-' : String(p.turn), [['-', 'sin valor'], ['0', '0'], ['1', '1']], { ancho: 's' }), campoSelect(`sc${i}`, p.enSC, ['Nadie', 'P0', 'P1'], { ancho: 's' })],
      })) }],
      pasos: r.pasos.map((p, i) => escapar(`T${i + 1}: ${p.texto} → flag = [${p.flag0}, ${p.flag1}], turn = ${p.turn ?? '–'}, en la SC: ${p.enSC}${p.espera.length ? ` (espera ${p.espera.join(', ')})` : ''}.`)),
    };
  },
};

/* =================== U4 · Semáforos (vista propia) =================== */

const semaforos = {
  id: 'semaforos',
  unidad: 'u4',
  nombre: 'Semáforos: forzar un orden',
  descripcion: 'Escribí wait/signal y valores iniciales; la página prueba TODOS los intercalados posibles.',
  personalizado: true,
  generar(rng) {
    const g = sinc.generarOrdenSemaforos(rng);
    const sol = sinc.solucionOrden(g);
    return {
      enunciado: `Hay ${g.letras.length} procesos y cada uno imprime una letra (${g.letras.map((l, i) => `P${i + 1} imprime ${l}`).join(', ')}). Agregá semáforos para que la salida sea siempre ${g.orden.join('')}.`,
      programas: g.letras.map((l) => `print(${l})`),
      permitidas: [g.orden.join('')],
      solucion: sol,
      explicacion: `Se encadena con semáforos en 0: quien imprime ${g.orden[0]} arranca libre; cada proceso hace signal del semáforo que habilita al siguiente en el orden ${g.orden.join(' → ')}, y cada uno (salvo el primero) espera su semáforo antes de imprimir.`,
    };
  },
};

export const TIPOS = [amdahl, planificacion, buffer, peterson, semaforos, banquero, paginacion, segmentacion, baseLimite, ajuste, reemplazo, eat, buddy, asignacionMarcos, bloques, inodo, disco, rms];
export const tipoPorId = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
