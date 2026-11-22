// Planificación de disco: FCFS, SSTF, SCAN, C-SCAN, LOOK y C-LOOK.
// Convenciones:
//   SSTF: si dos pedidos están a la misma distancia, va al de cilindro menor.
//   SCAN y C-SCAN llegan hasta el extremo del disco (0 o maxCilindro) solo si
//   después tienen que seguir atendiendo pedidos del otro lado.
//   C-SCAN y C-LOOK: el salto de vuelta se suma al total, pero también se
//   informa el total sin contarlo (hay cátedras que no lo suman).

export const ALGORITMOS_DISCO = {
  FCFS: 'FCFS',
  SSTF: 'SSTF',
  SCAN: 'SCAN (ascensor)',
  CSCAN: 'C-SCAN',
  LOOK: 'LOOK',
  CLOOK: 'C-LOOK',
};

/** Devuelve las paradas del cabezal: pedidos atendidos, extremos y saltos. */
function paradas({ algoritmo, cola, cabeza, direccion, maxCilindro }) {
  const pedido = (pos, salto = false) => ({ pos, tipo: 'pedido', salto });
  if (algoritmo === 'FCFS') return cola.map((c) => pedido(c));
  if (algoritmo === 'SSTF') {
    const pend = [...cola];
    const res = [];
    let pos = cabeza;
    while (pend.length) {
      pend.sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos) || a - b);
      pos = pend.shift();
      res.push(pedido(pos));
    }
    return res;
  }
  const subir = direccion === 'arriba';
  const asc = (a, b) => a - b;
  const desc = (a, b) => b - a;
  const adelante = cola.filter((c) => (subir ? c >= cabeza : c <= cabeza)).sort(subir ? asc : desc);
  const atras = cola.filter((c) => !adelante.includes(c));
  const extremo = subir ? maxCilindro : 0;
  const otroExtremo = subir ? 0 : maxCilindro;
  const res = adelante.map((c) => pedido(c));
  if (!atras.length) return res;
  if (algoritmo === 'SCAN') {
    res.push({ pos: extremo, tipo: 'extremo' });
    atras.sort(subir ? desc : asc).forEach((c) => res.push(pedido(c)));
  } else if (algoritmo === 'LOOK') {
    atras.sort(subir ? desc : asc).forEach((c) => res.push(pedido(c)));
  } else if (algoritmo === 'CSCAN') {
    res.push({ pos: extremo, tipo: 'extremo' });
    res.push({ pos: otroExtremo, tipo: 'salto' });
    atras.sort(subir ? asc : desc).forEach((c) => res.push(pedido(c)));
  } else if (algoritmo === 'CLOOK') {
    atras.sort(subir ? asc : desc).forEach((c, i) => res.push(pedido(c, i === 0)));
  } else {
    throw new Error(`Algoritmo desconocido: ${algoritmo}`);
  }
  return res;
}

export function resolverDisco(datos) {
  const d = { direccion: 'arriba', maxCilindro: 199, ...datos };
  const lista = paradas(d);
  let pos = d.cabeza;
  let total = 0;
  let saltoRetorno = 0;
  const pasos = [];
  const recorrido = [pos];
  for (const p of lista) {
    const dist = Math.abs(p.pos - pos);
    total += dist;
    let nota = '';
    if (p.tipo === 'extremo') nota = 'llega al extremo del disco sin atender';
    if (p.tipo === 'salto' || p.salto) { saltoRetorno += dist; nota = p.tipo === 'salto' ? 'salto de retorno al otro extremo' : 'salto de retorno directo al primer pedido'; }
    if (d.algoritmo === 'SSTF') nota = 'el pendiente más cercano';
    pasos.push(`${pos} → ${p.pos}: ${dist} cilindros${nota ? ` (${nota})` : ''}. Acumulado: ${total}.`);
    recorrido.push(p.pos);
    pos = p.pos;
  }
  return {
    orden: lista.filter((p) => p.tipo === 'pedido').map((p) => p.pos),
    recorrido,
    total,
    totalSinRetorno: total - saltoRetorno,
    saltoRetorno,
    pasos,
  };
}

export function generarDisco(rng = Math.random) {
  const algs = Object.keys(ALGORITMOS_DISCO);
  for (;;) {
    const cola = [];
    while (cola.length < 7) {
      const c = Math.floor(rng() * 200);
      if (!cola.includes(c)) cola.push(c);
    }
    let cabeza = Math.floor(rng() * 200);
    while (cola.includes(cabeza)) cabeza = Math.floor(rng() * 200);
    // Evita empates en SSTF para que la respuesta sea única.
    let empate = false;
    let pos = cabeza;
    const pend = [...cola];
    while (pend.length) {
      pend.sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos));
      if (pend.length > 1 && Math.abs(pend[0] - pos) === Math.abs(pend[1] - pos)) empate = true;
      pos = pend.shift();
    }
    if (!empate) {
      return { algoritmo: algs[Math.floor(rng() * algs.length)], cola, cabeza, direccion: rng() < 0.5 ? 'arriba' : 'abajo', maxCilindro: 199 };
    }
  }
}
