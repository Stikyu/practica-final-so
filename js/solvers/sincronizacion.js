// Sincronización (Unidad 4): buffer circular productor/consumidor, traza de
// Peterson y verificador de semáforos por exploración de intercalados.

/* ---------- Buffer circular (versión con in/out que desperdicia un lugar) ---------- */

/**
 * ops: lista de intentos, p. ej. [{tipo:'P', item:'A'}, {tipo:'C'}].
 * Productor: si ((in+1) % N == out) se bloquea; si no, buffer[in]=item; in=(in+1)%N.
 * Consumidor: si (in == out) se bloquea; si no, lee buffer[out]; out=(out+1)%N.
 */
export function resolverBuffer({ tam, ops }) {
  let inn = 0;
  let out = 0;
  const buf = Array(tam).fill(null);
  const pasos = ops.map((op) => {
    let bloqueado = false;
    let texto;
    if (op.tipo === 'P') {
      const sig = (inn + 1) % tam;
      if (sig === out) {
        bloqueado = true;
        texto = `Productor intenta '${op.item}': (in+1) % ${tam} = ${sig} == out → LLENO, se bloquea. in no se mueve.`;
      } else {
        buf[inn] = op.item;
        texto = `Productor guarda '${op.item}' en buffer[${inn}]; in = (${inn}+1) % ${tam} = ${sig}.`;
        inn = sig;
      }
    } else {
      if (inn === out) {
        bloqueado = true;
        texto = `Consumidor intenta extraer: in == out (${inn}) → VACÍO, se bloquea.`;
      } else {
        const item = buf[out];
        buf[out] = null;
        const sig = (out + 1) % tam;
        texto = `Consumidor extrae '${item}' de buffer[${out}]; out = (${out}+1) % ${tam} = ${sig}.`;
        out = sig;
      }
    }
    const lleno = (inn + 1) % tam === out;
    const vacio = inn === out;
    return { op, bloqueado, in: inn, out, lleno, vacio, estado: vacio ? 'Vacío' : lleno ? 'Lleno' : 'Ni lleno ni vacío', buffer: [...buf], texto };
  });
  return { pasos };
}

export function generarBuffer(rng = Math.random) {
  const tam = 3 + Math.floor(rng() * 2);
  const ops = [];
  let letra = 0;
  for (let i = 0; i < 10; i++) {
    if (rng() < 0.55) ops.push({ tipo: 'P', item: String.fromCharCode(65 + letra++) });
    else ops.push({ tipo: 'C' });
  }
  // Un intento bloqueado se reintenta con el mismo ítem.
  const r = resolverBuffer({ tam, ops });
  r.pasos.forEach((p, i) => {
    if (p.bloqueado && p.op.tipo === 'P') {
      for (let j = i + 1; j < ops.length; j++) {
        if (ops[j].tipo === 'P') { ops[j] = { tipo: 'P', item: p.op.item }; break; }
      }
    }
  });
  // Re-etiqueta para que las letras queden en orden de aparición.
  const mapa = {};
  let k = 0;
  ops.forEach((o) => { if (o.tipo === 'P') { if (!(o.item in mapa)) mapa[o.item] = String.fromCharCode(65 + k++); o.item = mapa[o.item]; } });
  return { tam, ops };
}

/* ---------- Peterson ---------- */
// Acciones de cada proceso i (j = 1 - i):
//   'flag'  → flag[i] = true
//   'turn'  → turn = j y evalúa el while: si (flag[j] && turn == j) espera; si no, entra a la SC.
//   'entra' → reevalúa el while (estaba esperando); entra si la condición es falsa.
//   'sc'    → ejecuta dentro de la sección crítica.
//   'sale'  → flag[i] = false (sección de salida).

