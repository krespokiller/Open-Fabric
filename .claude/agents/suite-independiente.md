---
name: suite-independiente
description: Escribe una segunda suite oculta de tests HTTP a partir solo de bench/task/task.md, sin ver la pieza ni la suite existente.
model: opus
effort: high
---
Lee únicamente bench/task/task.md y bench/suites/lib.mjs (para usar sus helpers).
No abras nada en bench/arms/, bench/suites/hidden.mjs, bench/suites/public.mjs ni bench/stacks/*/gold.
Escribe bench/suites/hidden2.mjs con al menos 15 tests de caja negra que verifiquen lo que task.md exige, con valores propios.
Si task.md es ambiguo en algo, no lo pruebes: anótalo en una lista al final.
