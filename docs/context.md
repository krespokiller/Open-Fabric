# Contexto y decisiones

Registro de cómo llegamos aquí, para retomar el trabajo sin repetir discusiones. Lo más nuevo va arriba.

## Estado actual (2026-11-16)

- **Fase:** validar la tesis antes de construir. Nada del producto está construido.
- **Dirección (2026-11-16):** el producto deja de ser un catálogo portable entre stacks y pasa a ser una línea de producción en un solo stack. Ver "Giro del 2026-11-16". T4 y T5 quedan reemplazadas; las tesis nuevas son T14 a T19.
- **Benchmark:** validado en Docker en los cuatro stacks (59/59 con las dos suites ocultas). Modelo `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` en GPU (~1,400 tokens/s de lectura, ~55 de salida). La máquina (RTX 2070, 8 GB) solo carga el 7B.
- **Tarea completa con el 7B:** 34 corridas entre el piloto 1 y la corrida exploratoria, cerca de 1.83 millones de tokens, 0 tests ocultos pasados. El 7B no sirve como instrumento para la tarea completa.
- **Ronda 2 (T8 a T10):** descartada tal como estaba escrita; los controles sin modelo muestran que T8 se cumple por construcción. Ver "Controles sin modelo".
- **Siguiente paso:** el dueño confirma las decisiones de la fase 0 del plan nuevo. La ronda 3 (T11 a T13, calibre a nivel de hueco) sigue siendo válida y se corre primero.

## Giro del 2026-11-16: una línea de producción en un solo stack

**Resumen.** OpenFabric pasa a ser un stack fijo con un catálogo único de piezas. El agente del desarrollador ensambla y personaliza, y un calibre decide en cada paso. La investigación de competidores del mismo día dice que el framework es la parte más ocupada de la idea y que la capa de verificación es la única libre. Por eso el plan prueba primero la verificación y pone a prueba si el stack propio aporta algo más que ella.

### Por qué se deja el multi-stack

- **El costo estuvo en el montaje.** El piloto falló al enchufar la pieza al framework, y la decisión del 2026-11-09 ya exigía un adaptador por pieza y por stack.
- **El calibre sí viajó.** La referencia pasa 59/59 en los cuatro stacks y los controles sin modelo dan idéntico en Next.js y Django.
- **Sin un stack estándar no hay piezas intercambiables.** Cada pieza se lima para encajar, que es el taller.
- **Lo que se pierde:** la promesa 3 (cualquier stack, incluido el legacy). Además se retoma en parte una idea descartada, la del stack único.

### La filosofía

1. **La línea es fija.** Las estaciones (datos, API, pantalla, despliegue) las define el stack.
2. **Hay un solo catálogo de piezas.** Las verticales (fintech, ventas en vivo, streaming) son planos que combinan piezas, no paquetes aparte. Una app real mezcla varias.
3. **El piso no es una pieza.** Tenants, auth y contratos vienen en la base y toda pieza los respeta.
4. **El agente es el brazo robótico.** Lo trae el desarrollador (Claude Code, Codex, OpenCode, Pi). Ensambla y personaliza.
5. **El calibre tiene dos formas.** El de catálogo viene con la pieza y cubre lo genérico, que se instala sin modelo. El de negocio sale de una conversación con el LLM y son reglas con ejemplos aprobados: la orden de producción.
6. **Cada pieza trae sus preguntas de negocio.** Un hueco es una pregunta sin responder.
7. **El agente no toca los calibres ni la orden.** Nada avanza sin pasar el calibre.

### Qué dice la investigación

Informe completo en `reports/Competidores del framework AI first.md`, con notas en `research_notes/` (ambos sin commitear). La búsqueda fue en inglés y no ve productos cerrados: lo que dice es "no encontrado", no "no existe".

