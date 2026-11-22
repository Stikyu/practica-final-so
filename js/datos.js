// Carga de los archivos de datos (con caché en memoria).

const cache = new Map();

async function cargar(ruta) {
  if (!cache.has(ruta)) {
    cache.set(ruta, fetch(ruta).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(ruta);
}

export async function unidades() {
  return (await cargar('data/unidades.json')).unidades;
}

export async function preguntas() {
  const us = await unidades();
  const listas = await Promise.all(us.map((u) => cargar(`data/preguntas/${u.id}.json`)));
  return listas.flatMap((l) => l.preguntas);
}

export async function ejercicios() {
  return (await cargar('data/ejercicios.json')).ejercicios;
}

export async function teoria() {
  return (await cargar('data/teoria.json')).unidades;
}