export function resolverPeterson({ eventos }) {
  const flag = [false, false];
  let turn = null;
  const estado = ['resto', 'resto']; // resto | quiere | espera | sc
  const pasos = eventos.map(({ proceso: i, accion }) => {
    const j = 1 - i;
    let texto;
    const cond = () => flag[j] && turn === j;
    if (accion === 'flag') {
      flag[i] = true;
      estado[i] = 'quiere';
      texto = `P${i} levanta su bandera: flag[${i}] = true.`;
    } else if (accion === 'turn' || accion === 'entra') {
      if (accion === 'turn') turn = j;
      const c = cond();
      const prefijo = accion === 'turn' ? `P${i} cede el turno: turn = ${j}. ` : `P${i} reevalúa el while. `;
      if (c) { estado[i] = 'espera'; texto = `${prefijo}flag[${j}] && turn == ${j} es verdadero → P${i} espera.`; } else { estado[i] = 'sc'; texto = `${prefijo}La condición es falsa → P${i} entra a la sección crítica.`; }
    } else if (accion === 'sc') {
      texto = `P${i} ejecuta dentro de la sección crítica.`;
    } else if (accion === 'sale') {
      flag[i] = false;
      estado[i] = 'resto';
      texto = `P${i} sale: flag[${i}] = false.${estado[j] === 'espera' ? ` La condición de P${j} pasa a falsa: podrá entrar cuando vuelva a ejecutar.` : ''}`;
    } else {
      throw new Error(`Acción desconocida: ${accion}`);
    }
    const enSC = estado[0] === 'sc' ? 'P0' : estado[1] === 'sc' ? 'P1' : 'Nadie';
    if (estado[0] === 'sc' && estado[1] === 'sc') throw new Error('Violación de exclusión mutua');
    return { proceso: i, accion, flag0: flag[0], flag1: flag[1], turn, enSC, espera: estado.map((e, k) => (e === 'espera' ? `P${k}` : null)).filter(Boolean), texto };
  });
  return { pasos };
}

export function generarPeterson(rng = Math.random) {
  const pc = [0, 0]; // 0: flag, 1: turn, 2: (espera o sc), 3: sale
  const flag = [false, false];
  let turn = null;
  const espera = [false, false];
  const enSC = [false, false];
  const eventos = [];
  while (eventos.length < 10) {
    const i = rng() < 0.5 ? 0 : 1;
    const j = 1 - i;
    if (pc[i] === 0) { flag[i] = true; pc[i] = 1; eventos.push({ proceso: i, accion: 'flag' }); }
    else if (pc[i] === 1 || (pc[i] === 2 && espera[i])) {
      const accion = pc[i] === 1 ? 'turn' : 'entra';
      if (accion === 'turn') turn = j;
      if (flag[j] && turn === j) espera[i] = true; else { espera[i] = false; enSC[i] = true; }
      pc[i] = 2;
      eventos.push({ proceso: i, accion });
    } else if (pc[i] === 2 && enSC[i]) {
      if (rng() < 0.4) eventos.push({ proceso: i, accion: 'sc' });
      else { flag[i] = false; enSC[i] = false; pc[i] = 0; eventos.push({ proceso: i, accion: 'sale' }); }
    }
  }
  return { eventos };
}

/* ---------- Semáforos: verificador por exploración exhaustiva ---------- */

/** Parsea un programa simple: una instrucción por línea. */
export function parsearProceso(texto) {
  const ops = [];
  const errores = [];
  texto.split(/\n|;/).map((l) => l.trim()).filter(Boolean).forEach((linea) => {
    let m;
    if ((m = linea.match(/^(wait|P)\s*\(\s*(\w+)\s*\)$/i))) ops.push({ op: 'wait', s: m[2] });
    else if ((m = linea.match(/^(signal|V)\s*\(\s*(\w+)\s*\)$/i))) ops.push({ op: 'signal', s: m[2] });
    else if ((m = linea.match(/^(printf?|print|imprimir)\s*\(\s*["']?([^"')]+?)["']?\s*\)$/i))) ops.push({ op: 'print', v: m[2] });
    else errores.push(`No entiendo la instrucción: "${linea}"`);
  });
  return { ops, errores };
}

export function parsearIniciales(texto) {
  const valores = {};
  const errores = [];
  texto.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).forEach((par) => {
    const m = par.match(/^(\w+)\s*=\s*(\d+)$/);
    if (m) valores[m[1]] = Number(m[2]); else errores.push(`Valor inicial inválido: "${par}"`);
  });
  return { valores, errores };
}

