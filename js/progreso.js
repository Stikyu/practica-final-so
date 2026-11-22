// Progreso guardado en localStorage (sin login).
// Estructura:
// {
//   preguntas: { [id]: { respondidas, aciertos, ultimaCorrecta, fecha } },
//   ejercicios: { [tipo]: { intentos, perfectos } },
//   simulacros: [{ fecha, nota, porcentaje, total }]
// }

const CLAVE = 'so-final-progreso-v1';

function vacio() {
  return { preguntas: {}, ejercicios: {}, simulacros: [] };
}

export function leer() {
  try {
    const data = JSON.parse(localStorage.getItem(CLAVE));
    return data ? { ...vacio(), ...data } : vacio();
  } catch {
    return vacio();
  }
}

function guardar(data) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(data));
  } catch {
    /* modo privado o sin espacio: el progreso no se guarda */
  }
}

export function registrarRespuesta(id, correcta) {
  const data = leer();
  const p = data.preguntas[id] || { respondidas: 0, aciertos: 0 };
  p.respondidas++;
  if (correcta) p.aciertos++;
  p.ultimaCorrecta = correcta;
  p.fecha = Date.now();
  data.preguntas[id] = p;
  guardar(data);
}

export function registrarEjercicio(tipo, perfecto) {
  const data = leer();
  const e = data.ejercicios[tipo] || { intentos: 0, perfectos: 0 };
  e.intentos++;
  if (perfecto) e.perfectos++;
  data.ejercicios[tipo] = e;
  guardar(data);
}

export function registrarSimulacro(resultado) {
  const data = leer();
  data.simulacros.push({ fecha: Date.now(), ...resultado });
  data.simulacros = data.simulacros.slice(-20);
  guardar(data);
}

/** Ids de preguntas cuya última respuesta fue incorrecta. */
export function idsConError() {
  const data = leer();
  return Object.entries(data.preguntas).filter(([, p]) => p.ultimaCorrecta === false).map(([id]) => id);
}

export function borrarTodo() {
  guardar(vacio());
}

export function exportar() {
  return JSON.stringify(leer(), null, 2);
}

export function importar(texto) {
  const data = JSON.parse(texto);
  if (!data || typeof data.preguntas !== 'object') throw new Error('Formato inválido');
  guardar({ ...vacio(), ...data });
}
