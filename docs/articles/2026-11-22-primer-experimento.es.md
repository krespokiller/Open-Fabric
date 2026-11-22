# No es React 2 ni Django 2. Es una línea de ensamblaje para la IA, y medí dónde se rompe

![Un gatico con brazo robótico sostiene una pieza. Del fracaso se aprende, del éxito no mucho](img/e04-portada.png)

La IA programa como un artesano del siglo XIX. Y a todos nos parece normal.

Esta es la historia de una idea: lo que encontré al ponerla a prueba, el camino que no era y por dónde sigo.

## La fábrica

En la época del vapor, las cosas se hacían a medida, una por una. Con la electricidad, durante un tiempo no cambió nada: un motor eléctrico haciendo las mismas piezas desde cero, con mucha más velocidad pero no más productividad. Hasta que llegó la línea de ensamblaje: piezas ya probadas, una línea que las arma y un control de calidad que decide qué sale y qué no.

![El taller de vapor, donde cada pieza sale distinta](img/lamina-1-vapor.gif)

Hoy la inteligencia artificial programa como un artesano. Todo desde cero, cada vez. Y a veces entrega algo que parece bueno y no lo es.

![El mismo taller, ahora con un modelo de IA como motor](img/lamina-2-ia.gif)

Esta apuesta es OpenFabric: que la IA trabaje como una fábrica. Que arme con piezas ya verificadas, que solo escriba el pedacito que falta, y que un control de calidad, al que llamo "el calibre", diga si eso pasa o no pasa.

![La fábrica de OpenFabric, con catálogo, calibre y ensamblador](img/lamina-3-openfabric.gif)

## No me la quise creer

¿Buena idea no?

Pues no me la creí :v

A la IA con la que trabajo le puse una regla: no quiero que me des la razón, quiero números. Y antes de medir nada dejamos publicado qué resultado me daría la razón y cuál me la quitaría.

Así no hay cómo acomodar la historia después.

Las pruebas que definí eran sencillas, un servicio de pagos, un juez oculto de 47 pruebas que la IA nunca ve, y una IA pequeña corriendo en mi computador de casa. Costo IA cero, solo lo que vale la luz de la casa.

Con eso medimos dos caminos.

## El camino que no era

**Darle todo el trabajo a la IA.** No funciona. Le pedimos el servicio completo y no salió bien ni una vez: 0 de 34.

**Mostrarle las pruebas y dejarla corregir.** Tampoco. Con las pruebas a la vista no programó mejor: acertó 19 de 50, contra 21 de 50 sin ellas. Y cuando se equivocó y la dejamos reintentar, no arregló ni un error: 24 de 24 quedaron igual.

![Ver las pruebas no la hizo programar mejor](img/e04-correcto.png)

## De qué nos dimos cuenta

**El tamaño del hueco manda.** Con el servicio entero: 0 de 34. Con un solo hueco y todo lo demás ya armado: 40 de 100. La misma IA.

**No lee la letra pequeña.** La firma de un pago debía empezar con "sha256=". Estaba escrito en la tarea. En 70 intentos no lo puso ni una vez, ni cuando le mostramos qué prueba fallaba.

**A veces acierta sin entender.** En el descuento escribió el mismo código en Python y en JavaScript. En Python quedó bien 9 de 10 veces; en JavaScript, 0 de 10. ¿La diferencia? Python redondea por defecto justo como pedía la regla. La IA no la aplicó en ninguno de los dos.

**El calibre avisa, no arregla.** Con el calibre completo, el código malo que pasaba sin aviso bajó de 23 a 13 de cada 50. Pero toda esa mejora salió de una sola de las cinco funciones.

![Pero sí supimos más veces cuándo falló](img/e04-decision.png)

En una fábrica el control de calidad no hace que la máquina corte mejor. Impide que la pieza mala salga a la calle.

## ¿Qué sigue?

Tres tesis, todavía por probar. Cada una sale de un dato, y cada una se puede caer. Las dos primeras arreglan las estaciones. La tercera monta la línea.

**1. El motor.** Con un modelo más inteligente, la historia cambia.

- **El dato:** la IA pequeña no mejoró con las pruebas (19 contra 21) y no arregló ni un error en 24 reintentos.
- **La prueba:** el mismo experimento, cambiando solo el modelo.
- **Se cae si:** con el modelo grande pasa lo mismo.

**2. La pieza trae el conocimiento.** Si la IA no lee la letra pequeña, la pieza debe traer sus reglas encima y lo delicado ya resuelto.

- **El dato:** la regla de la firma estaba escrita en una tarea de 12 mil caracteres y en 70 intentos no la usó. Y en el descuento Python acertó sin querer: 9 de 10, contra 0 de 10 en JavaScript con el mismo código.
- **La prueba:** las mismas funciones, con sus reglas al lado del hueco y el redondeo ya hecho.
- **Se cae si:** con todo eso al lado sigue fallando. Ahí el problema sería el motor.

**3. La línea completa.** Una fábrica no es un solo brazo robótico. Son muchas estaciones, con un calibre entre una y otra.

- **El dato:** con el servicio entero, 0 de 34. Con un solo hueco, 40 de 100. Y el compilador frenó 13 de las 100 repeticiones sin gastar nada: no todas las máquinas tienen que ser IA.
- **La prueba:** armar el servicio estación por estación, con un calibre después de cada una, contra pedirlo entero.
- **Se cae si:** la línea no entrega más servicios correctos, o los calibres dejan pasar tanto que el error llega al final.
- **La condición:** que no se detenga. Si una estación falla, la línea aparta esa pieza, sigue con el resto y dice qué está esperando, qué falta y qué ayuda necesita.