| Punto | Evidencia | Consecuencia |
| --- | --- | --- |
| ¿Ya existe? | No se encontró ningún producto con framework, catálogo verificado y agente del desarrollador como ensamblador. Cada par de esas tres cosas sí existe | La combinación está libre; sus partes no |
| Más cercanos | GoFastr (Go, plano, tenants y auth en la base, adaptadores para Claude Code, Codex y Pi; 24 estrellas, sin catálogo). Wasp (18,807 estrellas; "full-stack modules" con registro planeado y sin verificación; solo TypeScript). Laravel con Boost. Convex, con el único catálogo de backend poblado | "Framework AI-first" es el segmento más lleno |
| Lo libre | Piezas con tests como calibre y preguntas de negocio, y ejemplos aprobados que el agente no puede editar. No depende del framework | Es lo primero a probar. Un incumbente la puede agregar |
| Lenguaje | Con modelos de 7-8B, Rust acierta 6-16% y Go 12-29% (AutoCodeBench, 2025). Con modelos grandes no hay ganador estable. Go tiene SDK oficial de Stripe y colas y migraciones maduras | Go para el backend |
| Un solo lenguaje | Nada en Go ni en Rust se acerca a React con Tailwind y shadcn. Encore y Loco le dejan el frontend a JavaScript. Wasp dijo en mayo de 2026 que su lenguaje propio fue un error. El móvil en Go o Rust renderiza en un WebView | Un solo stack, no un solo lenguaje |
| Framework nuevo | BaxBench (2025): los modelos rinden peor en frameworks menos populares | El stack debe ser delgado y usar librerías que los modelos ya conocen |
| Pieza copiada o sellada | Como dependencia cuesta personalizarla; copiada casi nunca se actualiza. Phoenix, Rails 8 y Laravel pasaron a código propio del desarrollador. Marmelab (2026, una corrida, medida por el mantenedor): un kit copiado gastó 37% más tokens que escribir desde cero y un framework de alto nivel 25% menos | Sin medición que lo decida. Se mide en el bench |
| Tests como calibre | Los tests que escribe el mismo modelo después del código detectan 14% de las fallas, contra 25% si los escribe otro. Los tests de solo lectura frenan la edición, no el programar a la medida de los ejemplos. Un canal de escalado bajó las trampas de 23.6% a 5.3% | Calibre escrito por otro, suite oculta además de los ejemplos, y un canal para parar la línea |
| Aprobador de negocio | Encuesta de 2020 a 339 equipos (autoseleccionada): en 40% el negocio define los ejemplos y en 26% casi no le importan. Nadie ha medido la cadena completa | El primer usuario es un desarrollador. La persona de negocio elige entre opciones con números |
| Tokens | Las ayudas para agentes suben los aciertos de modelos débiles gastando más tokens. Casi toda la evidencia es del proveedor | La promesa principal es corrección y garantías, no "menos tokens" |
| Nombre | Cinco usos previos: Openfabric AI (cripto e IA), Open Fabric (pagos, Singapur), OpenFabrics Alliance, un borrador IETF y OpenFABR | Cambiar el nombre antes de lanzar |
| Vacío | No existe un benchmark emparejado de ensamblar contra escribir desde cero | El bench propio lo llena y se puede publicar por sí solo |

### Decisiones

| Decisión | Estado |
| --- | --- |
| Un solo stack; se deja el multi-stack | Decidido por el dueño (2026-11-16) |
| El agente del desarrollador es el ensamblador; integración por CLI primero y MCP después | Decidido por el dueño (2026-11-16) |
| Dos calibres: de catálogo y de negocio | Decidido por el dueño (2026-11-16) |
| Backend en Go | Recomendado, por confirmar |
| Frontend en React con Tailwind y shadcn, con cliente tipado generado; el móvil consume el mismo contrato | Recomendado, por confirmar |
| La pieza se entrega como código copiado, con calibre bloqueado y suite oculta | Recomendado, por confirmar; se mide |
| Canal de escalado: el agente puede parar la línea en vez de forzar el calibre | Recomendado, por confirmar |
| La promesa principal es corrección y garantías | Recomendado, por confirmar |
| Nombre del proyecto | Abierto |
| Agente y presupuesto para las corridas de tarea completa (el 7B no sirve para eso) | Abierto |

### Tesis nuevas (criterios propuestos, sin fijar)

Brazos del experimento: `taller` (el agente escribe desde cero en Django), `taller-calibre` (lo mismo con los calibres visibles) y `linea` (el stack en Go con piezas, calibres y andamiaje determinista). Corrida correcta es pasar completas `hidden` y `hidden2`.

