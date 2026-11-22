// Reemplazo de páginas: FIFO, OPT, LRU y Reloj (segunda oportunidad).
// Los marcos son posiciones fijas: una página nueva ocupa el primer marco
// libre o el marco de la víctima (así lo dibuja la Unidad 5B).
//
// Convenciones:
//   OPT: si varias páginas no se vuelven a usar, se elige la que entró
//        primero (FIFO entre empatadas).
//   Reloj: al cargar o referenciar una página su bit R queda en 1. El
//        puntero solo avanza al buscar víctima: si R=1 lo pone en 0 y sigue;
//        si R=0 la reemplaza y el puntero queda en el marco siguiente.

export const ALGORITMOS_REEMPLAZO = {
  FIFO: 'FIFO',
  OPT: 'Óptimo (OPT)',
  LRU: 'LRU',
  RELOJ: 'Reloj (segunda oportunidad)',
};

export function resolverReemplazo({ algoritmo, referencias, marcos }) {
  const slots = Array(marcos).fill(null);
  const cargada = Array(marcos).fill(-1); // instante de carga (FIFO / desempate OPT)
  const usada = Array(marcos).fill(-1); // último uso (LRU)
  const bitR = Array(marcos).fill(0);
  let puntero = 0;
  const pasos = [];
  let fallos = 0;

  referencias.forEach((pag, t) => {
    const idx = slots.indexOf(pag);
    let fallo = false;
    let victima = null;
    let texto;
    if (idx >= 0) {
      usada[idx] = t;
      bitR[idx] = 1;
      texto = `Ref ${pag}: ya está en el marco ${idx + 1} → acierto.`;
      if (algoritmo === 'RELOJ') texto += ` Su bit R queda en 1.`;
    } else {
      fallo = true;
      fallos++;
      let destino = slots.indexOf(null);
      if (destino >= 0) {
        texto = `Ref ${pag}: no está → fallo. Hay un marco libre (marco ${destino + 1}).`;
      } else {
        if (algoritmo === 'FIFO') {
          destino = cargada.indexOf(Math.min(...cargada));
          texto = `Ref ${pag}: fallo. FIFO saca la más antigua en memoria: ${slots[destino]}.`;
        } else if (algoritmo === 'LRU') {
          destino = usada.indexOf(Math.min(...usada));
          texto = `Ref ${pag}: fallo. LRU saca la usada hace más tiempo: ${slots[destino]} (último uso en la ref. ${usada[destino] + 1}).`;
        } else if (algoritmo === 'OPT') {
          const proximo = slots.map((p) => {
            const k = referencias.indexOf(p, t + 1);
            return k < 0 ? Infinity : k;
          });
          const lejos = Math.max(...proximo);
          const candidatos = slots.map((_, i) => i).filter((i) => proximo[i] === lejos);
          destino = candidatos.sort((a, b) => cargada[a] - cargada[b])[0];
          const detalle = slots.map((p, i) => `${p}→${proximo[i] === Infinity ? 'no se usa más' : `ref. ${proximo[i] + 1}`}`).join(', ');
          texto = `Ref ${pag}: fallo. Próximo uso de cada una: ${detalle}. OPT saca ${slots[destino]}.`;
        } else if (algoritmo === 'RELOJ') {
          const vueltas = [];
          while (bitR[puntero] === 1) {
            vueltas.push(slots[puntero]);
            bitR[puntero] = 0;
            puntero = (puntero + 1) % marcos;
          }
          destino = puntero;
          texto = `Ref ${pag}: fallo. ${vueltas.length ? `Segunda oportunidad para ${vueltas.join(', ')} (R pasa a 0). ` : ''}El puntero encuentra R=0 en ${slots[destino]} → víctima.`;
        } else {
          throw new Error(`Algoritmo desconocido: ${algoritmo}`);
        }
        victima = slots[destino];
        if (algoritmo === 'RELOJ') puntero = (destino + 1) % marcos;
      }
      slots[destino] = pag;
      cargada[destino] = t;
      usada[destino] = t;
      bitR[destino] = 1;
    }
    pasos.push({ referencia: pag, marcos: [...slots], fallo, victima, bits: algoritmo === 'RELOJ' ? [...bitR] : null, texto });
  });
  return { pasos, fallos, aciertos: referencias.length - fallos };
}

export function generarReemplazo(rng = Math.random, algoritmo) {
  const algs = Object.keys(ALGORITMOS_REEMPLAZO);
  const alg = algoritmo || algs[Math.floor(rng() * algs.length)];
  const largo = 12 + Math.floor(rng() * 5);
  const distintas = 5 + Math.floor(rng() * 3);
  const referencias = [];
  for (let i = 0; i < largo; i++) {
    // Algo de localidad: a veces repite una página reciente.
    if (referencias.length > 2 && rng() < 0.35) {
      referencias.push(referencias[referencias.length - 1 - Math.floor(rng() * 3)]);
    } else {
      referencias.push(Math.floor(rng() * distintas));
    }
  }
  return { algoritmo: alg, referencias, marcos: 3 + Math.floor(rng() * 2) };
}
