# Pasatiempos

Aplicación web de pasatiempos en español de España, pensada para el iPhone
(se instala en la pantalla de inicio y funciona sin conexión):

- **Palabra del día**: adivina la palabra de cinco letras en seis intentos. Partidas libres y estadísticas.
- **Crucigrama**: uno nuevo cada día (y libres), generado a partir de un banco de 317 palabras con pistas propias.
- **Sudoku**: niveles fácil, media, difícil y experto, con notas, pistas, deshacer y récords.
- **Lexireto**: siete letras en un panal; forma palabras que usen siempre la letra central.

No necesita compilación ni dependencias: es HTML, CSS y JavaScript.



## Instalar en el iPhone

Abre la dirección en **Safari**, pulsa **Compartir** → **Añadir a pantalla de inicio**.
Se abrirá a pantalla completa, como una app, y guardará el progreso en el teléfono.

## Diccionario

- `data/palabras.js`: las ~111 000 entradas del *Diccionario de la lengua española* (RAE),
  más los femeninos (`abogado, da` → abogado, abogada). Fuente:
  [JorgeDuenasLerin/diccionario-espanol-txt](https://github.com/JorgeDuenasLerin/diccionario-espanol-txt),
  descargado del DLE en 2025.
- `data/frecuentes.js`: las palabras del DLE que son frecuentes (lista de
  [FrequencyWords](https://github.com/hermitdave/FrequencyWords)) y que además son lemas del
  diccionario Hunspell de LibreOffice, para descartar formas verbales y plurales. Sirven para
  elegir las soluciones del Wordle y el objetivo del Lexireto.
- `data/wordle.js`: 1000 soluciones posibles del Wordle.
- `data/pistas.js`: palabras y pistas del crucigrama.

Para regenerarlos (Git Bash o Linux):

```bash
tools/construir-diccionario.sh allwords.txt es_ES.dic es_50k.txt
```

Las palabras que no deben salir como solución del Wordle están en `tools/wordle-excluir.txt`.

## Desarrollo

Sirve la carpeta con cualquier servidor estático (por ejemplo `python -m http.server`) y abre
`http://localhost:8000`. Si cambias archivos, sube `VERSION` en `sw.js` para renovar la caché
sin conexión.