| # | Tesis | Cómo se prueba | Criterio de éxito (propuesto) |
| --- | --- | --- | --- |
| T14 | La línea llega a software correcto más veces que el taller | Tarea variante del checkout, con reglas que la pieza no trae, y un agente real. `linea` contra `taller` | `linea` tiene al menos 20 puntos porcentuales más de corridas correctas |
| T15 | El stack propio aporta algo más que el calibre | `linea` contra `taller-calibre` | `linea` tiene más corridas correctas, o las mismas con menor costo por corrida correcta. Si no se cumple, el producto es la capa de verificación sobre frameworks existentes |
| T16 | La línea no encarece el resultado | Mismo experimento | `linea` gasta como máximo lo mismo que `taller` por corrida correcta, en tokens y en dólares |
| T17 | Las preguntas de la pieza recuperan las reglas que el cliente no dijo (reemplaza a T5) | La tarea escrita como la diría un cliente y un cliente simulado que solo responde lo que le preguntan. Con y sin las preguntas de la pieza | Con preguntas se recupera al menos el doble de reglas omitidas y hay más corridas correctas |
| T18 | Un calibre escrito por otro detecta más que uno escrito por el mismo modelo | Un brazo donde el agente escribe sus propios tests contra un brazo con calibre independiente | Se fija después de la corrida exploratoria. Se reporta además cuántas corridas pasan todos los ejemplos visibles y fallan la suite oculta |
| T19 | Piezas que pasan por separado pasan juntas | Mezcla de ventas en vivo: cobro, tenants y reserva de stock durante el vivo. Suite oculta de la combinación escrita por un agente independiente | Se fija antes de diseñar la prueba |

Comparación secundaria: pieza copiada contra pieza sellada, midiendo los tokens que el agente gasta leyendo la pieza. T7 (calibre en frontend) sigue pendiente.

### Plan por fases

| Fase | Qué se hace | Condición de salida |
| --- | --- | --- |
| 0 | El dueño confirma las decisiones abiertas y recomendadas | Lenguaje, frontend, entrega de la pieza, agente y presupuesto confirmados |
| 1 | Ronda 3 tal como está diseñada, con el 7B | T11 a T13 decididas o reportadas como indecidibles |
| 2 | Línea mínima dentro de `bench/`: la referencia del checkout en Go con PostgreSQL, partida en piezas con calibre y preguntas, y un andamiaje determinista | La referencia en Go pasa 59/59 con las suites actuales, que son HTTP de caja negra. Controles sin modelo corridos |
| 3 | Agente real en modo no interactivo, con costo medido. Tarea variante. Corrida exploratoria de 1 corrida por celda | Sin piso ni techo. Criterios de T14 a T16 fijados con tag de pre-registro |
| 4 | Experimento A: T14 a T16 | Reporte publicado, cumpla o no |
| 5 | Experimento B: T17 y T18 | Reporte publicado, cumpla o no |
| 6 | Experimento C: T19, con la mezcla de ventas en vivo | Reporte publicado, cumpla o no |
| 7 | Decisión de construir | Propuesta: se construye el producto solo si se cumplen T14 y T17. Si T15 no se cumple, se construye la capa de verificación sobre frameworks existentes |

La fase 2 es código del experimento, no del producto.

### Límites honestos

- La línea mínima, las piezas y `hidden` son del mismo autor; `hidden2` es independiente.
- Una sola tarea base (checkout) hasta la fase 6.
- T17 usa un cliente simulado. No dice nada sobre una persona de negocio real.
- Las corridas con un agente real cuestan dinero y el modelo cambia entre corridas separadas por meses.
- El beneficio medido de las ayudas para agentes se achica con cada generación de modelos. Un resultado a favor hoy puede no sostenerse.
- Varias cifras de la investigación son del proveedor o de una sola corrida. El informe marca cuáles.

## La visión: de taller a fábrica

Con la máquina de vapor todo se hacía a medida: un eje central movía el taller y cada pieza se limaba hasta que encajaba. Las primeras fábricas eléctricas solo cambiaron la caldera por un motor y casi no ganaron productividad durante décadas (la paradoja del dínamo, Paul David, 1990). La ganancia llegó al rediseñar la fábrica alrededor de piezas intercambiables, y lo que las hizo intercambiables fue el **calibre** "pasa / no pasa".