/**
 * Explora todos los intercalados posibles. Devuelve las salidas finales
 * posibles y si existe algún intercalado que termina en deadlock.
 */
export function explorarSemaforos(procesos, iniciales, limite = 200000) {
  const nombres = [...new Set([...Object.keys(iniciales), ...procesos.flatMap((p) => p.filter((o) => o.s).map((o) => o.s))])];
  const idx = Object.fromEntries(nombres.map((n, i) => [n, i]));
  const salidas = new Set();
  const deadlocks = new Set();
  const visitados = new Set();
  let estados = 0;
  const sep = procesos.flat().some((o) => o.op === 'print' && o.v.length > 1) ? ' ' : '';
  const pila = [{ pcs: procesos.map(() => 0), sems: nombres.map((n) => iniciales[n] ?? 0), out: [] }];
  while (pila.length) {
    const st = pila.pop();
    const clave = `${st.pcs}|${st.sems}|${st.out.join('\u0001')}`;
    if (visitados.has(clave)) continue;
    visitados.add(clave);
    if (++estados > limite) return { salidas: [...salidas], deadlocks: [...deadlocks], incompleto: true, sinInicializar: nombres.filter((n) => !(n in iniciales)) };
    let alguno = false;
    let todosTerminaron = true;
    procesos.forEach((prog, i) => {
      if (st.pcs[i] >= prog.length) return;
      todosTerminaron = false;
      const ins = prog[st.pcs[i]];
      const pcs = [...st.pcs];
      pcs[i]++;
      if (ins.op === 'wait') {
        const k = idx[ins.s];
        if (st.sems[k] <= 0) return; // bloqueado
        const sems = [...st.sems];
        sems[k]--;
        pila.push({ pcs, sems, out: st.out });
      } else if (ins.op === 'signal') {
        const sems = [...st.sems];
        sems[idx[ins.s]]++;
        pila.push({ pcs, sems, out: st.out });
      } else {
        pila.push({ pcs, sems: st.sems, out: [...st.out, ins.v] });
      }
      alguno = true;
    });
    if (todosTerminaron) salidas.add(st.out.join(sep));
    else if (!alguno) deadlocks.add(st.out.join(sep) || '(nada impreso)');
  }
  return { salidas: [...salidas].sort(), deadlocks: [...deadlocks].sort(), incompleto: false, sinInicializar: nombres.filter((n) => !(n in iniciales)) };
}

/** Verifica una solución contra las salidas permitidas. */
export function verificarSemaforos(procesos, iniciales, permitidas) {
  const r = explorarSemaforos(procesos, iniciales);
  const prohibidas = r.salidas.filter((s) => !permitidas.includes(s));
  const correcta = !r.incompleto && r.deadlocks.length === 0 && prohibidas.length === 0 && r.salidas.length > 0;
  return { ...r, prohibidas, correcta };
}

/** Ejercicio generado: k procesos que imprimen una letra cada uno en un orden pedido. */
export function generarOrdenSemaforos(rng = Math.random) {
  const k = 3 + Math.floor(rng() * 2);
  const letras = 'ABCD'.slice(0, k).split('');
  const orden = [...letras].sort(() => rng() - 0.5);
  return { letras, orden };
}

/** Solución modelo para el ejercicio generado: una cadena de semáforos. */
export function solucionOrden({ letras, orden }) {
  // El proceso que imprime orden[i] espera S_i y al terminar habilita S_{i+1}.
  const programas = letras.map((letra) => {
    const pos = orden.indexOf(letra);
    const lineas = [];
    if (pos > 0) lineas.push(`wait(S${pos})`);
    lineas.push(`print(${letra})`);
    if (pos < orden.length - 1) lineas.push(`signal(S${pos + 1})`);
    return lineas.join('\n');
  });
  const iniciales = orden.slice(1).map((_, i) => `S${i + 1}=0`).join(', ');
  return { programas, iniciales };
}
