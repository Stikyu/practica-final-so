// Algoritmo del banquero (evasión de interbloqueos).
// Need = Max − Allocation. El estado es seguro si existe una secuencia en la
// que todos los procesos pueden terminar con lo disponible.

const menorIgual = (a, b) => a.every((x, i) => x <= b[i]);
const sumar = (a, b) => a.map((x, i) => x + b[i]);

export function calcularNeed(max, asignado) {
  return max.map((fila, i) => fila.map((x, j) => x - asignado[i][j]));
}

/** Algoritmo de seguridad. Recorre los procesos en orden circular. */
export function algoritmoSeguridad({ disponible, max, asignado, nombres }) {
  const n = max.length;
  const need = calcularNeed(max, asignado);
  const nom = nombres || max.map((_, i) => `P${i}`);
  let work = [...disponible];
  const termino = Array(n).fill(false);
  const secuencia = [];
  const pasos = [`Work = Disponible = (${work.join(', ')}).`];
  let i = 0;
  let sinAvance = 0;
  while (secuencia.length < n && sinAvance < n) {
    if (!termino[i] && menorIgual(need[i], work)) {
      const antes = work;
      work = sumar(work, asignado[i]);
      termino[i] = true;
      secuencia.push(nom[i]);
      pasos.push(`${nom[i]}: Need (${need[i].join(', ')}) ≤ Work (${antes.join(', ')}) ✓ → termina y devuelve (${asignado[i].join(', ')}). Work = (${work.join(', ')}).`);
      sinAvance = 0;
    } else {
      if (!termino[i]) pasos.push(`${nom[i]}: Need (${need[i].join(', ')}) no entra en Work (${work.join(', ')}) → espera.`);
      sinAvance++;
    }
    i = (i + 1) % n;
  }
  const seguro = secuencia.length === n;
  pasos.push(seguro
    ? `Todos pueden terminar → estado SEGURO. Secuencia: ⟨${secuencia.join(', ')}⟩.`
    : `Ningún proceso pendiente puede avanzar → estado INSEGURO.`);
  // Limpiamos los "espera" repetidos para que el paso a paso sea legible.
  return { need, seguro, secuencia, pasos: pasos.filter((p, k) => pasos.indexOf(p) === k) };
}

/** Valida una secuencia propuesta por el alumno (cualquier secuencia segura vale). */
export function validarSecuencia({ disponible, max, asignado, nombres }, propuesta) {
  const nom = nombres || max.map((_, i) => `P${i}`);
  const need = calcularNeed(max, asignado);
  if (propuesta.length !== nom.length) return false;
  let work = [...disponible];
  const usados = new Set();
  for (const nombre of propuesta) {
    const i = nom.findIndex((x) => x.toUpperCase() === nombre.toUpperCase());
    if (i < 0 || usados.has(i) || !menorIgual(need[i], work)) return false;
    usados.add(i);
    work = sumar(work, asignado[i]);
  }
  return true;
}

/** Evalúa una solicitud de recursos de un proceso. */
export function evaluarSolicitud(estado, proceso, solicitud) {
  const need = calcularNeed(estado.max, estado.asignado);
  if (!menorIgual(solicitud, need[proceso])) return { concede: false, motivo: 'La solicitud supera lo que declaró como máximo (Request > Need).' };
  if (!menorIgual(solicitud, estado.disponible)) return { concede: false, motivo: 'No hay recursos disponibles suficientes: debe esperar.' };
  const nuevo = {
    ...estado,
    disponible: estado.disponible.map((x, j) => x - solicitud[j]),
    asignado: estado.asignado.map((fila, i) => (i === proceso ? fila.map((x, j) => x + solicitud[j]) : fila)),
  };
  const r = algoritmoSeguridad(nuevo);
  return { concede: r.seguro, motivo: r.seguro ? 'Simulando la asignación el estado sigue siendo seguro.' : 'Simulando la asignación el estado queda inseguro: se rechaza.', simulacion: r, nuevo };
}

export function generarBanquero(rng = Math.random) {
  const n = 4 + Math.floor(rng() * 2);
  const m = 3;
  const total = Array.from({ length: m }, () => 6 + Math.floor(rng() * 6));
  const max = [];
  const asignado = [];
  const libre = [...total];
  for (let i = 0; i < n; i++) {
    const filaMax = total.map((t) => 1 + Math.floor(rng() * Math.min(t, 7)));
    const filaAsig = filaMax.map((mx, j) => {
      const a = Math.min(libre[j], Math.floor(rng() * (mx + 1)));
      libre[j] -= a;
      return a;
    });
    max.push(filaMax);
    asignado.push(filaAsig);
  }
  return { recursos: ['A', 'B', 'C'], disponible: libre, max, asignado };
}
