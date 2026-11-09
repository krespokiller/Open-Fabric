# Contexto y decisiones

Registro de cómo llegamos aquí, para retomar el trabajo sin repetir discusiones. Lo más nuevo va arriba.

## Estado actual (2026-11-08)

- **Fase:** validar la tesis antes de construir. Nada del producto está construido.
- **Experimento:** `bench/` está completo.
  - Next.js y Django: la implementación de referencia pasa los 33 tests (humo, públicos y ocultos), validada en modo nativo.
  - Spring Boot y Laravel: escritos y revisados, pero **sin compilar ni correr**.
  - El modo Docker no se ha probado.
- **Siguiente paso:** correr `validate-gold` en Docker en una máquina real, luego `selftest`, luego el piloto con un modelo pequeño en Docker Model Runner.

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
- **Criterio de éxito del experimento:** propuesto pero no fijado. OpenFabric gana si, en cada stack, `of-spec` pasa más tests ocultos que `tests` y gasta al menos 30% menos tokens por test pasado. Hay que fijarlo antes de correr.