Primero las estaciones, después la línea. Con el calibre de hoy, cinco estaciones seguidas saldrían todas bien solo 7 de cada 100 veces.

Voy a contar cada experimento aquí, salga bien o salga mal.

## Ficha técnica

A quien le interese

**Modelo**

- Qwen2.5-Coder 7B Instruct, 7,6 mil millones de parámetros
- Cuantizado a 4 bits (GGUF Q4_K_M, 4,7 GB)
- Contexto de 32.768 tokens, temperatura 0,2, máximo 8.192 tokens de salida, semilla fija por repetición e intento
- Servido con llama.cpp (Docker Model Runner)

**Máquina**

- Tarjeta gráfica NVIDIA RTX 2070 de 8 GB
- Procesador AMD Ryzen 5 2600, 16 GB de RAM
- Unos 50 tokens por segundo al generar

**Diseño**

- Tarea: un servicio de checkout con API HTTP y PostgreSQL, en dos tecnologías, Next.js y Django
- Cinco funciones: descuento, validación del carrito, firma del pago, decisión del webhook y asientos contables
- Dos condiciones: control básico de 4 chequeos, o calibre completo de 12
- Hasta 6 intentos por repetición
- Juez: dos baterías ocultas de 21 y 26 pruebas. Una repetición es correcta solo si pasa las 47
- 2 tecnologías x 5 funciones x 2 condiciones x 5 veces cada una = 100 repeticiones, 220 intentos
- 954.079 tokens, 3 horas y 40 minutos de ejecución

**Regla de decisión, fijada antes de los datos**

- Una sola mirada, al terminar las 100 repeticiones
- Prueba exacta de Cochran-Mantel-Haenszel, estratificada por tecnología y función, unilateral, alfa 0,025
- Diferencia mínima que importa: 30 puntos
- "Refutada" si el límite superior del intervalo de la diferencia queda por debajo de 30 puntos

**Resultados principales**

- Código correcto: 19 de 50 con pruebas, 21 de 50 sin ellas. Diferencia de -4,0 puntos, intervalo de -23,1 a +15,5, p = 0,88. **Refutada**
- Decisión acertada: 37 de 50 contra 27 de 50. Diferencia de +20,0 puntos, intervalo de +0,3 a +37,6, p = 0,0018, positiva en las dos tecnologías. **Respaldada**
- "Respaldada" quiere decir mayor que cero. El estimado es 20 puntos, menos que los 30 que habíamos fijado como diferencia que importa

**Qué pasó con cada repetición, de 50**

- Correcta y aprobada: 19 con pruebas, 21 sin ellas
- Mala y detectada: 18 con pruebas, 6 sin ellas
- Mala y entregada sin aviso: 13 con pruebas, 23 sin ellas
- Correcta y rechazada por error: 0 en ambas

**Más números**

- Errores detectados: 18 de 31 con pruebas, 6 de 29 sin ellas
- Por tecnología, código correcto: Django 14 de 25 en ambas condiciones, Next.js 5 de 25 contra 7 de 25
- Por función, código correcto de 20: asientos contables 18, carrito 13, descuento 9, firma 0, webhook 0
- Reintentos: 24 repeticiones, ninguna cambió su resultado
- Tokens: 350.253 en primeros intentos y 603.826 en reintentos
- Ver las pruebas cuesta 6,9% más de tokens en el primer intento
- Tokens por repetición correcta: 32.660 con pruebas y 15.883 sin ellas. La razón es 2,06, con un intervalo de 0,43 a 9,63, así que esa tesis quedó sin decidir

**Integridad de los datos**

- Dos caídas por memoria durante la campaña
- 5 repeticiones apartadas y hechas de nuevo, con reglas que no miran el resultado
- 13 repeticiones terminaron sin construir. Las reconstruimos una por una: las 13 son errores reales del modelo
- El código que da los veredictos es idéntico al que quedó congelado antes de los datos

**Límites**

- Un solo modelo, y pequeño
- Cinco funciones. Toda la diferencia viene de una
- Las dos condiciones tienen calibres de distinto tamaño, y el experimento no separa "ver las pruebas" de "tener un calibre más grande"
- Las pruebas públicas y una de las baterías ocultas tienen el mismo autor

## Referencias

- M. D. McIlroy, "Mass Produced Software Components", conferencia de la OTAN, 1968. La idea original de una industria de componentes
- T. X. Olausson y otros, "Is Self-Repair a Silver Bullet for Code Generation?", ICLR 2024. La autocorrección rinde poco cuando se cuenta su costo
- J. Liu y otros, "Is Your Code Generated by ChatGPT Really Correct?", NeurIPS 2023. Con 80 veces más pruebas, el código "correcto" de los modelos cae entre 19% y 29%

## Todo es público

- Repositorio: https://github.com/krespokiller/Open-Fabric
- Las reglas, congeladas antes de los datos: https://github.com/krespokiller/Open-Fabric/tree/prereg/E04
- El registro completo del experimento: https://github.com/krespokiller/Open-Fabric/blob/main/experiments/E04-slot-gauge/README.md
- Los datos de las 100 repeticiones: https://github.com/krespokiller/Open-Fabric/tree/main/experiments/E04-slot-gauge/data/confirmatory

*"Del fracaso se aprende, del éxito no mucho." Aunt Billie, La familia del futuro*
