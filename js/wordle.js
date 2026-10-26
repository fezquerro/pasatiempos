// La palabra del día: adivina una palabra de cinco letras en seis intentos
'use strict';

const Wordle = (() => {
  const LARGO = 5, INTENTOS = 6;

  function soluciones() {
    const lista = window.SOLUCIONES_WORDLE.split(' ');
    return U.barajar(lista, U.azar('wordle-es'));
  }

  function evaluar(intento, sol) {
    const res = Array(LARGO).fill('gris');
    const resto = {};
    for (let i = 0; i < LARGO; i++) {
      if (intento[i] === sol[i]) res[i] = 'verde';
      else resto[sol[i]] = (resto[sol[i]] || 0) + 1;
    }
    for (let i = 0; i < LARGO; i++) {
      if (res[i] !== 'verde' && resto[intento[i]] > 0) {
        res[i] = 'amarillo';
        resto[intento[i]]--;
      }
    }
    return res;
  }

  function esValida(p, mapa, lista) {
    if (mapa.has(p) || lista.includes(p)) return true;
    // Se admiten también los plurales regulares
    if (p.endsWith('s') && mapa.has(p.slice(0, -1)) && /[aeiou]s$/.test(p)) return true;
    if (p.endsWith('es') && mapa.has(p.slice(0, -2))) return true;
    return false;
  }

  function ayuda() {
    const ej = (palabra, i, color) => '<div class="ejemplo">' + [...palabra].map((l, j) =>
      `<div class="letra ${j === i ? color : ''}">${l}</div>`).join('') + '</div>';
    return `<h2>Cómo se juega</h2>
      <p>Adivina la palabra oculta de cinco letras en seis intentos. Cada intento debe ser una palabra del diccionario de la RAE.</p>
      <p>Después de cada intento, el color de las casillas indica lo cerca que estás:</p>
      ${ej('GATOS', 0, 'verde')}<p><b>G</b> está en la palabra y en la posición correcta.</p>
      ${ej('VOCAL', 2, 'amarillo')}<p><b>C</b> está en la palabra pero en otra posición.</p>
      ${ej('CANTO', 3, 'gris')}<p><b>T</b> no está en la palabra.</p>
      <p>Las tildes no cuentan; la Ñ es una letra distinta de la N. Cada día hay una palabra nueva, y además puedes jugar partidas libres.</p>`;
  }

  function estadoHoy() {
    const e = U.guardado.leer('wordle.diario');
    if (!e || e.clave !== U.hoy()) return '';
    if (e.fin === 'gana') return `✓ ${e.intentos.length}/6`;
    if (e.fin === 'pierde') return 'X/6';
    return e.intentos.length ? 'En curso' : '';
  }

  function montar(vista) {
    const lista = soluciones();
    let modo = 'diario';
    let estado, dic = null, bloqueado = false, actual = '';

    const raiz = U.el('div', { class: 'juego' });
    const opciones = U.el('div', { class: 'fila-opciones' });
    const chipDiario = U.el('button', { class: 'chip activo', onclick: () => cambiarModo('diario') }, 'Palabra del día');
    const chipLibre = U.el('button', { class: 'chip', onclick: () => cambiarModo('libre') }, 'Partida libre');
    const chipStats = U.el('button', { class: 'chip', onclick: () => mostrarStats() }, 'Estadísticas');
    opciones.append(chipDiario, chipLibre, chipStats);
    const tablero = U.el('div', { class: 'wordle-tablero' });
    const rejilla = U.el('div', { class: 'wordle-rejilla' });
    tablero.append(rejilla);
    const filas = [];
    for (let f = 0; f < INTENTOS; f++) {
      const fila = U.el('div', { class: 'wordle-fila' });
      for (let c = 0; c < LARGO; c++) fila.append(U.el('div', { class: 'letra' }));
      filas.push(fila);
      rejilla.append(fila);
    }
    const teclado = crearTeclado(pulsar);
    raiz.append(opciones, tablero, teclado);
    vista.append(raiz);

    U.cargarDiccionario().then(d => { dic = d; });

    function claveGuardado() { return 'wordle.' + modo; }

    function nuevoEstado() {
      if (modo === 'diario') {
        const n = U.numeroDia();
        return { clave: U.hoy(), solucion: lista[((n % lista.length) + lista.length) % lista.length], intentos: [], fin: null };
      }
      return { clave: 'libre', solucion: lista[Math.floor(Math.random() * lista.length)], intentos: [], fin: null };
    }

    function cargar() {
      estado = U.guardado.leer(claveGuardado());
      if (!estado || (modo === 'diario' && estado.clave !== U.hoy())) estado = nuevoEstado();
      actual = '';
      teclado.limpiar();
      pintarTodo();
      if (estado.fin) setTimeout(final, 400);
    }

    function cambiarModo(m) {
      if (m === modo && !(m === 'libre' && estado.fin)) return;
      if (m === 'libre' && modo === 'libre' && estado.fin) {
        U.guardado.borrar('wordle.libre');
      }
      modo = m;
      chipDiario.classList.toggle('activo', m === 'diario');
      chipLibre.classList.toggle('activo', m === 'libre');
      cargar();
    }

    function pintarTodo() {
      filas.forEach((fila, f) => {
        const palabra = estado.intentos[f];
        const colores = palabra ? evaluar(palabra, estado.solucion) : null;
        [...fila.children].forEach((casilla, c) => {
          casilla.className = 'letra';
          casilla.style.animationDelay = '';
          casilla.textContent = palabra ? palabra[c] : '';
          if (colores) {
            casilla.classList.add(colores[c]);
            casilla.style.animation = 'none';
            teclado.colorear(palabra[c], colores[c]);
          } else casilla.style.animation = '';
        });
      });
      pintarActual();
    }

    function pintarActual() {
      const fila = filas[estado.intentos.length];
      if (!fila) return;
      [...fila.children].forEach((casilla, c) => {
        casilla.textContent = actual[c] || '';
        casilla.classList.toggle('llena', !!actual[c]);
      });
    }

    function pulsar(t) {
      if (bloqueado || estado.fin) return;
      if (t === 'borrar') actual = actual.slice(0, -1);
      else if (t === 'enviar') return enviar();
      else if (actual.length < LARGO) actual += t;
      pintarActual();
    }

    function agitar(msg) {
      U.aviso(msg);
      const fila = filas[estado.intentos.length];
      fila.classList.remove('agita');
      void fila.offsetWidth;
      fila.classList.add('agita');
    }

    function enviar() {
      if (actual.length < LARGO) return agitar('Faltan letras');
      if (!dic) return U.aviso('Cargando diccionario…');
      if (!esValida(actual, dic.mapa, lista)) return agitar('No está en el diccionario');
      const fila = filas[estado.intentos.length];
      const colores = evaluar(actual, estado.solucion);
      estado.intentos.push(actual);
      const palabra = actual;
      actual = '';
      bloqueado = true;
      [...fila.children].forEach((casilla, c) => {
        casilla.classList.remove('llena');
        casilla.style.animation = '';
        casilla.style.animationDelay = (c * 0.25) + 's';
        casilla.classList.add(colores[c]);
      });
      if (palabra === estado.solucion) estado.fin = 'gana';
      else if (estado.intentos.length === INTENTOS) estado.fin = 'pierde';
      U.guardado.escribir(claveGuardado(), estado);
      if (estado.fin) registrar();
      setTimeout(() => {
        colores.forEach((c, i) => teclado.colorear(palabra[i], c));
        bloqueado = false;
        if (estado.fin) final();
      }, LARGO * 250 + 300);
    }

    function registrar() {
      const s = U.guardado.leer('wordle.stats.' + modo, { jugadas: 0, ganadas: 0, racha: 0, mejor: 0, dist: [0, 0, 0, 0, 0, 0], ultimo: null });
      s.jugadas++;
      if (estado.fin === 'gana') {
        s.ganadas++;
        s.dist[estado.intentos.length - 1]++;
        const ayer = U.hoy(new Date(Date.now() - 864e5));
        s.racha = (modo === 'libre' || s.ultimo === ayer || s.ultimo === estado.clave) ? s.racha + 1 : 1;
        s.mejor = Math.max(s.mejor, s.racha);
      } else s.racha = 0;
      s.ultimo = estado.clave;
      U.guardado.escribir('wordle.stats.' + modo, s);
    }

    function textoCompartir() {
      const emoji = { verde: '🟩', amarillo: '🟨', gris: '⬜' };
      const cab = modo === 'diario' ? `Palabra del día #${U.numeroDia()}` : 'Wordle libre';
      const res = estado.fin === 'gana' ? estado.intentos.length : 'X';
      const cuadros = estado.intentos.map(p => evaluar(p, estado.solucion).map(c => emoji[c]).join('')).join('\n');
      return `${cab} ${res}/6\n\n${cuadros}`;
    }

    function htmlStats() {
      const s = U.guardado.leer('wordle.stats.' + modo, { jugadas: 0, ganadas: 0, racha: 0, mejor: 0, dist: [0, 0, 0, 0, 0, 0] });
      const max = Math.max(1, ...s.dist);
      const pct = s.jugadas ? Math.round(100 * s.ganadas / s.jugadas) : 0;
      return `<h3>Estadísticas (${modo === 'diario' ? 'palabra del día' : 'partidas libres'})</h3>
        <div class="stats"><div><b>${s.jugadas}</b><span>Jugadas</span></div><div><b>${pct}</b><span>% victorias</span></div>
        <div><b>${s.racha}</b><span>Racha actual</span></div><div><b>${s.mejor}</b><span>Mejor racha</span></div></div>
        <div class="distrib">${s.dist.map((n, i) => `<div>${i + 1}<i class="${estado.fin === 'gana' && estado.intentos.length === i + 1 ? 'hoy' : ''}" style="width:${8 + 92 * n / max}%">${n}</i></div>`).join('')}</div>`;
    }

    function mostrarStats() { U.modal.abrir(htmlStats()); }

    function final() {
      const sol = dic ? (dic.mapa.get(estado.solucion) || estado.solucion) : estado.solucion;
      const titulo = estado.fin === 'gana'
        ? ['¡Genial!', '¡Magnífico!', '¡Impresionante!', '¡Muy bien!', '¡Bien!', '¡Por los pelos!'][estado.intentos.length - 1]
        : 'Otra vez será';
      const c = U.modal.abrir(`<h2 class="centrado">${titulo}</h2>
        <p class="centrado">La palabra era <b style="text-transform:uppercase">${sol}</b></p>
        <p class="centrado"><a href="https://dle.rae.es/${encodeURIComponent(sol)}" target="_blank" rel="noopener">Ver definición en el DLE</a></p>
        ${htmlStats()}
        <div class="acciones"><button class="boton" data-a="compartir">Compartir</button><button class="boton sec" data-a="otra">Partida libre</button></div>`);
      c.querySelector('[data-a=compartir]').onclick = () => U.compartir(textoCompartir());
      c.querySelector('[data-a=otra]').onclick = () => {
        U.modal.cerrar();
        if (modo === 'libre') U.guardado.borrar('wordle.libre');
        modo = 'diario';
        cambiarModo('libre');
      };
    }

    function alTeclear(e) {
      if (!document.getElementById('modal').hidden) return;
      const t = teclaFisica(e);
      if (t) { e.preventDefault(); pulsar(t); }
    }
    document.addEventListener('keydown', alTeclear);

    cargar();
    return () => document.removeEventListener('keydown', alTeclear);
  }

  return {
    id: 'wordle', titulo: 'Palabra del día', descripcion: 'Adivina la palabra de cinco letras',
    icono: 'W', color: '#4e9a5f', datos: ['data/wordle.js'], ayuda, estadoHoy, montar
  };
})();
