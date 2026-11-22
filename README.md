# Práctica para el final de Sistemas Operativos

Sitio estático para practicar el final de Sistemas Operativos (UTN San Nicolás) con preguntas, ejercicios interactivos y resúmenes de teoría. Todo el contenido sale del material de la cátedra y cada pregunta cita archivo y página.

**Demo:** https://stikyu.github.io/practica-final-so/

## Qué tiene

- **Multiple choice**: 218 preguntas de las 7 unidades. Se puede elegir por unidad o todas mezcladas, y la cantidad (10, 20, 50 o todas). Las preguntas y las opciones salen en orden aleatorio. Al responder se ve si estuvo bien, cuál era la correcta, la explicación y la fuente.
- **Simulacro de final**: cantidad de preguntas y minutos configurables (por defecto 40 preguntas en 60 minutos). No hay feedback hasta el final; ahí se ven la nota sobre 10, el porcentaje, los aciertos por unidad y la revisión de cada pregunta.
- **Ejercicios interactivos** (18 tipos, 36 ejercicios del material más un generador aleatorio en cada tipo). Todos tienen **Corregir** y **Ver resolución paso a paso**:
  - U2: Ley de Amdahl.
  - U3: planificación de CPU (FCFS, SJF, SRTF, Round Robin, prioridades y prioridades con RR). Se completa el Gantt y los tiempos Tf, T, E e I.
  - U4: buffer circular productor/consumidor, traza de Peterson, banquero (Need, estado seguro, secuencia segura, solicitudes) y semáforos. En semáforos escribís `wait`/`signal` y la página prueba **todos** los intercalados posibles.
  - U5: paginación, segmentación, base y límite, first/best/worst-fit, reemplazo de páginas (FIFO, OPT, LRU, Reloj), EAT, Buddy System y asignación de marcos.
  - U6: fragmentación en bloques, capacidad del inodo y planificación de disco (FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK).
  - U7: Rate-Monotonic.
- **Progreso** guardado en `localStorage`, sin login: preguntas respondidas, aciertos por unidad, modo **Repasar mis errores** y pantalla de **estadísticas**. El progreso se puede exportar e importar.
- **Teoría**: un resumen por unidad, con la fuente de cada sección.
- Modo oscuro (automático o manual), adaptado a celular y sin dependencias externas.

## Cómo correrlo localmente

Los datos se cargan con `fetch`, así que hace falta un servidor local; abrir `index.html` con doble clic no funciona. Cualquiera de estas opciones sirve:

```bash
# Python (viene con casi todo)
python -m http.server 8000

# o Node
npx serve .
```

Después, abrí http://localhost:8000.

Para verificar el contenido y los correctores (Node 18 o más nuevo, sin instalar nada):

```bash
npm test
```

## Cómo subirlo a GitHub Pages

El repo ya trae el workflow `.github/workflows/deploy.yml`, que en cada push a `main` corre los tests y publica el sitio.

1. Subí el repo a GitHub.
2. En **Settings → Pages → Build and deployment**, elegí **Source: GitHub Actions**.
3. Hacé push a `main`. En la pestaña **Actions** se ve el deploy; al terminar, el sitio queda en `https://<usuario>.github.io/<repo>/`.

Si no querés usar Actions, también funciona con **Source: Deploy from a branch** (rama `main`, carpeta `/`), porque el sitio no necesita build.

## Cómo agregar preguntas

Las preguntas están en `data/preguntas/u1.json` … `u7.json`, un archivo por unidad. Para agregar una, copiá un objeto de la lista `preguntas` y cambiale los datos:

```json
{
  "id": "u3-030",
  "unidad": "u3",
  "tema": "Round Robin",
  "tipo": "unica",
  "enunciado": "¿Qué pasa si el quantum es muy chico?",
  "opciones": ["Se vuelve FCFS", "El cambio de contexto consume mucha CPU", "Hay inanición", "Nada"],
  "correcta": 1,
  "explicacion": "Con q muy chico, el costo del cambio de contexto consume un porcentaje inaceptable de la CPU.",
  "fuente": { "archivo": "Unidad 3b.pdf", "pagina": 18 },
  "origen": "generada",
  "estado": "verificada"
}
```

| Campo | Qué va |
|---|---|
| `id` | Único en todo el sitio. Convención: `u<unidad>-<número>`. |
| `unidad` | `u1` … `u7`; tiene que coincidir con el archivo. |
| `tema` | Etiqueta corta que se muestra arriba de la pregunta. |
| `tipo` | `unica` (una correcta), `multiple` (varias correctas) o `vf` (verdadero/falso). |
| `opciones` | Lista de textos. En `vf` usá `["Verdadero", "Falso"]`. |
| `correcta` | Índice de la correcta, empezando en 0. En `multiple`, una lista: `[0, 2]`. |
| `explicacion` | Por qué la correcta es correcta. |
| `fuente` | `archivo` tal como figura en `data/unidades.json → archivos` y `pagina` (o `null`). |
| `origen` | `original` si la pregunta está en el material o `generada` si se escribió a partir de la teoría. |
| `estado` | `verificada` si la respuesta está en el material o `sin verificar` si no (se muestra con una advertencia). |

