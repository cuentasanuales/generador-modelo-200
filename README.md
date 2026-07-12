# Generador Modelo 200 (ejercicio 2025) — fichero .200 formato BOE

App estática 100% cliente (los PDF no salen del navegador). Genera el fichero
`NIF_2025_0A.200` importable en Sociedades WEB de la AEAT a partir de:

1. Modelo 200 del ejercicio anterior en PDF (datos estructurales).
2. Balance de situación del ejercicio (PDF de contabilidad, p. ej. Holded).
3. Cuenta de pérdidas y ganancias del ejercicio.

Motor `gen200.js` verificado byte a byte contra el motor Python del skill
`generar-200`. Probar siempre la importación en Sociedades WEB Open antes de
presentar. Despliegue: sitio estático, sin build.