Hoy la IA es ese motor metido en el taller viejo: escribe cada sistema desde cero y a medida. OpenFabric es la fábrica rediseñada: un catálogo de piezas, un calibre (contrato y tests) que dice si una pieza sirve en cualquier stack, y el agente como ensamblador. La visión cubre **todo** el producto (backend, frontend, datos e infraestructura), cada capa con su propio calibre. Se empieza por el backend porque ahí el calibre es más nítido. Las ilustraciones están en `docs/img/` y en el README.

## Tesis a probar

Cada tesis tiene su criterio escrito **antes** de correrla. Si una corrida no cumple el criterio, se publica igual.

| # | Tesis | Cómo se prueba | Criterio de éxito | Estado |
| --- | --- | --- | --- | --- |
| T1 | Con la pieza, un modelo chico llega a software correcto gastando menos | Piloto: `of-spec` contra `tests` | En cada stack, `of-spec` pasa más tests ocultos (`hidden`, media por corrida) que `tests` y gasta al menos 30% menos tokens por test pasado | **Fijado** (2026-11-09) |
| T2 | Con la pieza sale correcto a la primera | Mismo piloto | En cada stack, `of-spec` tiene más corridas 100% correctas que `tests` | **Fijado** (2026-11-09) |
| T3 | El juez no está sesgado a favor de la pieza | `hidden2` en el mismo piloto | En cada stack, `of-spec` también supera a `tests` en la media de `hidden2` | **Fijado** (2026-11-09) |
| T4 | Funciona en cualquier stack, incluido el legacy | Matriz completa con Spring Boot y Laravel | T1 se cumple también en Spring Boot y Laravel | Reemplazada (2026-11-16): se deja el multi-stack |
| T5 | Funciona con prompts vagos | Brazo nuevo con la tarea escrita como la diría un cliente | Se fija antes de diseñar el brazo | Reemplazada por T17 (2026-11-16) |
| T6 | Sirve también con modelos grandes | Mismo experimento con un modelo en la nube | Se fija antes de correrlo | Pendiente |
| T7 | El calibre funciona en frontend | Pieza de UI con tests end-to-end | Se fija antes de escribir la pieza | Pendiente |

Comparación secundaria de T1: `of-spec` contra `docs`.

## Piloto 1 (2026-11-09): resultado y lo que cambia

**Qué corrió:** `piloto-preregistro-2` (commit `c90c80a`), Qwen2.5-Coder 7B Q4_K_M en GPU, Next.js y Django, budget 6. Se detuvo a propósito en 18 de 27 corridas: **las 18 dieron 0/21**, en todos los brazos. Reporte en `bench/results/piloto/report.md` (fuera de git; se publica aparte).

**Por qué falla el modelo** (verificado en las transcripciones):

1. **Le pedimos fabricar, no ensamblar.** En `bare`, `docs`, `tests` y `of-spec` el modelo escribe el servicio entero desde cero. En Next.js lo frenan errores de TypeScript; en Django escribe modelos pero no migraciones (no puede correr `makemigrations`) y todo responde 500.
2. **Con la pieza instalada (`of-code`) falla en el montaje.** Tenía que crear 7 rutas casi copiadas de un ejemplo y la función de descuento. Puso `GET /products/{sku}` en `app/products/route.ts` en vez de `app/products/[sku]/route.ts` y Next.js no compila. El punto débil no fue la lógica difícil, fue enchufar la pieza al framework.
3. **El loop no tiene memoria.** Cada intento ve solo el último error, no su respuesta anterior; varias corridas repiten la misma respuesta idéntica varias veces. (Corregido el 2026-11-11: sí ve su código, no el historial de intentos. Ver "Controles sin modelo y corrida exploratoria".)

**Lectura:** es un efecto piso. T1 a T4 quedan **indecidibles** con este modelo y este loop: no dicen que la pieza ayude ni que no ayude. Sí dicen dónde está el hueco de la arquitectura.

**Decisión (2026-11-09):** el ensamblaje lo hace **la herramienta, de forma determinista**. Cada pieza trae, además del contrato y los tests, un **adaptador por stack** (rutas, migraciones, registro) que se instala sin pasar por el modelo. El modelo solo llena los huecos con contrato. El calibre tiene que estar al alcance del ensamblador durante el trabajo, no solo al final.

