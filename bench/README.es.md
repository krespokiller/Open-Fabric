# openfabric-bench

Experimento para medir una sola cosa: **¿un modelo pequeño construye software correcto con menos tokens cuando trabaja con piezas verificadas de OpenFabric, en lugar de escribir todo desde cero o con documentación?**

[English](README.md)

## El diseño

Todos los brazos reciben la misma tarea ([task/task.md](task/task.md)): un servicio de checkout con descuento a cliente nuevo (redondeo half-even y tope), idempotencia, stock que no queda negativo bajo concurrencia, webhook de pago firmado con HMAC, ledger balanceado y autorización. Mismo modelo, mismo máximo de llamadas y mismo proyecto de partida en cada stack.

| Brazo | Qué recibe el modelo además de la tarea | Feedback después de cada intento |
| --- | --- | --- |
| `bare` | nada | build/arranque + 4 checks de humo |
| `docs` | documentación de las librerías del stack, al estilo Context7 ([arms/docs](arms/docs)) | build/arranque + humo |
| `tests` | la lista de tests públicos | build/arranque + humo + 8 tests públicos |
| `of-spec` | la pieza OpenFabric `commerce.checkout`: reglas, ejemplos, invariantes y diseño de referencia ([piece.md](arms/openfabric/piece.md)) | build/arranque + humo + 8 tests públicos |
| `of-code` | la pieza **ya instalada como código** (de solo lectura); el modelo la monta y llena el slot del descuento | build/arranque + humo + 8 tests públicos |

**Regla de parada (igual para todos):** un run termina cuando pasan todos los checks que ese brazo puede ver, o cuando se acaban las llamadas. Por eso los brazos que ven más checks pueden usar más llamadas. **El brazo `tests` es el control:** tiene el mismo feedback y la misma regla de parada que `of-spec`, pero sin la pieza. Así, `of-spec` contra `tests` mide el valor de la pieza y no el de tener tests.

**El juez** es una suite oculta de 21 tests HTTP de caja negra ([suites/hidden.mjs](suites/hidden.mjs)) que ningún modelo ve nunca. Se corre al final de cada run, sobre un arranque limpio con la base de datos vacía. Sus valores son distintos a los de la tarea, la pieza y los tests públicos.

**Stacks:** Next.js 16 + Postgres (el principal, el único con pieza en código), Django 5.2, Spring Boot 3.5 y Laravel 12, todos con PostgreSQL.

**Métricas por run:** tokens de entrada y de salida, llamadas, intentos, tests ocultos pasados, tiempo y por qué terminó. **Métrica principal:** tokens totales por test oculto pasado.

## Qué está validado y qué no

| Stack | Implementación de referencia | Validado por mí |
| --- | --- | --- |
| Next.js | 33/33 tests (humo, públicos y ocultos) | Sí, en modo nativo con Postgres local |
| Django | 33/33 | Sí, en modo nativo con Postgres local |
| Spring Boot | escrita y revisada | **No**: aquí no había acceso a Maven Central |
| Laravel | escrita, revisada y con sintaxis verificada | **No**: aquí no había acceso a Packagist |

También verifiqué que el juez detecta bugs reales: una carrera de stock (falla H15), una firma sin verificar (H16), un replay que crea otra orden (H09, H10) y un descuento sin tope ni half-even (H05 a H07). Además, una revisión independiente buscó sesgos y bugs, y sus hallazgos ya están corregidos. Lo que **no** pude probar aquí es el modo Docker. Por eso el paso 1 es obligatorio.

## Requisitos

- Node.js 22 o superior (el harness no tiene dependencias npm).
- Docker con Compose v2. La primera construcción de cada stack baja imágenes y dependencias.
- Docker Model Runner, o cualquier servidor compatible con la API de OpenAI (Ollama, LM Studio, vLLM o una API en la nube).
- Unos 15 GB de disco libre. El harness borra la imagen de cada intento al terminar, pero la caché de build crece.
- macOS o Linux. En Windows, usa WSL2.

## Paso a paso

### 1. Validar el juez en tu máquina (obligatorio)

```bash
node src/cli.mjs validate-gold
```

