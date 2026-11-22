// Cálculos cortos: Ley de Amdahl (U2), inodo y bloques (U6), RMS (U7).

/** Ley de Amdahl: S = 1 / ((1 − P) + P / N). */
export function resolverAmdahl({ P, N, tiempo }) {
  const S = 1 / ((1 - P) + P / N);
  return { S, limite: 1 / (1 - P), tiempoNuevo: tiempo ? tiempo / S : null };
}

export function generarAmdahl(rng = Math.random) {
  const P = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95][Math.floor(rng() * 7)];
  const N = [2, 4, 8, 16][Math.floor(rng() * 4)];
  return { P, N, tiempo: 10 * (5 + Math.floor(rng() * 20)) };
}

const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
/** Expresa una cantidad de bytes en la mayor unidad binaria exacta posible. */
export function formatoBytes(bytes) {
  let u = 0;
  let v = bytes;
  while (v >= 1024 && v % 1024 === 0 && u < UNIDADES.length - 1) { v /= 1024; u++; }
  return `${v} ${UNIDADES[u]}`;
}

/** Inodo UNIX: 12 directos + indirecto simple, doble y triple. */
export function resolverInodo({ bloque, puntero, directos = 12 }) {
  const ppb = bloque / puntero;
  const directa = directos * bloque;
  const simple = ppb * bloque;
  const doble = ppb ** 2 * bloque;
  const triple = ppb ** 3 * bloque;
  return { punterosPorBloque: ppb, directa, simple, doble, triple, total: directa + simple + doble + triple };
}

export function generarInodo(rng = Math.random) {
  const bloque = [1024, 2048, 4096, 8192][Math.floor(rng() * 4)];
  const puntero = [4, 8][Math.floor(rng() * 2)];
  return { bloque, puntero, directos: 12 };
}

/** Fragmentación interna al guardar un archivo en bloques de tamaño fijo. */
export function resolverBloques({ archivo, bloque }) {
  const cant = Math.ceil(archivo / bloque);
  return { bloques: cant, ocupado: cant * bloque, desperdicio: cant * bloque - archivo };
}

export function generarBloques(rng = Math.random) {
  const bloque = [512, 1024, 2048, 4096][Math.floor(rng() * 4)];
  let archivo = 100 + Math.floor(rng() * 20000);
  if (archivo % bloque === 0) archivo += 7;
  return { archivo, bloque };
}

/** Rate-Monotonic: Ui = ti / pi, cota N(2^(1/N) − 1). */
export function resolverRMS({ tareas }) {
  const N = tareas.length;
  const U = tareas.reduce((s, t) => s + t.t / t.p, 0);
  const cota = N * (2 ** (1 / N) - 1);
  const prioridades = [...tareas].sort((a, b) => a.p - b.p).map((t) => t.nombre);
  return { utilizaciones: tareas.map((t) => t.t / t.p), U, cota, garantizado: U <= cota, prioridades, edfFactible: U <= 1 };
}

export function generarRMS(rng = Math.random) {
  const N = 2 + Math.floor(rng() * 2);
  const nombres = ['T1', 'T2', 'T3'];
  const periodos = [5, 10, 20, 25, 40, 50];
  const usados = new Set();
  const tareas = [];
  while (tareas.length < N) {
    const p = periodos[Math.floor(rng() * periodos.length)];
    if (usados.has(p)) continue;
    usados.add(p);
    tareas.push({ nombre: nombres[tareas.length], p, t: Math.max(1, Math.floor(rng() * p * 0.45)) });
  }
  return { tareas };
}