## Ronda 2 (propuesta, sin correr)

**Brazo nuevo `of-kit`:** la herramienta instala la pieza completa con su adaptador para el stack; el modelo recibe el contrato de los huecos y los tests públicos. Primero en Next.js y Django.

**Arreglos del loop, iguales para todos los brazos:** el modelo ve su respuesta anterior además del último error; en Django el arranque corre `makemigrations` antes de `migrate`.

**Escalera de modelos:** 7B y 14B, para ver desde qué tamaño escribir desde cero empieza a pasar tests.

| # | Tesis | Criterio de éxito (propuesto) |
| --- | --- | --- |
| T8 | Con la pieza ensamblada por la herramienta, un modelo chico llega a software correcto | En cada stack, `of-kit` pasa en promedio al menos 90% de `hidden` y de `hidden2` |
| T9 | Ensamblar es más barato que fabricar | En cada stack, `of-kit` gasta como máximo el 30% de los tokens por test pasado del mejor brazo desde cero. Si ningún brazo desde cero pasa tests, se reporta como "solo ensamblando se llega a software correcto" |
| T10 | La ventaja se mantiene con un modelo más grande | T9 se cumple también con el 14B |

**Límite honesto:** el código instalado por `of-kit` es la referencia validada, así que es correcto en parte por construcción. Lo que T8 y T9 miden es si el ensamblaje determinista más el llenado de huecos da un servicio correcto en cada stack, y a qué costo. El riesgo real se mueve a la herramienta: instalar en proyectos reales y distintos al esqueleto del bench. Eso queda como tesis siguiente.

**Estado (2026-11-11): descartada sin correr.** Los controles de la sección siguiente muestran que T8 no puede fallar y que T9 divide por cero.

## Controles sin modelo y corrida exploratoria (2026-11-10 y 11)

**Controles sin modelo.** Se tomó la referencia validada, se cambió solo la función de descuento y se pasó por las dos suites ocultas en Docker. Resultados en `D:\tmp\of-bench\controles` (fuera de git).

| Hueco de descuento | Stack | `hidden` | `hidden2` | Tokens de modelo |
| --- | --- | --- | --- | --- |
| `return 0` | Next.js y Django (idéntico) | 14/21 | 20/26 | 0 |
| Lanza error (sin llenar) | Next.js y Django (idéntico) | 4/21 | 6/26 | 0 |
| Lo que escribió el 7B en el piloto (`Math.round`) | Next.js | 20/21 | 24/26 | 87 de salida |

- **T8 se cumple por construcción.** Con 87 tokens de salida el 7B ya queda en 95% y 92%; el criterio era 90%. Solo 7 de los 21 tests de `hidden` dependen del hueco.
- **T9 no tiene denominador.** Ningún brazo desde cero pasa un solo test.
- **El calibre detecta un error sutil.** Las dos suites, escritas por separado, marcan el redondeo normal en vez de mitad-al-par (H07, X09, X10). Es el primer dato a favor de la idea.

**Relectura del piloto 1.** Con `runs.csv` y `metrics.json`: 953,818 tokens, 25 de 108 intentos compilaron, 0 de 48 en Next.js desde cero. El punto 3 del piloto estaba impreciso: el modelo sí ve su código en cada llamada (los archivos del proyecto van en el prompt); lo que no veía era el historial entre intentos. Y "falla en el montaje" sale de 2 corridas en las que el modelo escribió un archivo por llamada, con 8 archivos por escribir y 6 llamadas.

**Arreglos del arnés** (rama `bench/loop-history-django-migrations`): el prompt lleva una línea por intento anterior y un aviso cuando la respuesta es idéntica a la previa; en Django el arranque corre `makemigrations` y luego `migrate --run-syncdb`, así que el modelo ya no escribe migraciones a mano. La referencia de Django sigue en 59/59, también con su migración borrada.