Construye cada stack con su implementación de referencia en Docker y corre las tres suites. **Los cuatro stacks deben dar 33/33**, y la línea de cada stack debe mostrar más de 0 `charge requests`. Si Spring o Laravel fallan, el problema está en la referencia o en el Dockerfile, no en los modelos: no corras el experimento en ese stack hasta arreglarlo. Si quieres, me pegas el error y lo corregimos.

### 2. Probar el harness sin gastar tokens

```bash
node src/cli.mjs selftest --stacks nextjs,django
```

Usa un modelo falso que devuelve la referencia: el primer intento rompe el build a propósito y el brazo `bare` recibe un bug plantado. Debes ver `bare` con 18 o 19 de 21 y los demás con 21 de 21.

### 3. Preparar el modelo

En Docker Desktop: Settings → AI → **Enable Docker Model Runner** y **Enable host-side TCP support** (puerto 12434). En Docker Engine, instala `docker-model-plugin`; el TCP viene activo en el 12434.

```bash
docker model pull ai/qwen2.5-coder
docker model configure --context-size 32768 ai/qwen2.5-coder
```

El contexto por defecto de llama.cpp es de 4.096 tokens, y no alcanza: el primer prompt pesa entre 2.400 y 4.300 tokens, y los siguientes incluyen el código que el modelo ya escribió. Usa 16.384 como mínimo; mejor 32.768. Si el contexto se desborda, el harness detiene la corrida y te lo dice, en vez de contarlo como un fallo del modelo. Elige el modelo según tu máquina en [hub.docker.com/u/ai](https://hub.docker.com/u/ai): con 16 GB de RAM, uno de 7B a 8B cuantizado en 4 bits; con más, uno de 14B.

### 4. Correr un piloto (para el lunes)

```bash
node src/cli.mjs run \
  --model ai/qwen2.5-coder \
  --stacks nextjs,django \
  --runs 3 --budget 6 \
  --label "piloto qwen2.5-coder"
```

Por defecto `--base-url` es `http://localhost:12434/engines/v1`. Son 9 celdas (5 brazos en Next.js y 4 en Django) × 3 runs = 27 runs. Con un modelo local, cuenta entre 15 y 40 minutos por run según la máquina: una noche larga. Para algo más corto, usa `--arms bare,tests,of-spec,of-code`.

Si el proceso se corta, o si algún run falló por el entorno (el servidor del modelo caído, Docker sin disco, el reloj desfasado), vuelve a correr el mismo comando con `--out results/<la-carpeta>`. Salta los runs terminados y reintenta los que fallaron por el entorno, que nunca se cuentan en el reporte. Si cambias el modelo, la temperatura, el presupuesto o cualquier archivo del experimento, se niega a reanudar para no mezclar resultados.

### 5. Corrida completa (para publicar)

```bash
node src/cli.mjs run --model ai/qwen2.5-coder --runs 5 --budget 8
```

Son 4 stacks y 5 brazos: 17 celdas × 5 runs = 85 runs, uno o dos días de máquina. Para la tesis "un modelo chico con OpenFabric le gana a uno grande sin él", corre además `bare` y `docs` con un modelo grande por API:

```bash
node src/cli.mjs run --model <modelo-grande> --base-url https://api.openai.com/v1 --api-key $OPENAI_API_KEY --arms bare,docs --runs 5 --label "modelo grande"
```

### 6. Leer el reporte

Cada corrida deja en `results/<carpeta>/`:

- `report.md`: tablas por stack y por brazo (media ± desviación), tasa de acierto por test, cómo terminó cada run, runs no contados, hashes y datos de la máquina.
- `runs.csv`: una fila por run, para hacer gráficos.
- `runs/<stack>__<brazo>__<n>/`: `metrics.json`, `transcript.jsonl` (cada prompt y cada respuesta) y `workspace/` (el código que produjo el modelo).

`node src/cli.mjs report results/<carpeta>` regenera el reporte.

## Reglas para que el resultado sea creíble

1. **Fija el criterio antes de correr y publícalo antes de los números.** Propuesta: OpenFabric gana si, en cada stack, `of-spec` pasa más tests ocultos que `tests` y gasta al menos 30% menos tokens por test pasado. Como comparación secundaria, `of-spec` contra `docs`.
2. **No toques ningún archivo del experimento después de ver resultados.** El reporte imprime el hash del experimento y el de cada suite.
3. **Publica todo, incluidos los runs donde OpenFabric pierde:** transcripts, código generado y `runs.csv`.
4. **Al menos 3 runs por celda, idealmente 5.** La misma tarea puede variar hasta 30 veces en tokens entre corridas.
5. **Revisa el aviso de tokens del reporte.** Algunos servidores basados en llama.cpp reportan solo los tokens de prompt que no estaban en caché. Si el reporte avisa, compara `promptTokens` con `promptEstimate` en `metrics.json` antes de publicar.

## Limitaciones (dilas tú antes de que te las digan)

- **Es una sola pieza.** Mide el checkout, no el catálogo completo.
- **El mismo autor escribió la pieza y el juez.** Mitigación: los valores ocultos son distintos, la tarea que reciben todos los brazos describe las mismas reglas y las referencias pasan el 100%. Lo ideal es que otra persona, sin ver la pieza, escriba una segunda suite oculta.
- **`of-code` es correcto en parte por construcción:** su código instalado es la misma referencia validada contra el juez. Su resultado mide qué tan bien el modelo monta la pieza y llena el slot, no si la pieza es correcta.
- **La documentación del brazo `docs` la escogimos nosotros.** Es generosa a propósito (incluye concurrencia en PostgreSQL y redondeo), para que la alternativa compita en su mejor versión. Context7 real podría devolver más o menos.
- **El agente es mínimo:** cada llamada recibe la tarea, el contexto del brazo, los archivos actuales y el feedback, y el modelo no puede correr comandos. Agentes como Claude Code o Cursor trabajan distinto, así que el resultado aplica a este ciclo, no a todos los agentes.
- **`of-code` solo existe en Next.js.** En los stacks legacy, OpenFabric aporta la especificación y los tests, no código: justamente la capa que debe funcionar en cualquier stack.
- **Versiones no fijadas del todo:** Laravel se instala con `composer create-project laravel/laravel:^12.0` y las imágenes base usan tags de versión menor. Corre todas las celdas que compares en la misma máquina y en los mismos días.
- **Tokens estimados:** si el servidor no reporta `usage`, el harness estima caracteres / 4 y el reporte lo marca.

## Modo nativo (sin Docker)

Para desarrollar el harness. Necesita PostgreSQL local y las herramientas de cada stack (Node, Python 3, Maven y Java 21); Laravel no tiene modo nativo. La app usa el puerto 8080 del host, que tiene que estar libre. El modo nativo no reemplaza la validación en Docker: solo Docker reproduce el entorno real de los runs.

```bash
node src/cli.mjs validate-gold --runtime native --stacks nextjs,django --pg-admin-url postgres://postgres@127.0.0.1:5432/postgres
```

## Estructura

```
task/task.md                 la tarea, idéntica para todos los brazos
arms/docs/                   documentación por stack (brazo docs)
arms/openfabric/piece.md     la pieza commerce.checkout (brazos tests, of-spec y of-code)
arms/openfabric/code/nextjs  la pieza como código instalable (brazo of-code)
stacks/<stack>/skeleton      el proyecto de partida
stacks/<stack>/gold          la implementación de referencia (solo para validate-gold y selftest)
stacks/<stack>/stack.json    cómo construir, arrancar y mostrar el proyecto
suites/                      humo, públicos y ocultos (el juez)
src/                         el harness; src/psp.mjs es el proveedor de pagos simulado
```

En Docker, cada intento levanta tres contenedores: PostgreSQL, el proveedor de pagos simulado y la app. Al terminar se borran, junto con la imagen de la app.

## Problemas comunes

- **"container clock is ... away from the host clock":** el reloj de la VM de Docker Desktop se desfasó, típico después de suspender el Mac. Reinicia Docker Desktop y reanuda con `--out`.
- **Se llena el disco:** `docker builder prune` entre corridas largas.
- **El harness se detiene por contexto:** súbelo con `docker model configure --context-size` y reanuda.
- **Ctrl+C:** el harness apaga los contenedores y borra las bases de datos que tenga abiertos antes de salir.
