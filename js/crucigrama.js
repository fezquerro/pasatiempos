// Crucigrama generado a partir del banco de palabras y pistas
'use strict';

const Crucigrama = (() => {
  const MAX_LADO = 11, MAX_PALABRAS = 26, MAX_CORTAS = 3, INTENTOS = 24;
  const N = 2 * MAX_LADO + 1; // tablero de trabajo; la primera palabra va en el centro
  // Versión del generador: si cambia, las partidas guardadas con otra versión se reinician
  const VERSION = 2;

  function leer(texto) {
    return texto.trim().split('\n').map(l => {
      const [p, pista] = l.split('|');
      return { palabra: U.norm(p.trim()), pista: pista.trim() };
    }).filter(e => e.palabra.length >= 3 && e.palabra.length <= MAX_LADO);
  }

  // Cada intento usa una selección al azar del banco: 170 palabras difíciles y 30 fáciles
  let bancos = null;
  function seleccion(rnd) {
    bancos ||= [leer(window.PISTAS_DIFICILES), leer(window.PISTAS)];
    const dificiles = U.barajar(bancos[0].slice(), rnd).slice(0, 170);
    const faciles = U.barajar(bancos[1].slice(), rnd).slice(0, 30);
    return [...dificiles, ...faciles];
  }

  function intentar(lista, rnd) {
    const tab = new Array(N * N).fill('');
    const sentidos = new Uint8Array(N * N); // 1: casilla de una horizontal, 2: de una vertical
    const porLetra = {}; // letra -> casillas del tablero que la contienen
    const colocadas = [];
    const usadas = new Set();
    let cortas = 0; // palabras de tres letras colocadas
    let minF = MAX_LADO, maxF = MAX_LADO, minC = MAX_LADO, maxC = MAX_LADO;

    function poner(e, f, c, dir) {
      const [df, dc] = dir === 'h' ? [0, 1] : [1, 0];
      for (let i = 0; i < e.palabra.length; i++) {
        const idx = (f + i * df) * N + c + i * dc;
        if (!tab[idx]) { tab[idx] = e.palabra[i]; (porLetra[e.palabra[i]] ||= []).push(idx); }
        sentidos[idx] |= dir === 'h' ? 1 : 2;
      }
      minF = Math.min(minF, f); minC = Math.min(minC, c);
      maxF = Math.max(maxF, f + (e.palabra.length - 1) * df); maxC = Math.max(maxC, c + (e.palabra.length - 1) * dc);
      colocadas.push({ ...e, f, c, dir });
      usadas.add(e.palabra);
      if (e.palabra.length === 3) cortas++;
    }

    const libre = (f, c) => f < 0 || c < 0 || f >= N || c >= N || !tab[f * N + c];

    // Devuelve el número de cruces de la palabra en esa posición, o -1 si no cabe
    function evaluar(p, f, c, dir) {
      const [df, dc] = dir === 'h' ? [0, 1] : [1, 0];
      const n = p.length, fF = f + (n - 1) * df, fC = c + (n - 1) * dc;
      if (f < 0 || c < 0 || fF >= N || fC >= N) return -1;
      if (Math.max(maxF, fF) - Math.min(minF, f) >= MAX_LADO || Math.max(maxC, fC) - Math.min(minC, c) >= MAX_LADO) return -1;
      if (!libre(f - df, c - dc) || !libre(fF + df, fC + dc)) return -1;
      let cruces = 0;
      const sentido = dir === 'h' ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const ff = f + i * df, cc = c + i * dc, actual = tab[ff * N + cc];
        if (actual) {
          // Solo se puede cruzar una palabra perpendicular, nunca solaparse con una paralela
          if (actual !== p[i] || (sentidos[ff * N + cc] & sentido)) return -1;
          cruces++;
        } else if (!libre(ff + dc, cc + df) || !libre(ff - dc, cc - df)) return -1;
      }
      return cruces === n ? -1 : cruces;
    }

    const largas = lista.filter(e => e.palabra.length >= 7 && e.palabra.length <= 10);
    const primera = largas[Math.floor(rnd() * largas.length)] || lista[0];
    poner(primera, MAX_LADO, MAX_LADO - (primera.palabra.length >> 1), 'h');

    // En cada paso se coloca, de todas las palabras, la que más letras comparte
    while (colocadas.length < MAX_PALABRAS) {
      let mejor = null;
      for (const e of lista) {
        if (usadas.has(e.palabra)) continue;
        if (e.palabra.length === 3 && cortas >= MAX_CORTAS) continue;
        const p = e.palabra;
        for (let i = 0; i < p.length; i++) {
          const sitios = porLetra[p[i]];
          if (!sitios) continue;
          for (const idx of sitios) {
            const cf = Math.floor(idx / N), cc = idx % N;
            for (const dir of ['h', 'v']) {
              const f = dir === 'h' ? cf : cf - i, c = dir === 'h' ? cc - i : cc;
              const cruces = evaluar(p, f, c, dir);
              if (cruces <= 0) continue;
              // Prima los cruces; a igualdad, palabras no muy largas y cerca del centro
              const valor = cruces * cruces * 14 - p.length / 2 + rnd() * 5 - Math.abs(f - MAX_LADO) - Math.abs(c - MAX_LADO);
              if (!mejor || valor > mejor.valor) mejor = { e, f, c, dir, valor };
            }
          }
        }
      }
      if (!mejor) break;
      poner(mejor.e, mejor.f, mejor.c, mejor.dir);
    }

    // Puntuación: muchas letras compartidas y pocas palabras con un solo cruce
    const usos = new Map();
    for (const p of colocadas) for (let i = 0; i < p.palabra.length; i++) {
      const idx = (p.f + (p.dir === 'v' ? i : 0)) * N + p.c + (p.dir === 'h' ? i : 0);
      usos.set(idx, (usos.get(idx) || 0) + 1);
    }
    const compartidas = [...usos.values()].filter(u => u > 1).length;
    let unCruce = 0;
    for (const p of colocadas) {
      let n = 0;
      for (let i = 0; i < p.palabra.length; i++) {
        if (usos.get((p.f + (p.dir === 'v' ? i : 0)) * N + p.c + (p.dir === 'h' ? i : 0)) > 1) n++;
      }
      if (n === 1) unCruce++;
    }
    for (const p of colocadas) { p.f -= minF; p.c -= minC; }
    return {
      colocadas, filas: maxF - minF + 1, cols: maxC - minC + 1, compartidas, letras: usos.size, unCruce,
      valor: compartidas * 10 + usos.size - unCruce * 8
    };
  }

  function generar(semilla) {
    const rnd = U.azar('cruci-' + VERSION + '-' + semilla);
    let mejor = null;
    for (let i = 0; i < INTENTOS; i++) {
      const r = intentar(seleccion(rnd), rnd);
      if (!mejor || r.valor > mejor.valor) mejor = r;
    }
    // Numeración en orden de lectura
    const inicios = new Map();
    for (const p of mejor.colocadas) inicios.set(p.f * 100 + p.c, true);
    const orden = [...inicios.keys()].sort((a, b) => a - b);
    const numero = new Map(orden.map((v, i) => [v, i + 1]));
    for (const p of mejor.colocadas) p.num = numero.get(p.f * 100 + p.c);
    mejor.colocadas.sort((a, b) => a.num - b.num);
    const sol = Array.from({ length: mejor.filas }, () => Array(mejor.cols).fill(null));
    for (const p of mejor.colocadas) for (let i = 0; i < p.palabra.length; i++) {
      sol[p.f + (p.dir === 'v' ? i : 0)][p.c + (p.dir === 'h' ? i : 0)] = p.palabra[i];
    }
    return { palabras: mejor.colocadas, filas: mejor.filas, cols: mejor.cols, sol };
  }

  function ayuda() {
    return `<h2>Cómo se juega</h2>
      <p>Rellena la cuadrícula con las palabras que corresponden a cada pista.</p>
      <ul>
        <li>Toca una casilla para seleccionarla; tócala otra vez para cambiar entre <b>horizontal</b> y <b>vertical</b>.</li>
        <li>Toca una pista de la lista para ir a su palabra, o usa las flechas de la barra de pista.</li>
        <li><b>Comprobar</b> marca en rojo las letras equivocadas.</li>
        <li><b>Revelar</b> descubre una letra, una palabra o el crucigrama entero.</li>
      </ul>
      <p>Las tildes no se escriben. Cada día hay un crucigrama nuevo y puedes generar otros libres.</p>`;
  }

  function estadoHoy() {
    const e = U.guardado.leer('crucigrama.diario');
    if (!e || e.semilla !== U.hoy() || e.v !== VERSION) return '';
    return e.resuelto ? '✓ Resuelto' : Object.keys(e.letras).length ? 'En curso' : '';
  }

  function montar(vista) {
    let modo = 'diario', cruci, estado, sel = null, dir = 'h', reloj;
    const raiz = U.el('div', { class: 'juego' });
    const chipDiario = U.el('button', { class: 'chip activo', onclick: () => cambiarModo('diario') }, 'Del día');
    const chipLibre = U.el('button', { class: 'chip', onclick: () => cambiarModo('libre') }, 'Libre');
    const chipComprobar = U.el('button', { class: 'chip', onclick: comprobar }, 'Comprobar');
    const chipRevelar = U.el('button', { class: 'chip', onclick: revelar }, 'Revelar');
    const zona = U.el('div', { class: 'cruci-zona' });
    const rejilla = U.el('div', { class: 'cruci-rejilla' });
    const listas = U.el('div', { class: 'cruci-listas' });
    zona.append(rejilla, listas);
    const txtPista = U.el('div', { class: 'txt' });
    const barra = U.el('div', { class: 'cruci-pista' },
      U.el('button', { 'aria-label': 'Pista anterior', onclick: () => saltar(-1) }, '‹'), txtPista,
      U.el('button', { 'aria-label': 'Pista siguiente', onclick: () => saltar(1) }, '›'));
    const teclado = crearTeclado(pulsar, { conEnviar: false });
    teclado.querySelectorAll('.tecla').forEach(t => { t.style.height = '48px'; });
    raiz.append(U.el('div', { class: 'fila-opciones' }, chipDiario, chipLibre, chipComprobar, chipRevelar), zona, barra, teclado);
    vista.append(raiz);
    let casillas = [];

    function guardar() { U.guardado.escribir('crucigrama.' + modo, estado); }

    function cargar() {
      estado = U.guardado.leer('crucigrama.' + modo);
      if (estado && estado.v !== VERSION) estado = null;
      if (modo === 'diario' && (!estado || estado.semilla !== U.hoy())) estado = { v: VERSION, semilla: U.hoy(), letras: {}, reveladas: [], segundos: 0, resuelto: false };
      if (modo === 'libre' && !estado) estado = { v: VERSION, semilla: 'libre-' + Date.now(), letras: {}, reveladas: [], segundos: 0, resuelto: false };
      cruci = generar(estado.semilla);
      const p = cruci.palabras[0];
      sel = [p.f, p.c]; dir = p.dir;
      construir();
      pintar();
    }

    function cambiarModo(m) {
      if (m === 'libre' && modo === 'libre') {
        const c = U.modal.abrir(`<h2>¿Nuevo crucigrama?</h2><p>Se generará un crucigrama libre distinto.</p>
          <div class="acciones"><button class="boton" data-a="si">Nuevo</button><button class="boton sec" data-a="no">Cancelar</button></div>`);
        c.querySelector('[data-a=si]').onclick = () => { U.modal.cerrar(); U.guardado.borrar('crucigrama.libre'); cargar(); };
        c.querySelector('[data-a=no]').onclick = () => U.modal.cerrar();
        return;
      }
      if (m === modo) return;
      modo = m;
      chipDiario.classList.toggle('activo', m === 'diario');
      chipLibre.classList.toggle('activo', m === 'libre');
      cargar();
    }

    function construir() {
      const ancho = Math.min(zona.clientWidth || 340, 540) - 6;
      const lado = Math.max(24, Math.min(40, Math.floor(ancho / cruci.cols)));
      rejilla.style.gridTemplateColumns = `repeat(${cruci.cols}, ${lado}px)`;
      rejilla.style.gridAutoRows = lado + 'px';
      rejilla.style.fontSize = Math.round(lado * 0.55) + 'px';
      rejilla.innerHTML = '';
      casillas = [];
      const nums = new Map(cruci.palabras.map(p => [p.f + ',' + p.c, p.num]));
      for (let f = 0; f < cruci.filas; f++) {
        casillas.push([]);
        for (let c = 0; c < cruci.cols; c++) {
          const negra = !cruci.sol[f][c];
          const b = U.el('button', { class: 'casilla' + (negra ? ' negra' : ''), disabled: negra ? '' : false });
          if (!negra) b.addEventListener('click', () => tocar(f, c));
          const n = nums.get(f + ',' + c);
          b.append(U.el('span', { class: 'num' }, n ? String(n) : ''), U.el('span', { class: 'l' }));
          casillas[f].push(b);
          rejilla.append(b);
        }
      }
      listas.innerHTML = '';
      for (const [d, nombre] of [['h', 'Horizontales'], ['v', 'Verticales']]) {
        const ol = U.el('ol');
        for (const p of cruci.palabras.filter(p => p.dir === d)) {
          const li = U.el('li', { onclick: () => { sel = [p.f, p.c]; dir = p.dir; pintar(); } }, U.el('b', {}, String(p.num)), p.pista + ` (${p.palabra.length})`);
          p.li = li;
          ol.append(li);
        }
        listas.append(U.el('div', {}, U.el('h3', {}, nombre), ol));
      }
    }

    const tiene = (f, c) => f >= 0 && c >= 0 && f < cruci.filas && c < cruci.cols && !!cruci.sol[f][c];

    function palabraEn(f, c, d) {
      return cruci.palabras.find(p => p.dir === d && (d === 'h'
        ? p.f === f && c >= p.c && c < p.c + p.palabra.length
        : p.c === c && f >= p.f && f < p.f + p.palabra.length));
    }

    function celdasDe(p) {
      return [...p.palabra].map((_, i) => p.dir === 'h' ? [p.f, p.c + i] : [p.f + i, p.c]);
    }

    function tocar(f, c) {
      if (sel && sel[0] === f && sel[1] === c) {
        const otra = dir === 'h' ? 'v' : 'h';
        if (palabraEn(f, c, otra)) dir = otra;
      } else {
        sel = [f, c];
        if (!palabraEn(f, c, dir)) dir = dir === 'h' ? 'v' : 'h';
      }
      pintar();
    }

    function saltar(paso) {
      const actual = palabraEn(sel[0], sel[1], dir);
      const i = cruci.palabras.indexOf(actual);
      const orden = [...cruci.palabras.filter(p => p.dir === 'h'), ...cruci.palabras.filter(p => p.dir === 'v')];
      const j = (orden.indexOf(cruci.palabras[i]) + paso + orden.length) % orden.length;
      const p = orden[j];
      const vacia = celdasDe(p).find(([f, c]) => !estado.letras[f + ',' + c]);
      sel = vacia || [p.f, p.c]; dir = p.dir;
      pintar();
    }

    function pulsar(t) {
      if (!sel || estado.resuelto) return;
      const [f, c] = sel;
      const clave = f + ',' + c;
      const [df, dc] = dir === 'h' ? [0, 1] : [1, 0];
      if (t === 'borrar') {
        if (estado.letras[clave] && !estado.reveladas.includes(clave)) delete estado.letras[clave];
        else if (tiene(f - df, c - dc)) {
          sel = [f - df, c - dc];
          const k2 = sel.join(',');
          if (!estado.reveladas.includes(k2)) delete estado.letras[k2];
        }
      } else {
        if (!estado.reveladas.includes(clave)) estado.letras[clave] = t;
        delete estado.mal?.[clave];
        if (tiene(f + df, c + dc)) sel = [f + df, c + dc];
        else {
          // Fin de palabra: salta a la siguiente casilla vacía de la palabra si la hay
          const p = palabraEn(f, c, dir);
          const vacia = celdasDe(p).find(([ff, cc]) => !estado.letras[ff + ',' + cc]);
          if (vacia) sel = vacia;
        }
      }
      guardar();
      pintar();
      comprobarFin();
    }

    function comprobar() {
      estado.mal = {};
      let errores = 0;
      for (const [clave, l] of Object.entries(estado.letras)) {
        const [f, c] = clave.split(',').map(Number);
        if (cruci.sol[f][c] !== l) { estado.mal[clave] = true; errores++; }
      }
      U.aviso(errores ? `${errores} letra${errores === 1 ? '' : 's'} incorrecta${errores === 1 ? '' : 's'}` : 'Todo correcto hasta ahora');
      guardar();
      pintar();
    }

    function revelarCeldas(lista) {
      for (const [f, c] of lista) {
        const k = f + ',' + c;
        if (estado.letras[k] !== cruci.sol[f][c]) {
          estado.letras[k] = cruci.sol[f][c];
          if (!estado.reveladas.includes(k)) estado.reveladas.push(k);
        }
        if (estado.mal) delete estado.mal[k];
      }
      guardar();
      pintar();
      comprobarFin();
    }

    function revelar() {
      if (estado.resuelto) return;
      const c = U.modal.abrir(`<h2>Revelar</h2><div class="acciones">
        <button class="boton sec" data-a="letra">Letra</button><button class="boton sec" data-a="palabra">Palabra</button><button class="boton sec" data-a="todo">Todo</button></div>`);
      c.querySelector('[data-a=letra]').onclick = () => { U.modal.cerrar(); revelarCeldas([sel]); };
      c.querySelector('[data-a=palabra]').onclick = () => { U.modal.cerrar(); revelarCeldas(celdasDe(palabraEn(sel[0], sel[1], dir))); };
      c.querySelector('[data-a=todo]').onclick = () => {
        U.modal.cerrar();
        revelarCeldas(cruci.palabras.flatMap(celdasDe));
      };
    }

    function comprobarFin() {
      if (estado.resuelto) return;
      for (let f = 0; f < cruci.filas; f++) for (let c = 0; c < cruci.cols; c++) {
        if (cruci.sol[f][c] && estado.letras[f + ',' + c] !== cruci.sol[f][c]) return;
      }
      estado.resuelto = true;
      guardar();
      pintar();
      const ayudas = estado.reveladas.length;
      setTimeout(() => {
        const c = U.modal.abrir(`<h2 class="centrado">¡Crucigrama completado!</h2>
          <p class="centrado">Tiempo: <b>${U.formatoTiempo(estado.segundos)}</b>${ayudas ? ` · ${ayudas} letra${ayudas === 1 ? '' : 's'} revelada${ayudas === 1 ? '' : 's'}` : ' · ¡sin ayudas!'}</p>
          <div class="acciones"><button class="boton" data-a="otro">Crucigrama libre</button></div>`);
        c.querySelector('[data-a=otro]').onclick = () => {
          U.modal.cerrar();
          U.guardado.borrar('crucigrama.libre');
          modo = 'diario';
          cambiarModo('libre');
        };
      }, 300);
    }

    function pintar() {
      const actual = palabraEn(sel[0], sel[1], dir);
      const enPalabra = new Set(celdasDe(actual).map(x => x.join(',')));
      for (let f = 0; f < cruci.filas; f++) for (let c = 0; c < cruci.cols; c++) {
        if (!cruci.sol[f][c]) continue;
        const b = casillas[f][c], k = f + ',' + c;
        b.querySelector('.l').textContent = estado.letras[k] || '';
        b.classList.toggle('palabra', enPalabra.has(k));
        b.classList.toggle('sel', sel[0] === f && sel[1] === c);
        b.classList.toggle('mal', !!estado.mal?.[k]);
        b.classList.toggle('revelada', estado.reveladas.includes(k));
      }
      txtPista.innerHTML = `<b>${actual.num}${actual.dir === 'h' ? 'H' : 'V'}</b>${actual.pista}`;
      for (const p of cruci.palabras) {
        p.li.classList.toggle('actual', p === actual);
        p.li.classList.toggle('hecha', celdasDe(p).every(([f, c]) => estado.letras[f + ',' + c]));
      }
    }

    function alTeclear(e) {
      if (!document.getElementById('modal').hidden || !sel) return;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const d = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'h' : 'v';
        const paso = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        if (d !== dir && palabraEn(sel[0], sel[1], d)) { dir = d; pintar(); return; }
        let [f, c] = sel;
        do { f += d === 'v' ? paso : 0; c += d === 'h' ? paso : 0; } while (f >= 0 && c >= 0 && f < cruci.filas && c < cruci.cols && !tiene(f, c));
        if (tiene(f, c)) { sel = [f, c]; if (!palabraEn(f, c, dir)) dir = d; pintar(); }
        return;
      }
      const t = teclaFisica(e);
      if (t && t !== 'enviar') { e.preventDefault(); pulsar(t); }
    }
    document.addEventListener('keydown', alTeclear);

    reloj = setInterval(() => {
      if (!estado || estado.resuelto || document.hidden || !document.getElementById('modal').hidden) return;
      estado.segundos++;
      if (estado.segundos % 5 === 0) guardar();
    }, 1000);

    cargar();
    return () => { clearInterval(reloj); document.removeEventListener('keydown', alTeclear); if (estado) guardar(); };
  }

  return {
    id: 'crucigrama', titulo: 'Crucigrama', descripcion: 'Un crucigrama nuevo cada día',
    icono: '✎', color: '#cf4f43', datos: ['data/pistas.js', 'data/pistas-dificiles.js'], ayuda, estadoHoy, montar, generar
  };
})();