**Corrida exploratoria** (`exploratorio-7b-loop2`, 7B, Django y Next.js, `bare` y `tests`, 4 corridas por celda, presupuesto 6, con los arreglos): 16 de 16 corridas en 0/21 y 0/26, 872,057 tokens. Compilaron 27 de 96 intentos (Django 26 de 48, Next.js 1 de 48). Ninguna corrida pasó del chequeo de salud. 19 de 96 intentos llegaron al tope de 8,192 tokens repitiendo la misma línea; 17 de 80 reintentos fueron idénticos al anterior. En Django el modelo escribe los modelos y no conecta las rutas; en Next.js no sale de los errores de TypeScript. `tests` contra `bare` sigue indecidible a tamaño de tarea completa.

## Ronda 3: calibre a nivel de hueco (propuesta, sin correr)

**Idea.** La herramienta instala el servicio completo (la referencia) y deja un hueco: una función pura con una regla de negocio. El modelo escribe solo esa función. Como todo lo demás es la referencia, cualquier test oculto que falle es culpa del hueco. Es la versión medible de "la herramienta ensambla, el modelo fabrica lo chico, el calibre juzga".

**Huecos** (los mismos en Next.js y Django): descuento (`discount`), validación del carrito (`cart`), firma del webhook (`signature`), decisión del webhook (`webhook`) y asiento contable (`ledger`). La idempotencia y la reserva de stock viven en SQL y quedan instaladas.

**Brazos**, un hueco por corrida:

- `kit-bare`: la tarea y el contrato del hueco. Ve los 4 chequeos básicos.
- `kit-tests`: lo mismo más los 8 tests públicos y sus resultados después de cada intento.

**Métrica principal:** corrida correcta, que es pasar completas `hidden` y `hidden2`.

| # | Tesis | Criterio de éxito (propuesto) |
| --- | --- | --- |
| T11 | Tener el calibre a la vista mejora la corrección al llenar un hueco | En cada stack, sumando los cinco huecos (5 corridas por celda, 25 por brazo), `kit-tests` tiene al menos 20 puntos porcentuales más de corridas correctas que `kit-bare` |
| T12 | Un calibre que no cubre la regla sutil da falsa confianza | En el hueco de descuento, al menos la mitad de las corridas de `kit-tests` pasan todos los chequeos visibles y fallan algún test oculto (el test público P1 no ejercita el redondeo mitad-al-par) |
| T13 | El calibre no encarece el resultado | En cada stack, `kit-tests` gasta menos tokens por corrida correcta que `kit-bare`. Si `kit-bare` no tiene corridas correctas, se reporta así |

**Antes de fijar:** una corrida exploratoria de 1 corrida por celda para ver si hay piso o techo. Si `kit-bare` ya acierta casi siempre, el experimento no discrimina y se rediseña antes del tag de pre-registro. Los datos exploratorios no entran en la corrida confirmatoria.

**Controles sin modelo** (2026-11-11): la referencia con un hueco sin llenar, por hueco y stack. Los resultados son idénticos en Next.js y Django.

| Hueco sin llenar | Chequeos básicos | Tests públicos | `hidden` | `hidden2` |
| --- | --- | --- | --- | --- |
| `discount` | 3/4 | 2/8 | 4/21 | 6/26 |
| `cart` | 3/4 | 0/8 | 2/21 | 5/26 |
| `signature` | 4/4 | 5/8 | 15/21 | 16/26 |
| `webhook` | 4/4 | 6/8 | 16/21 | 17/26 |
| `ledger` | 4/4 | 7/8 | 18/21 | 18/26 |

Con `signature`, `webhook` y `ledger` sin llenar pasan los 4 chequeos básicos, así que `kit-bare` no recibe ninguna señal de error en esos huecos y para en el primer intento. En `discount` y `cart` el chequeo de compra falla y `kit-bare` sí itera.

**Límites honestos:**

- `kit-bare` para cuando pasan sus 4 chequeos y `kit-tests` sigue hasta pasar 12, así que `kit-tests` usa más llamadas. Se reportan llamadas y tokens por brazo.
- `kit-tests` recibe la descripción de los tests y además sus resultados; este diseño no separa información de retroalimentación.
- Falta el brazo donde el modelo escribe sus propios tests, que es la objeción más fuerte.
- Una sola tarea, un solo modelo, huecos de pocas líneas. No dice nada sobre escribir un servicio entero.
- La pieza, los tests públicos y `hidden` son del mismo autor; `hidden2` es independiente.

## La tesis

