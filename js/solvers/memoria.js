// Memoria (Unidad 5): paginación, segmentación, base/límite, asignación
// contigua, Buddy System, asignación de marcos y tiempo de acceso efectivo.

const pot2 = (k) => 2 ** k;
const bin = (x, bits) => x.toString(2).padStart(bits, '0');

/** Paginación con m bits de dirección lógica y páginas de 2^n bytes. */
export function resolverPaginacion({ m, n, memoriaFisica, tabla, direcciones }) {
  const tam = pot2(n);
  const res = {
    direccionesLogicas: pot2(m),
    rangoMax: pot2(m) - 1,
    tamPagina: tam,
    cantPaginas: pot2(m - n),
    cantMarcos: Math.floor(memoriaFisica / tam),
    bitsP: m - n,
    bitsD: n,
  };
  res.traducciones = direcciones.map((dir) => {
    const p = Math.floor(dir / tam);
    const d = dir % tam;
    const marco = tabla[p];
    const fisica = marco * tam + d;
    const b = bin(dir, m);
    return {
      logica: dir,
      binario: `${b.slice(0, m - n) || '–'} | ${b.slice(m - n)}`,
      p, d, marco, fisica,
      texto: `${dir} = (${b.slice(0, m - n)} | ${b.slice(m - n)})₂ → p = ${p}, d = ${d} → marco ${marco} → (${marco} × ${tam}) + ${d} = ${fisica}`,
    };
  });
  return res;
}

export function generarPaginacion(rng = Math.random) {
  const n = 2 + Math.floor(rng() * 2); // páginas de 4 u 8 bytes
  const m = n + 2 + Math.floor(rng() * 2); // 4 u 8 páginas
  const paginas = pot2(m - n);
  const marcos = paginas * 2;
  const libres = [...Array(marcos).keys()];
  const tabla = [];
  for (let i = 0; i < paginas; i++) tabla.push(libres.splice(Math.floor(rng() * libres.length), 1)[0]);
  const direcciones = new Set();
  while (direcciones.size < 6) direcciones.add(Math.floor(rng() * pot2(m)));
  return { m, n, memoriaFisica: marcos * pot2(n), tabla, direcciones: [...direcciones].sort((a, b) => a - b) };
}

/** Segmentación: tabla [{base, limite}] y referencias [{s, d}]. */
export function resolverSegmentacion({ tabla, referencias }) {
  return referencias.map(({ s, d }) => {
    const seg = tabla[s];
    if (!seg) return { s, d, valida: false, fisica: null, texto: `El segmento ${s} no existe → trap.` };
    if (d >= seg.limite) {
      return { s, d, valida: false, fisica: null, texto: `Segmento ${s}: d = ${d} ≥ límite ${seg.limite} → trap (direccionamiento fuera del segmento).` };
    }
    return { s, d, valida: true, fisica: seg.base + d, texto: `Segmento ${s}: 0 ≤ ${d} < ${seg.limite} ✓ → física = base + d = ${seg.base} + ${d} = ${seg.base + d}.` };
  });
}

export function generarSegmentacion(rng = Math.random) {
  const tabla = [];
  let base = 100 * (5 + Math.floor(rng() * 10));
  for (let i = 0; i < 5; i++) {
    const limite = 100 * (2 + Math.floor(rng() * 10));
    tabla.push({ limite, base });
    base += limite + 100 * Math.floor(rng() * 8);
  }
  const referencias = [];
  for (let i = 0; i < 5; i++) {
    const s = Math.floor(rng() * 5);
    const fuera = rng() < 0.3;
    const d = fuera ? tabla[s].limite + Math.floor(rng() * 300) : Math.floor(rng() * tabla[s].limite);
    referencias.push({ s, d });
  }
  return { tabla, referencias };
}

/** Protección con registros base y límite. */
export function resolverBaseLimite({ base, limite, direcciones }) {
  const ultima = base + limite - 1;
  return {
    ultima,
    resultados: direcciones.map((dir) => {
      const legal = dir >= base && dir < base + limite;
      return { dir, legal, texto: `${base} ≤ ${dir} < ${base + limite}? ${legal ? 'Sí → acceso permitido.' : 'No → trap al SO (direccionamiento ilegal).'}` };
    }),
  };
}

