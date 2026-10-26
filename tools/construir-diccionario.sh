#!/usr/bin/env bash
# Genera data/palabras.js y data/frecuentes.js a partir de:
#   - allwords.txt  : lemas del Diccionario de la lengua española (RAE)
#                     https://github.com/JorgeDuenasLerin/diccionario-espanol-txt
#   - es_ES.dic     : diccionario Hunspell (solo se usa como filtro de lemas)
#                     https://github.com/LibreOffice/dictionaries/tree/master/es
#   - es_50k.txt    : lista de frecuencias (OpenSubtitles)
#                     https://github.com/hermitdave/FrequencyWords
# Uso: tools/construir-diccionario.sh <allwords.txt> <es_ES.dic> <es_50k.txt>
set -euo pipefail
export LC_ALL=C.UTF-8
DLE="$1"
HUNSPELL="$2"
FREQ="$3"
OUT="$(dirname "$0")/../data"
mkdir -p "$OUT"

# 1) Lemas en minúscula + formas femeninas ("abogado, da" -> abogado, abogada)
awk -F', ' '
function sinTilde(s) {
  gsub(/á/,"a",s); gsub(/é/,"e",s); gsub(/í/,"i",s); gsub(/ó/,"o",s); gsub(/ú/,"u",s); return s
}
function femenino(m, suf,   c, i, pre) {
  if (suf == "a") {
    if (m ~ /o$/) return substr(m, 1, length(m)-1) "a"
    pre = m
  } else {
    c = substr(suf, 1, 1)
    pre = ""
    for (i = length(m); i >= 1; i--) if (substr(m, i, 1) == c) { pre = substr(m, 1, i-1); break }
    if (pre == "") return ""
  }
  # alemán -> alemana, francés -> francesa, bailarín -> bailarina
  if (m ~ /[áéíóú][nslz]?$/) {
    n = length(pre)
    pre = substr(pre, 1, n-2) sinTilde(substr(pre, n-1))
  }
  return pre suf
}
/^-|-$/ { next }
{
  m = $1
  if (m !~ /^[a-zñáéíóúü]+$/) next
  print m
  if (NF == 2 && $2 ~ /^[a-zñáéíóúü]+$/) {
    f = femenino(m, $2)
    if (f != "") print f
  }
}' "$DLE" | awk 'length($0) >= 3' | sort -u > "$OUT/.palabras.txt"

# 2) Palabras frecuentes que además están en el DLE (para soluciones y
#    objetivos). Para quitar formas verbales y plurales que se cuelan en la
#    lista del DLE, deben ser también lemas del diccionario Hunspell es_ES
#    (o el femenino de uno). Se descartan además las acabadas en vocal con
#    tilde (pensé, salió...) salvo las de AGUDAS, y las palabras malsonantes.
AGUDAS="qué aquí así ahí allí mamá papá quizá allá bebé café acá ojalá sofá comité ajá menú maní puré esquí hindú vudú carné bisturí champú israelí bambú jabalí gurú plató maniquí dominó olé chimpancé rubí iraní paté iraquí tabú frenesí acné cucú carmesí corsé"
MALSONANTES="mamada cachonda cachondo condón guarra guarro puta puto putada polla coño joder mierda cagar cagada culo follar folla zorra cabrón cabrona gilipollas hostia ostia pene vagina teta tetas pedo mear meada semen porno verga capullo"
awk -v agudas="$AGUDAS" -v malas="$MALSONANTES" '
  BEGIN { n = split(agudas, a, " "); for (i = 1; i <= n; i++) ok[a[i]] = 1
          n = split(malas, a, " "); for (i = 1; i <= n; i++) mal[a[i]] = 1 }
  FILENAME == ARGV[1] { dle[$0] = 1; next }
  FILENAME == ARGV[2] { sub(/\/.*/, ""); sub(/\r$/, ""); lema[$0] = 1; next }
  {
    w = $1
    if (!(w in dle) || (w in mal)) next
    if (w ~ /[áéíóú]$/ && !(w in ok)) next
    m = substr(w, 1, length(w) - 1)
    if ((w in lema) || (w ~ /a$/ && ((m "o") in lema || m in lema))) print w
  }' "$OUT/.palabras.txt" "$HUNSPELL" "$FREQ" > "$OUT/.frecuentes.txt"

{
  printf 'window.PALABRAS="'
  tr '\n' ' ' < "$OUT/.palabras.txt" | sed 's/ $//'
  printf '";\n'
} > "$OUT/palabras.js"

{
  printf '// Palabras del DLE ordenadas de más a menos frecuentes\nwindow.FRECUENTES="'
  tr '\n' ' ' < "$OUT/.frecuentes.txt" | sed 's/ $//'
  printf '";\n'
} > "$OUT/frecuentes.js"

wc -l "$OUT/.palabras.txt" "$OUT/.frecuentes.txt"
rm "$OUT/.palabras.txt" "$OUT/.frecuentes.txt"

# 3) Soluciones del Wordle: palabras de 5 letras frecuentes, sin formas
#    verbales con tilde final, sin plurales y sin la lista de exclusión.
tr ' ' '\n' < "$OUT/frecuentes.js" | sed 1d | sed 's/^window.FRECUENTES="//; s/";$//' \
| awk -v excl="$(dirname "$0")/wordle-excluir.txt" -v todas="$OUT/palabras.js" '
function norm(s) { gsub(/á/,"a",s); gsub(/é/,"e",s); gsub(/í/,"i",s); gsub(/ó/,"o",s); gsub(/[úü]/,"u",s); return s }
BEGIN {
  while ((getline l < excl) > 0) { n = split(l, a, " "); for (i = 1; i <= n; i++) no[a[i]] = 1 }
  RS = " "; while ((getline w < todas) > 0) dle[w] = 1; RS = "\n"
}
length($0) == 5 && !($0 in no) && $0 !~ /[éíó]$/ {
  if ($0 ~ /s$/ && ((substr($0,1,4) in dle) || (substr($0,1,3) in dle))) next
  w = norm($0)
  if (w in visto) next
  visto[w] = 1
  print w
  if (++c >= 1000) exit
}' > "$OUT/.wordle.txt"
{
  printf '// Soluciones posibles del Wordle (palabras comunes del DLE, sin tildes)\nwindow.SOLUCIONES_WORDLE="'
  tr '\n' ' ' < "$OUT/.wordle.txt" | sed 's/ $//'
  printf '";\n'
} > "$OUT/wordle.js"
wc -l "$OUT/.wordle.txt"
rm "$OUT/.wordle.txt"
