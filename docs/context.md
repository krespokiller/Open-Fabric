# Contexto y decisiones

Registro de cómo llegamos aquí, para retomar el trabajo sin repetir discusiones. Lo más nuevo va arriba.

## Estado actual (2026-11-09)

- **Fase:** validar la tesis antes de construir. Nada del producto está construido.
- **Experimento:** `bench/` listo para correr salvo por la velocidad del modelo.
  - Los cuatro stacks (Next.js, Django, Spring Boot, Laravel) pasan 59/59 en Docker: humo, públicos y las dos suites ocultas, con 61 cobros al mock de pagos cada uno.
  - Segunda suite oculta `suites/hidden2.mjs` (26 tests), escrita por un agente que solo leyó `task/task.md` y `suites/lib.mjs`. Se reporta aparte de `hidden`.
  - Modelo: `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` con contexto 32768. `ai/qwen2.5-coder` ya no existe en Docker Hub y el GGUF partido del repo oficial de Qwen no carga en Docker Model Runner.
  - En CPU (12 núcleos) medimos 18 tokens/s de lectura de prompt y ~2 tokens/s de salida: ~40 minutos por llamada. El piloto necesita la GPU (RTX 2070).
- **Siguiente paso:** activar la inferencia por GPU, confirmar los criterios de T2 a T4, prueba corta y piloto.

## La visión: de taller a fábrica

Con la máquina de vapor todo se hacía a medida: un eje central movía el taller y cada pieza se limaba hasta que encajaba. Las primeras fábricas eléctricas solo cambiaron la caldera por un motor y casi no ganaron productividad durante décadas (la paradoja del dínamo, Paul David, 1990). La ganancia llegó al rediseñar la fábrica alrededor de piezas intercambiables, y lo que las hizo intercambiables fue el **calibre** "pasa / no pasa".

Hoy la IA es ese motor metido en el taller viejo: escribe cada sistema desde cero y a medida. OpenFabric es la fábrica rediseñada: un catálogo de piezas, un calibre (contrato y tests) que dice si una pieza sirve en cualquier stack, y el agente como ensamblador. La visión cubre **todo** el producto (backend, frontend, datos e infraestructura), cada capa con su propio calibre. Se empieza por el backend porque ahí el calibre es más nítido. Las ilustraciones están en `docs/img/` y en el README.

## Tesis a probar

Cada tesis tiene su criterio escrito **antes** de correrla. Si una corrida no cumple el criterio, se publica igual.

| # | Tesis | Cómo se prueba | Criterio de éxito | Estado |
| --- | --- | --- | --- | --- |
| T1 | Con la pieza, un modelo chico llega a software correcto gastando menos | Piloto: `of-spec` contra `tests` | En cada stack, `of-spec` pasa más tests ocultos (`hidden`, media por corrida) que `tests` y gasta al menos 30% menos tokens por test pasado | **Fijado** (2026-11-09) |
| T2 | Con la pieza sale correcto a la primera | Mismo piloto | En cada stack, `of-spec` tiene más corridas 100% correctas que `tests` | Propuesto, confirmar antes del piloto |
| T3 | El juez no está sesgado a favor de la pieza | `hidden2` en el mismo piloto | En cada stack, `of-spec` también supera a `tests` en la media de `hidden2` | Propuesto, confirmar antes del piloto |
| T4 | Funciona en cualquier stack, incluido el legacy | Matriz completa con Spring Boot y Laravel | T1 se cumple también en Spring Boot y Laravel | Propuesto, confirmar antes de la matriz |
| T5 | Funciona con prompts vagos | Brazo nuevo con la tarea escrita como la diría un cliente | Se fija antes de diseñar el brazo | Pendiente |
| T6 | Sirve también con modelos grandes | Mismo experimento con un modelo en la nube | Se fija antes de correrlo | Pendiente |
| T7 | El calibre funciona en frontend | Pieza de UI con tests end-to-end | Se fija antes de escribir la pieza | Pendiente |

Comparación secundaria de T1: `of-spec` contra `docs`.

## La tesis

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
| El experimento cubre 4 stacks: Next.js (principal) más Django, Spring Boot y Laravel | Probar que el contrato y los tests funcionan en legacy |
| Licencia Apache 2.0 | Concesión explícita de patentes; abierto de verdad |
| El repo en inglés, con README en español | Más alcance técnico sin dejar de hablarle a LatAm |
| Arquitectura: catálogo + ensamblador + MCP + verificador | Encaja con los agentes que ya usan los devs |

## Ideas descartadas

- **Compilador en Go con runtime propio** (un primer borrador de spec): generaba una app en un solo stack. Se cambió por el catálogo ensamblable, que trabaja dentro del proyecto del dev y en su stack.
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

- **Nombre:** existe la OpenFabrics Alliance. Hay que revisar conflictos antes de lanzar.
- **Propiedad:** definir de quién es el proyecto antes de que tenga tracción.
- **Primer stack con código listo:** Next.js por defecto; confirmar con los proyectos reales donde se va a usar.
- **Criterios de T2 a T7:** ver la tabla de tesis. T1 quedó fijado el 2026-11-09.