> **Actualización 2026-11-16:** la promesa 3 (cualquier stack) se retira y la promesa 1 (menos tokens) pasa a ser secundaria. Ver "Giro del 2026-11-16".

OpenFabric es una fábrica de código abierto que los desarrolladores conectan a su agente de IA (por MCP). En vez de escribir software desde cero, el agente busca, selecciona y ensambla piezas verificadas. El modelo solo escribe huecos pequeños con contrato, y un verificador decide si sirven.

Promesas a demostrar:

1. Menos tokens para llegar a software correcto.
2. Prompts más vagos que igual funcionan, porque las arquitecturas y blueprints traen decisiones por defecto.
3. Funciona con cualquier stack, incluido el legacy. Para eso cada pieza tiene dos capas:
   - **Contrato y tests**, que sirven para cualquier stack y son lo que juzga.
   - **Código listo**, solo para uno o dos stacks al inicio.

Niveles del catálogo: átomos, moléculas, organismos, arquitecturas y blueprints. Las verticales (tienda, fintech, LMS, propiedad horizontal, SST) son combinaciones del catálogo, no productos aparte.

## Decisiones tomadas

| Decisión | Por qué |
| --- | --- |
| Validar con un experimento antes de construir | Si las piezas no le ganan a darle documentación al agente, el producto no tiene razón de existir |
| La comparación principal es `of-spec` contra `tests` | Aísla el valor de la pieza del valor de tener tests públicos como feedback |
| El experimento cubre 4 stacks: Next.js (principal) más Django, Spring Boot y Laravel | Probar que el contrato y los tests funcionan en legacy. **Reemplazada el 2026-11-16:** el producto va en un solo stack; Django queda en el bench como brazo de comparación |
| Licencia Apache 2.0 | Concesión explícita de patentes; abierto de verdad |
| El repo en inglés, con README en español | Más alcance técnico sin dejar de hablarle a LatAm |
| Arquitectura: catálogo + ensamblador + MCP + verificador | Encaja con los agentes que ya usan los devs |

## Ideas descartadas

- **Compilador en Go con runtime propio** (un primer borrador de spec): generaba una app en un solo stack. Se cambió por el catálogo ensamblable, que trabaja dentro del proyecto del dev y en su stack. **Retomada en parte el 2026-11-16:** vuelve el stack único, sin compilador ni runtime propio.
- **Producto solo para fintech:** las piezas son genéricas; fintech es una vertical más.
- **Prometer "one-shot de cualquier software":** no se puede sostener. El mensaje es que la parte aburrida y peligrosa sale verificada y los huecos quedan explícitos.

## Mercado (resumen de la evaluación)

- **Más cercano:** Hope AI de Bit Cloud, que ensambla componentes de un hub y soporta MCP. Es comercial y está centrado en JavaScript/TypeScript.
- **Solo UI:** el registro de shadcn + MCP.
- **Conocimiento para agentes, no código:** Context7, Tessl y GitHub Spec Kit.
- **Un solo stack:** Wasp/Mage, Amplication y JHipster.
- **Hueco:** piezas de punta a punta, abiertas, portables entre stacks gracias a contratos y tests, y con benchmark público.
- **Lección de los que funcionaron:** ser angosto.

Evidencia de investigación usada:

| Fuente | Qué dice |
| --- | --- |
| CodeRAG-Bench | Recuperar contexto ayuda, pero los buscadores fallan con consultas vagas |
| RepoCoder, Gorilla, LILO | Recuperar y reutilizar piezas mejora la generación |
| LLM-Modulo (ICML 2024) | El LLM propone y un verificador externo decide |
| Bai et al. 2026, Tokenomics 2026 | El costo de un agente está sobre todo en los tokens de entrada y en las iteraciones de revisión |

## Preguntas abiertas

- **Nombre:** revisado el 2026-11-16. Hay cinco usos previos, dos de ellos en IA y en pagos (Openfabric AI y Open Fabric). Falta elegir uno nuevo antes de lanzar.
- **Propiedad:** definir de quién es el proyecto antes de que tenga tracción.
- **Primer stack con código listo:** Next.js por defecto; confirmar con los proyectos reales donde se va a usar.
- **Criterios de T5 a T7:** se fijan antes de diseñar cada prueba. T1 a T4 quedaron fijados el 2026-11-09.