El orden de las opciones no importa, porque la página las mezcla. Después de editar, corré `npm test`: avisa si falta algún campo, si `correcta` está fuera de rango, si hay ids repetidos o si la fuente no existe.

## Cómo agregar ejercicios del material

Los ejercicios están en `data/ejercicios.json`. Cada uno tiene esta forma:

```json
{
  "id": "plan-fcfs",
  "tipo": "planificacion",
  "titulo": "FCFS con los procesos A–E",
  "origen": "material",
  "fuente": { "archivo": "Unidad 3b.pdf", "pagina": 9 },
  "nota": "Texto opcional que se muestra como aviso.",
  "datos": { "algoritmo": "FCFS", "procesos": [{ "id": "A", "llegada": 0, "rafaga": 3 }] },
  "esperado": { "gantt": "AAA", "promedios": { "espera": 0 } }
}
```

- `origen`: `material` (enunciado y datos del material), `adaptado` (datos del material, preguntas o resolución armadas para practicar) o `generada`.
- `datos`: depende del `tipo`. Lo más fácil es copiar un ejercicio existente del mismo tipo. Los tipos son `planificacion`, `reemplazo`, `paginacion`, `segmentacion`, `base-limite`, `ajuste`, `buddy`, `asignacion-marcos`, `eat`, `amdahl`, `bloques`, `inodo`, `disco`, `banquero`, `rms`, `buffer`, `peterson` y `semaforos`.
- `esperado` (opcional): los resultados que muestra el material. `npm test` comprueba que el corrector de la página dé exactamente eso. Si el material no trae la resolución, omitilo: la página muestra la etiqueta «Resolución calculada por la página».

## Cómo editar la teoría

`data/teoria.json` tiene, por unidad, una lista de `secciones` con `titulo`, `contenido` y `fuentes`. El contenido admite un Markdown mínimo: párrafos separados por una línea en blanco, viñetas con `- `, `**negrita**` y `` `código` ``.

## Convenciones de los correctores

Son las que usa la cátedra en el material. Cuando el material no define algo, se aclara en el enunciado del ejercicio.

- **Planificación**: T = Tf − Ti, E = T − t, I = t / T. En las prioridades, el número más chico es la prioridad más alta. Los empates se resuelven por orden de llegada.
- **Round Robin**: por defecto se usa la convención de los ejemplos de la Unidad 3b. La CPU recorre los procesos en ronda, en orden de llegada, y un proceso que llega justo cuando vence el quantum se considera llegado antes del vencimiento. Con esto se reproducen exactamente los Gantt de q = 1 y q = 3 de las diapositivas. El solver también tiene la cola FIFO clásica del libro (`"rrModo": "cola"`).
- **Reemplazo**: los marcos son posiciones fijas, como en las diapositivas. En OPT, los empates se resuelven por FIFO. En Reloj, el bit R queda en 1 al cargar o referenciar una página.
- **Disco**: en SSTF, los empates van al cilindro menor. En C-SCAN y C-LOOK se acepta el total contando o sin contar el salto de retorno.
- **Diferencia detectada en el material**: en la diapositiva de SRTF (Unidad 3b, p. 14), las filas de D y E de la tabla no coinciden con su propio Gantt. La página sigue el Gantt (D termina en 20 y E en 14) y lo avisa en el ejercicio.

## Estructura

```
index.html               página única (rutas con #/...)
css/styles.css           estilos, modo claro/oscuro
js/app.js                enrutador, inicio y estadísticas
js/quiz.js               multiple choice, simulacro y repaso de errores
js/teoria.js             resúmenes
js/progreso.js           localStorage
js/ejercicios/           motor de casilleros, tipos de ejercicio y vistas
js/solvers/              algoritmos puros (sirven en el navegador y en Node)
data/                    todo el contenido (JSON)
tests/verificar.mjs      verificación de contenido y correctores
```

## Fuentes

Unidades 1 a 7, la hoja de estudio, la clase de consulta, la ejercitación de paginación y las planillas de Peterson y productor/consumidor de la cátedra de Sistemas Operativos (Ing. Ciraolo, Ing. Guadagnoli, Ing. Blume), complementadas con Silberschatz, Galvin y Gagne, *Fundamentos de Sistemas Operativos*. Las preguntas marcadas como «Generada» se escribieron a partir de esa teoría y citan su fuente.
