// Sudoku con cuatro niveles de dificultad
'use strict';

const Sudoku = (() => {
  const NIVELES = {
    facil: { nombre: 'Fácil', pistas: 38, soloSimples: true },
    media: { nombre: 'Media', pistas: 32, soloSimples: true },
    dificil: { nombre: 'Difícil', pistas: 27, soloSimples: false },
    experto: { nombre: 'Experto', pistas: 23, soloSimples: false, avanzado: true }
  };
  const FILA = i => Math.floor(i / 9), COL = i => i % 9, CAJA = i => Math.floor(FILA(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const VECINOS = [];
  for (let i = 0; i < 81; i++) {
    const v = new Set();
    for (let j = 0; j < 81; j++) if (j !== i && (FILA(i) === FILA(j) || COL(i) === COL(j) || CAJA(i) === CAJA(j))) v.add(j);
    VECINOS.push([...v]);
  }
  const bits = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

  // Cuenta soluciones (hasta "limite") por vuelta atrás con máscaras de bits
  function contar(rejilla, limite = 2, rnd = null, salida = null) {
    const g = rejilla.slice();
    const fil = new Array(9).fill(0), col = new Array(9).fill(0), caj = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) if (g[i]) {
      const b = 1 << g[i];
      if ((fil[FILA(i)] | col[COL(i)] | caj[CAJA(i)]) & b) return 0;
      fil[FILA(i)] |= b; col[COL(i)] |= b; caj[CAJA(i)] |= b;
    }
    let total = 0;
    (function buscar() {
      let mejor = -1, mejorMask = 0, minimo = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) {
        const mask = ~(fil[FILA(i)] | col[COL(i)] | caj[CAJA(i)]) & 0x3fe;
        const n = bits(mask);
        if (n < minimo) { minimo = n; mejor = i; mejorMask = mask; if (n <= 1) break; }
      }
      if (mejor < 0) { total++; if (salida) salida.push(g.slice()); return; }
      if (!mejorMask) return;
      let digitos = [];
      for (let d = 1; d <= 9; d++) if (mejorMask & (1 << d)) digitos.push(d);
      if (rnd) U.barajar(digitos, rnd);
      const f = FILA(mejor), c = COL(mejor), k = CAJA(mejor);
      for (const d of digitos) {
        const b = 1 << d;
        g[mejor] = d; fil[f] |= b; col[c] |= b; caj[k] |= b;
        buscar();
        g[mejor] = 0; fil[f] &= ~b; col[c] &= ~b; caj[k] &= ~b;
        if (total >= limite) return;
      }
    })();
    return total;
  }

  // ¿Se resuelve solo con candidatos únicos y casillas únicas?
  function resolubleConSimples(rejilla) {
    const g = rejilla.slice();
    let avance = true;
    while (avance) {
      avance = false;
      const cand = g.map((v, i) => {
        if (v) return 0;
        let m = 0x3fe;
        for (const j of VECINOS[i]) if (g[j]) m &= ~(1 << g[j]);
        return m;
      });
      for (let i = 0; i < 81; i++) if (!g[i] && bits(cand[i]) === 1) {
        g[i] = Math.log2(cand[i]); avance = true;
      }
      if (avance) continue;
      const unidades = [];
      for (let u = 0; u < 9; u++) {
        const f = [], c = [], k = [];
        for (let i = 0; i < 81; i++) { if (FILA(i) === u) f.push(i); if (COL(i) === u) c.push(i); if (CAJA(i) === u) k.push(i); }
        unidades.push(f, c, k);
      }
      for (const uni of unidades) for (let d = 1; d <= 9; d++) {
        const sitios = uni.filter(i => !g[i] && (cand[i] & (1 << d)));
        if (sitios.length === 1 && !uni.some(i => g[i] === d)) { g[sitios[0]] = d; avance = true; }
      }
    }
    return g.every(v => v);
  }

  function generar(nivel) {
    const cfg = NIVELES[nivel];
    const inicio = Date.now();
    let mejor = null;
    do {
      const rnd = Math.random;
      const sol = [];
      contar(new Array(81).fill(0), 1, rnd, sol);
      const solucion = sol[0];
      const g = solucion.slice();
      const orden = U.barajar([...Array(41).keys()], rnd);
      let pistas = 81;
      for (const i of orden) {
        if (pistas <= cfg.pistas) break;
        const par = 80 - i;
        const copia = [g[i], g[par]];
        g[i] = 0; g[par] = 0;
        const quitadas = i === par ? 1 : 2;
        if (contar(g, 2) !== 1 || (cfg.soloSimples && !resolubleConSimples(g))) { g[i] = copia[0]; g[par] = copia[1]; }
        else pistas -= quitadas;
      }
      // En experto se buscan sudokus que no salgan solo con técnicas simples
      const ok = pistas <= cfg.pistas + 1 && (!cfg.avanzado || !resolubleConSimples(g));
      if (!mejor || (ok && !mejor.ok) || (ok === mejor.ok && pistas < mejor.pistas)) mejor = { rejilla: g, solucion, pistas, ok };
    } while (!mejor.ok && Date.now() - inicio < 2500);
    return mejor;
  }

  function ayuda() {
    return `<h2>Cómo se juega</h2>
      <p>Rellena la cuadrícula para que cada fila, cada columna y cada bloque de 3×3 contengan los números del 1 al 9 sin repetirse.</p>
      <ul>
        <li>Toca una casilla y después un número.</li>
        <li>Activa <b>Notas</b> para apuntar candidatos pequeños.</li>
        <li><b>Pista</b> rellena la casilla seleccionada con el número correcto.</li>
        <li>Los números incorrectos aparecen en rojo.</li>
      </ul>
      <p>Hay cuatro niveles: fácil, media, difícil y experto. Tu partida de cada nivel se guarda automáticamente.</p>`;
  }

  function estadoHoy() {
    const n = U.guardado.leer('sudoku.resueltos', 0);
    return n ? `${n} resuelto${n === 1 ? '' : 's'}` : '';
  }

  const ICONOS = {
    deshacer: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    borrar: '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    notas: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 7l4 4" stroke="currentColor" stroke-width="2"/></svg>',
    pista: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  };

  function montar(vista) {
    let nivel = U.guardado.leer('sudoku.nivel', 'facil');
    let p; // partida actual
    let sel = -1, modoNotas = false, reloj = null;

    const raiz = U.el('div', { class: 'juego' });
    const opciones = U.el('div', { class: 'fila-opciones' });
    const chips = {};
    for (const [k, v] of Object.entries(NIVELES)) {
      chips[k] = U.el('button', { class: 'chip', onclick: () => cambiarNivel(k) }, v.nombre);
      opciones.append(chips[k]);
    }
    const info = U.el('div', { class: 'info' });
    const rejilla = U.el('div', { class: 'sudoku-rejilla' });
    const celdas = [];
    for (let i = 0; i < 81; i++) {
      const c = U.el('button', { class: 'celda' + (COL(i) % 3 === 2 ? ' c3' : '') + (FILA(i) % 3 === 2 ? ' f3' : '') + (COL(i) === 8 ? ' c9' : '') + (FILA(i) === 8 ? ' f9' : ''), onclick: () => seleccionar(i) });
      celdas.push(c);
      rejilla.append(c);
    }
    const accion = (nombre, txt, fn) => U.el('button', { class: 'accion', onclick: fn, html: ICONOS[nombre] + `<span>${txt}</span>` });
    const bNotas = accion('notas', 'Notas', () => { modoNotas = !modoNotas; pintarAcciones(); });
    const acciones = U.el('div', { class: 'sudoku-acciones' },
      accion('deshacer', 'Deshacer', deshacer), accion('borrar', 'Borrar', () => poner(0)), bNotas, accion('pista', 'Pista', pista));
    const numeros = U.el('div', { class: 'numeros' });
    const bNum = [];
    for (let d = 1; d <= 9; d++) {
      const b = U.el('button', { onclick: () => poner(d) }, String(d));
      bNum[d] = b;
      numeros.append(b);
    }
    const bNuevo = U.el('button', { class: 'chip', style: 'margin:10px auto 0;display:block', onclick: confirmarNuevo }, 'Nueva partida');
    raiz.append(opciones, info, rejilla, acciones, numeros, bNuevo);
    vista.append(raiz);

    function guardar() { U.guardado.escribir('sudoku.partida.' + nivel, p); }

    function cambiarNivel(k) {
      nivel = k;
      U.guardado.escribir('sudoku.nivel', k);
      for (const [n, c] of Object.entries(chips)) c.classList.toggle('activo', n === k);
      p = U.guardado.leer('sudoku.partida.' + k);
      if (!p || p.resuelto) nueva();
      else { sel = -1; pintar(); }
    }

    function nueva() {
      info.innerHTML = '<span>Generando sudoku…</span>';
      setTimeout(() => {
        const g = generar(nivel);
        p = { inicial: g.rejilla, solucion: g.solucion, valores: g.rejilla.slice(), notas: new Array(81).fill(0), errores: 0, segundos: 0, historial: [], resuelto: false };
        sel = -1;
        guardar();
        pintar();
      }, 30);
    }

    function confirmarNuevo() {
      if (p && !p.resuelto && p.valores.some((v, i) => v && !p.inicial[i])) {
        const c = U.modal.abrir(`<h2>¿Empezar otra partida?</h2><p>Se perderá el progreso del sudoku ${NIVELES[nivel].nombre.toLowerCase()} actual.</p>
          <div class="acciones"><button class="boton" data-a="si">Nueva partida</button><button class="boton sec" data-a="no">Cancelar</button></div>`);
        c.querySelector('[data-a=si]').onclick = () => { U.modal.cerrar(); nueva(); };
        c.querySelector('[data-a=no]').onclick = () => U.modal.cerrar();
      } else nueva();
    }

    function seleccionar(i) { sel = i; pintar(); }

    function poner(d) {
      if (!p || p.resuelto || sel < 0 || p.inicial[sel]) return;
      const antes = { i: sel, v: p.valores[sel], n: p.notas[sel], vec: [] };
      if (modoNotas && d) {
        if (p.valores[sel]) return;
        p.notas[sel] ^= (1 << d);
      } else {
        if (p.valores[sel] === d) return;
        p.valores[sel] = d;
        p.notas[sel] = 0;
        if (d) {
          for (const j of VECINOS[sel]) if (p.notas[j] & (1 << d)) { antes.vec.push([j, p.notas[j]]); p.notas[j] &= ~(1 << d); }
          if (d !== p.solucion[sel]) { p.errores++; navigator.vibrate?.(60); }
        }
      }
      p.historial.push(antes);
      if (p.historial.length > 200) p.historial.shift();
      comprobar();
      guardar();
      pintar();
    }

    function deshacer() {
      if (!p || p.resuelto) return;
      const h = p.historial.pop();
      if (!h) return;
      p.valores[h.i] = h.v; p.notas[h.i] = h.n;
      for (const [j, n] of h.vec) p.notas[j] = n;
      sel = h.i;
      guardar();
      pintar();
    }

    function pista() {
      if (!p || p.resuelto) return;
      if (sel < 0 || p.inicial[sel] || p.valores[sel] === p.solucion[sel]) {
        const vacias = p.valores.map((v, i) => v === p.solucion[i] ? -1 : i).filter(i => i >= 0);
        if (!vacias.length) return;
        sel = vacias[Math.floor(Math.random() * vacias.length)];
      }
      const m = modoNotas; modoNotas = false;
      poner(p.solucion[sel]);
      modoNotas = m;
    }

    function comprobar() {
      if (p.valores.every((v, i) => v === p.solucion[i])) {
        p.resuelto = true;
        U.guardado.escribir('sudoku.resueltos', U.guardado.leer('sudoku.resueltos', 0) + 1);
        const r = U.guardado.leer('sudoku.records', {});
        const record = !r[nivel] || p.segundos < r[nivel];
        if (record) { r[nivel] = p.segundos; U.guardado.escribir('sudoku.records', r); }
        setTimeout(() => {
          const c = U.modal.abrir(`<h2 class="centrado">¡Sudoku resuelto!</h2>
            <p class="centrado">Nivel ${NIVELES[nivel].nombre.toLowerCase()} en <b>${U.formatoTiempo(p.segundos)}</b> con ${p.errores} error${p.errores === 1 ? '' : 'es'}.</p>
            ${record ? '<p class="centrado">🏆 ¡Nuevo récord en este nivel!</p>' : `<p class="centrado">Récord: ${U.formatoTiempo(r[nivel])}</p>`}
            <div class="acciones"><button class="boton" data-a="otra">Otro sudoku</button></div>`);
          c.querySelector('[data-a=otra]').onclick = () => { U.modal.cerrar(); nueva(); };
        }, 300);
      }
    }

    function pintarAcciones() {
      bNotas.classList.toggle('activo', modoNotas);
      bNotas.querySelector('span').textContent = modoNotas ? 'Notas: sí' : 'Notas';
    }

    function pintarInfo() {
      info.innerHTML = `<span>Errores: <b>${p.errores}</b></span><span><b>${NIVELES[nivel].nombre}</b></span><span>⏱ <b>${U.formatoTiempo(p.segundos)}</b></span>`;
    }

    function pintar() {
      if (!p) return;
      pintarInfo();
      const vSel = sel >= 0 ? p.valores[sel] : 0;
      const cuenta = new Array(10).fill(0);
      for (let i = 0; i < 81; i++) {
        const c = celdas[i], v = p.valores[i];
        if (v && v === p.solucion[i]) cuenta[v]++;
        c.className = c.className.replace(/ (fija|zona|igual|sel|error)/g, '');
        if (p.inicial[i]) c.classList.add('fija');
        if (sel >= 0 && i !== sel && (FILA(i) === FILA(sel) || COL(i) === COL(sel) || CAJA(i) === CAJA(sel))) c.classList.add('zona');
        if (vSel && v === vSel && i !== sel) c.classList.add('igual');
        if (i === sel) c.classList.add('sel');
        if (v && v !== p.solucion[i]) c.classList.add('error');
        if (v) c.textContent = v;
        else if (p.notas[i]) {
          c.innerHTML = '<div class="notas">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<span>${p.notas[i] & (1 << d) ? d : ''}</span>`).join('') + '</div>';
        } else c.textContent = '';
      }
      for (let d = 1; d <= 9; d++) bNum[d].disabled = cuenta[d] >= 9;
      pintarAcciones();
    }

    function alTeclear(e) {
      if (!document.getElementById('modal').hidden) return;
      if (/^[1-9]$/.test(e.key)) poner(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') poner(0);
      else if (e.key === 'n') { modoNotas = !modoNotas; pintarAcciones(); }
      else if (e.key.startsWith('Arrow') && sel >= 0) {
        const mov = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        sel = (sel + mov + 81) % 81;
        pintar();
      } else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', alTeclear);

    reloj = setInterval(() => {
      if (!p || p.resuelto || document.hidden || !document.getElementById('modal').hidden) return;
      p.segundos++;
      pintarInfo();
      if (p.segundos % 5 === 0) guardar();
    }, 1000);

    cambiarNivel(nivel);
    return () => {
      clearInterval(reloj);
      document.removeEventListener('keydown', alTeclear);
      if (p) guardar();
    };
  }

  return {
    id: 'sudoku', titulo: 'Sudoku', descripcion: 'Cuatro niveles de dificultad',
    icono: '9', color: '#23406e', datos: [], ayuda, estadoHoy, montar, generar, contar
  };
})();
