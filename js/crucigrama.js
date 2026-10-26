// Crucigrama generado a partir del banco de palabras y pistas
'use strict';

const Crucigrama = (() => {
  const MAX_LADO = 11, OBJETIVO = 16;

  function banco() {
    return window.PISTAS.trim().split('\n').map(l => {
      const [p, pista] = l.split('|');
      return { palabra: U.norm(p.trim()), pista: pista.trim() };
    }).filter(e => e.palabra.length >= 3 && e.palabra.length <= MAX_LADO);
  }

  function intentar(lista, rnd) {
    const celdas = new Map(); // "f,c" -> letra
    const colocadas = [];
    let minF = 0, maxF = 0, minC = 0, maxC = 0;
    const k = (f, c) => f + ',' + c;

    function poner(e, f, c, dir) {
      const [df, dc] = dir === 'h' ? [0, 1] : [1, 0];
      for (let i = 0; i < e.palabra.length; i++) celdas.set(k(f + i * df, c + i * dc), e.palabra[i]);
      minF = Math.min(minF, f); minC = Math.min(minC, c);
      maxF = Math.max(maxF, f + (e.palabra.length - 1) * df); maxC = Math.max(maxC, c + (e.palabra.length - 1) * dc);
      colocadas.push({ ...e, f, c, dir });
    }

    function evaluar(p, f, c, dir) {
      const [df, dc] = dir === 'h' ? [0, 1] : [1, 0];
      const n = p.length;
      if (celdas.has(k(f - df, c - dc)) || celdas.has(k(f + n * df, c + n * dc))) return -1;
      const fF = f + (n - 1) * df, fC = c + (n - 1) * dc;
      if (Math.max(maxF, fF) - Math.min(minF, f) >= MAX_LADO || Math.max(maxC, fC) - Math.min(minC, c) >= MAX_LADO) return -1;
      let cruces = 0;
      for (let i = 0; i < n; i++) {
        const ff = f + i * df, cc = c + i * dc;
        const actual = celdas.get(k(ff, cc));
        if (actual) {
          if (actual !== p[i]) return -1;
          cruces++;
        } else if (celdas.has(k(ff + dc, cc + df)) || celdas.has(k(ff - dc, cc - df))) return -1;
      }
      return cruces === n ? -1 : cruces;
    }

    const primera = lista.find(e => e.palabra.length >= 6 && e.palabra.length <= 9) || lista[0];
    poner(primera, 0, 0, 'h');
    const usadas = new Set([primera.palabra]);

    for (let pasada = 0; pasada < 2 && colocadas.length < OBJETIVO; pasada++) {
      for (const e of lista) {
        if (colocadas.length >= OBJETIVO) break;
        if (usadas.has(e.palabra)) continue;
        let mejor = null;
        for (const [clave, letra] of celdas) {
          const [cf, cc] = clave.split(',').map(Number);
          for (let i = 0; i < e.palabra.length; i++) {
            if (e.palabra[i] !== letra) continue;
            for (const dir of ['h', 'v']) {
              const f = dir === 'h' ? cf : cf - i, c = dir === 'h' ? cc - i : cc;
              const cruces = evaluar(e.palabra, f, c, dir);
              if (cruces > 0) {
                const valor = cruces * 10 + rnd() * 5;
                if (!mejor || valor > mejor.valor) mejor = { f, c, dir, valor };
              }
            }
          }
        }
        if (mejor) { poner(e, mejor.f, mejor.c, mejor.dir); usadas.add(e.palabra); }
      }
    }
    // Normaliza coordenadas
    for (const p of colocadas) { p.f -= minF; p.c -= minC; }
    const filas = maxF - minF + 1, cols = maxC - minC + 1;
    const letras = [...celdas.values()].length;
    return { colocadas, filas, cols, valor: colocadas.length * 100 + letras * 2 - (filas * cols) * 0.5 };
  }

  function generar(semilla) {
    const rnd = U.azar('cruci-' + semilla);
    const base = banco();
    let mejor = null;
    for (let i = 0; i < 25; i++) {
      const r = intentar(U.barajar(base.slice(), rnd), rnd);
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
    if (!e || e.semilla !== U.hoy()) return '';
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
      if (modo === 'diario' && (!estado || estado.semilla !== U.hoy())) estado = { semilla: U.hoy(), letras: {}, reveladas: [], segundos: 0, resuelto: false };
      if (modo === 'libre' && !estado) estado = { semilla: 'libre-' + Date.now(), letras: {}, reveladas: [], segundos: 0, resuelto: false };
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
    icono: '✎', color: '#cf4f43', datos: ['data/pistas.js'], ayuda, estadoHoy, montar, generar
  };
})();
