# OpenFabric

**Una fábrica de código abierto de piezas de software verificadas, que los agentes de IA ensamblan en vez de escribir todo desde cero.**

[English](README.md)

> Estado: investigación. Estamos probando la tesis con un experimento público y reproducible antes de construir el producto. Aquí todavía no hay software para producción.

## La idea

La IA abarató escribir código, pero no entregar software correcto. OpenFabric propone que los desarrolladores conecten al agente que ya usan un catálogo de piezas verificadas:

- **Piezas en varios niveles:** átomos (dinero, verificación HMAC), moléculas (idempotencia, receptores de webhooks, ledgers), organismos (checkout, login con OTP, cobro mensual), arquitecturas y blueprints.
- **El agente selecciona y ensambla.** La herramienta copia el código verificado y el modelo solo escribe huecos pequeños y especificados.
- **Un verificador decide.** Cada pieza trae contrato y tests, así que lo que escribe el modelo lo juzga código, no la confianza.
- **Cualquier stack.** El contrato y los tests de una pieza sirven para cualquier stack, incluido el legacy; el código listo arranca con uno o dos.

El resultado esperado: menos tokens, prompts más vagos que igual funcionan, y menos bugs en lo que importa (dinero, idempotencia, concurrencia, seguridad).

## Primer paso: ¿de verdad ayuda?

[`bench/`](bench) es el experimento. Un modelo pequeño construye el mismo servicio de checkout en Next.js, Django, Spring Boot y Laravel, con y sin una pieza de OpenFabric, y una suite oculta de 21 tests HTTP juzga cada resultado. Mide tokens por test pasado. Ver [bench/README.es.md](bench/README.es.md).

## Estructura

```
bench/      el experimento: tarea, brazos, juez, harness e implementaciones de referencia
docs/       contexto y decisiones
LICENSE     Apache 2.0
```

## Licencia

Apache 2.0. Ver [LICENSE](LICENSE).