export function generarBaseLimite(rng = Math.random) {
  const base = 1000 * (10 + Math.floor(rng() * 400)) + 10 * Math.floor(rng() * 100);
  const limite = 1000 * (20 + Math.floor(rng() * 200)) + 100 * Math.floor(rng() * 10);
  const direcciones = [base - 1 - Math.floor(rng() * 50), base, base + Math.floor(rng() * limite), base + limite - 1, base + limite];
  return { base, limite, direcciones: direcciones.sort(() => rng() - 0.5) };
}

/** Asignación contigua: first-fit, best-fit y worst-fit sobre una lista de huecos. */
export function resolverAjuste({ huecos, solicitudes, estrategia }) {
  const libres = [...huecos];
  const pasos = [];
  const asignaciones = solicitudes.map((tam) => {
    const aptos = libres.map((h, i) => ({ h, i })).filter((x) => x.h >= tam);
    let elegido = null;
    if (aptos.length) {
      if (estrategia === 'first') elegido = aptos[0];
      else if (estrategia === 'best') elegido = aptos.reduce((a, b) => (b.h < a.h ? b : a));
      else elegido = aptos.reduce((a, b) => (b.h > a.h ? b : a));
    }
    const antes = libres.join(', ');
    if (!elegido) {
      pasos.push(`Solicitud de ${tam}: huecos [${antes}]. Ningún hueco alcanza → debe esperar.`);
      return { tam, hueco: null };
    }
    libres[elegido.i] -= tam;
    pasos.push(`Solicitud de ${tam}: huecos [${antes}]. Se usa el hueco ${elegido.i + 1} (${elegido.h}); quedan ${libres[elegido.i]}.`);
    return { tam, hueco: elegido.i + 1 };
  });
  return { asignaciones, restantes: libres, pasos };
}

export function generarAjuste(rng = Math.random) {
  const estrategias = ['first', 'best', 'worst'];
  const huecos = Array.from({ length: 5 }, () => 50 * (2 + Math.floor(rng() * 12)));
  const solicitudes = Array.from({ length: 4 }, () => 10 * (5 + Math.floor(rng() * 45)));
  return { huecos, solicitudes, estrategia: estrategias[Math.floor(rng() * 3)] };
}

/** Buddy System: bloque de 2^k que contiene la solicitud. */
export function resolverBuddy({ segmento, solicitud }) {
  let bloque = 1;
  while (bloque < solicitud) bloque *= 2;
  const divisiones = [];
  let actual = segmento;
  while (actual > bloque) {
    divisiones.push(`${actual} → 2 × ${actual / 2}`);
    actual /= 2;
  }
  return { bloque, cantDivisiones: divisiones.length, fragInterna: bloque - solicitud, divisiones };
}

export function generarBuddy(rng = Math.random) {
  const segmento = [128, 256, 512, 1024][Math.floor(rng() * 4)];
  const solicitud = 3 + Math.floor(rng() * (segmento / 2 - 3));
  return { segmento, solicitud };
}

/** Asignación de marcos equitativa y proporcional (hoja de estudio, 2.14). */
export function resolverAsignacionMarcos({ marcos, tamanos }) {
  const S = tamanos.reduce((a, b) => a + b, 0);
  const equitativa = Math.floor(marcos / tamanos.length);
  return {
    S,
    equitativa,
    sobranEquitativa: marcos - equitativa * tamanos.length,
    proporcional: tamanos.map((s) => Math.floor((s / S) * marcos)),
    exactos: tamanos.map((s) => (s / S) * marcos),
  };
}

export function generarAsignacionMarcos(rng = Math.random) {
  const k = 2 + Math.floor(rng() * 2);
  return { marcos: 30 + Math.floor(rng() * 100), tamanos: Array.from({ length: k }, () => 5 + Math.floor(rng() * 150)) };
}

/** Tiempo de acceso efectivo con paginación bajo demanda. */
export function resolverEAT({ p, tMem, tFallo }) {
  const eat = (1 - p) * tMem + p * tFallo;
  return { eat, factor: eat / tMem, pMax10: (0.1 * tMem) / (tFallo - tMem) };
}

export function generarEAT(rng = Math.random) {
  const opciones = [0.001, 0.002, 0.005, 0.0001, 0.0005, 0.01, 0.02];
  return { p: opciones[Math.floor(rng() * opciones.length)], tMem: [100, 150, 200][Math.floor(rng() * 3)], tFallo: [8000000, 5000000, 10000000][Math.floor(rng() * 3)] };
}
