// Lexireto: forma palabras con siete letras usando siempre la central
'use strict';

const Lexireto = (() => {
  const ABC = 'abcdefghijklmnñopqrstuvwxyz';
  const BIT = {};
  [...ABC].forEach((l, i) => { BIT[l] = 1 << i; });
  const RANGOS = [
    [0, 'Principiante'], [0.03, 'Aprendiz'], [0.08, 'Avanzado'], [0.15, 'Bien'], [0.25, 'Muy bien'],
    [0.38, 'Notable'], [0.52, 'Excelente'], [0.7, 'Genio'], [1, 'Académico']
  ];

  function mascara(p) {
    let m = 0;
    for (const l of p) { if (!(l in BIT)) return -1; m |= BIT[l]; }
    return m;
  }
  const bits = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

  function puntos(p, esPangrama) {
    const base = p.length === 3 ? 1 : p.length === 4 ? 2 : p.length;
    return base + (esPangrama ? 7 : 0);
  }

  // Índice: palabras del diccionario con su máscara de letras (se calcula una vez)
  let indice = null;
  function crearIndice(dic) {
    if (indice) return indice;
    const palabras = [], mascaras = [];
    for (const p of dic.mapa.keys()) {
      if (p.length < 3) continue;
      const m = mascara(p);
      if (m < 0 || bits(m) > 7) continue;
      palabras.push(p); mascaras.push(m);
    }
    const pangramas = [];
    const vistos = new Set();
    // Los paneles no llevan S, para evitar plurales y formas verbales en -s
    for (const p of dic.frecuentes) {
      const m = mascara(p);
      if (m > 0 && bits(m) === 7 && !(m & BIT.s) && !vistos.has(m)) { vistos.add(m); pangramas.push(m); }
    }
    indice = { palabras, mascaras, pangramas };
    return indice;
  }

  function generar(dic, semilla) {
    const idx = crearIndice(dic);
    const rnd = U.azar('lexireto-' + semilla);
    const orden = U.barajar(idx.pangramas.slice(), rnd);
    let reserva = null;
    for (const set of orden.slice(0, 400)) {
      const subset = [];
      for (let i = 0; i < idx.palabras.length; i++) if ((idx.mascaras[i] & ~set) === 0) subset.push(i);
      const letras = [...ABC].filter(l => set & BIT[l]);
      for (const central of U.barajar(letras.slice(), rnd)) {
        const validas = subset.filter(i => idx.mascaras[i] & BIT[central]).map(i => idx.palabras[i]);
        const comunes = validas.filter(p => dic.frecuentes.has(p));
        const reto = { letras, central, validas, comunes };
        if (comunes.length >= 18 && comunes.length <= 60 && validas.length <= 200) return reto;
        if (!reserva && comunes.length >= 10) reserva = reto;
      }
    }
    return reserva;
  }

  function ayuda() {
    return `<h2>Cómo se juega</h2>
      <p>Forma el mayor número posible de palabras con las letras del panal.</p>
      <ul>
        <li>Todas las palabras deben usar la <b>letra central</b>.</li>
        <li>Deben tener al menos <b>3 letras</b>; las letras se pueden repetir.</li>
        <li>Valen las palabras del diccionario de la RAE: sin plurales ni formas verbales conjugadas (los verbos, en infinitivo). Se admiten los femeninos.</li>
        <li>Las tildes no cuentan; la Ñ es una letra propia.</li>
      </ul>
      <h3>Puntuación</h3>
      <ul>
        <li>3 letras: 1 punto. 4 letras: 2 puntos.</li>
        <li>5 o más letras: un punto por letra.</li>
        <li>Los <b>pangramas</b> (usan las 7 letras) suman 7 puntos extra.</li>
      </ul>
      <p>Las palabras poco frecuentes también cuentan, pero el objetivo del día se calcula con las palabras más comunes. Cada día hay un reto nuevo.</p>`;
  }

  function estadoHoy() {
    const e = U.guardado.leer('lexireto.diario');
    if (!e || e.clave !== U.hoy() || !e.encontradas.length) return '';
    return `${e.encontradas.length} palabra${e.encontradas.length === 1 ? '' : 's'}`;
  }

  function montar(vista) {
    let modo = 'diario', reto = null, estado = null, dic = null, entrada = '';
    const raiz = U.el('div', { class: 'juego' });
    raiz.append(U.el('div', { class: 'cargando' }, 'Cargando diccionario…'));
    vista.append(raiz);

    U.cargarDiccionario().then(d => { dic = d; iniciar(); });

    let chipDiario, chipLibre, divRango, divEntrada, panal, detalles, resumen, lista;

    function iniciar() {
      raiz.innerHTML = '';
      chipDiario = U.el('button', { class: 'chip activo', onclick: () => cambiarModo('diario') }, 'Reto del día');
      chipLibre = U.el('button', { class: 'chip', onclick: () => cambiarModo('libre') }, 'Reto libre');
      const chipPistas = U.el('button', { class: 'chip', onclick: mostrarPistas }, 'Pistas');
      const chipAyer = U.el('button', { class: 'chip', onclick: mostrarAyer }, 'Ayer');
      divRango = U.el('div', { class: 'rango' });
      detalles = U.el('details', { class: 'encontradas' });
      resumen = U.el('summary');
      lista = U.el('div', { class: 'lista-palabras' });
      detalles.append(resumen, lista);
      divEntrada = U.el('div', { class: 'lexi-entrada' });
      panal = U.el('div', { class: 'panal' });
      const botones = U.el('div', { class: 'lexi-botones' },
        U.el('button', { class: 'boton sec', onclick: () => pulsar('borrar') }, 'Borrar'),
        U.el('button', { class: 'boton sec lexi-mezclar', 'aria-label': 'Mezclar', onclick: mezclar, html: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
        U.el('button', { class: 'boton', onclick: () => pulsar('enviar') }, 'Aceptar'));
      raiz.append(U.el('div', { class: 'fila-opciones' }, chipDiario, chipLibre, chipPistas, chipAyer), divRango, detalles, divEntrada, panal, botones);
      cargar();
    }

    function semillaActual() { return modo === 'diario' ? U.hoy() : estado.semilla; }

    function cargar() {
      estado = U.guardado.leer('lexireto.' + modo);
      if (modo === 'diario' && (!estado || estado.clave !== U.hoy())) estado = { clave: U.hoy(), encontradas: [] };
      if (modo === 'libre' && !estado) estado = { semilla: 'libre-' + Date.now(), encontradas: [] };
      reto = generar(dic, semillaActual());
      entrada = '';
      dibujarPanal(reto.letras.filter(l => l !== reto.central));
      pintar();
    }

    function cambiarModo(m) {
      if (m === 'libre' && modo === 'libre') {
        const c = U.modal.abrir(`<h2>¿Nuevo reto libre?</h2><p>Se generará un panal distinto.</p>
          <div class="acciones"><button class="boton" data-a="si">Nuevo reto</button><button class="boton sec" data-a="no">Cancelar</button></div>`);
        c.querySelector('[data-a=si]').onclick = () => { U.modal.cerrar(); U.guardado.borrar('lexireto.libre'); cargar(); };
        c.querySelector('[data-a=no]').onclick = () => U.modal.cerrar();
        return;
      }
      if (m === modo) return;
      modo = m;
      chipDiario.classList.toggle('activo', m === 'diario');
      chipLibre.classList.toggle('activo', m === 'libre');
      cargar();
    }

    function dibujarPanal(exteriores) {
      panal.innerHTML = '';
      const w = 1 / 3, h = w * 0.866, H = 0.95, g = 1.07;
      const pos = [[0, 0], [0, -h], [0.75 * w, -h / 2], [0.75 * w, h / 2], [0, h], [-0.75 * w, h / 2], [-0.75 * w, -h / 2]];
      [reto.central, ...exteriores].forEach((l, i) => {
        const [dx, dy] = pos[i];
        const b = U.el('button', { class: 'hex' + (i === 0 ? ' central' : ''), onclick: () => pulsar(l) }, l);
        b.style.left = ((0.5 + dx * g - w / 2) * 100) + '%';
        b.style.top = ((H / 2 + dy * g - h / 2) / H * 100) + '%';
        panal.append(b);
      });
    }

    function mezclar() {
      dibujarPanal(U.barajar(reto.letras.filter(l => l !== reto.central)));
    }

    const esPangrama = p => reto.letras.every(l => p.includes(l));
    const puntuacion = lista => lista.reduce((s, p) => s + puntos(p, esPangrama(p)), 0);

    function pintar() {
      const max = puntuacion(reto.comunes);
      const pts = puntuacion(estado.encontradas);
      const frac = Math.min(1, pts / max);
      let rango = RANGOS[0][1], siguiente = null;
      for (const [f, n] of RANGOS) { if (frac >= f) rango = n; else if (!siguiente) siguiente = [f, n]; }
      divRango.innerHTML = `<div class="rango-nombre"><b>${rango}</b><span>${pts} punto${pts === 1 ? '' : 's'}${siguiente ? ` · ${Math.ceil(siguiente[0] * max) - pts} para «${siguiente[1]}»` : ''}</span></div>
        <div class="rango-barra"><i style="width:${frac * 100}%"></i></div>`;
      const n = estado.encontradas.length;
      resumen.textContent = n ? `Has encontrado ${n} palabra${n === 1 ? '' : 's'} (objetivo: ${reto.comunes.length}) ▾` : `Encuentra hasta ${reto.comunes.length} palabras comunes ▾`;
      lista.innerHTML = '';
      for (const p of estado.encontradas.slice().sort((a, b) => a.localeCompare(b, 'es'))) {
        const cls = esPangrama(p) ? 'pangrama' : dic.frecuentes.has(p) ? '' : 'rara';
        lista.append(U.el('span', { class: cls }, dic.mapa.get(p) || p));
      }
      pintarEntrada();
    }

    function pintarEntrada() {
      divEntrada.innerHTML = [...entrada].map(l => `<span class="${l === reto.central ? 'central' : ''}">${l}</span>`).join('') + '<span class="cursor"></span>';
    }

    function pulsar(t) {
      if (!reto) return;
      if (t === 'borrar') entrada = entrada.slice(0, -1);
      else if (t === 'enviar') return enviar();
      else if (reto.letras.includes(t) && entrada.length < 20) entrada += t;
      pintarEntrada();
    }

    function enviar() {
      const p = entrada;
      if (!p) return;
      entrada = '';
      let msg = null;
      if (p.length < 3) msg = 'Demasiado corta';
      else if (!p.includes(reto.central)) msg = 'Falta la letra central';
      else if (estado.encontradas.includes(p)) msg = 'Ya la tienes';
      else if (!reto.validas.includes(p)) msg = 'No está en el diccionario';
      if (msg) { U.aviso(msg); pintarEntrada(); return; }
      estado.encontradas.push(p);
      U.guardado.escribir('lexireto.' + modo, estado);
      const pg = esPangrama(p);
      const pts = puntos(p, pg);
      U.aviso(pg ? `¡Pangrama! +${pts}` : `${['', '', '', '¡Bien!', '¡Muy bien!', '¡Excelente!'][Math.min(p.length, 5)] || '¡Excelente!'} +${pts}${dic.frecuentes.has(p) ? '' : ' (palabra rara)'}`);
      pintar();
      if (reto.comunes.every(c => estado.encontradas.includes(c))) {
        setTimeout(() => U.modal.abrir(`<h2 class="centrado">¡Académico!</h2><p class="centrado">Has encontrado todas las palabras comunes del reto. ¡Enhorabuena!</p>`), 600);
      }
    }

    function mostrarPistas() {
      const pendientes = reto.comunes.filter(p => !estado.encontradas.includes(p));
      const largos = [...new Set(reto.comunes.map(p => p.length))].sort((a, b) => a - b);
      const iniciales = [...new Set(pendientes.map(p => p[0]))].sort((a, b) => a.localeCompare(b, 'es'));
      const filas = iniciales.map(i => `<tr><td>${i}</td>${largos.map(n => { const c = pendientes.filter(p => p[0] === i && p.length === n).length; return `<td>${c || '·'}</td>`; }).join('')}</tr>`).join('');
      const pangramas = reto.comunes.filter(esPangrama).length;
      const c = U.modal.abrir(`<h2>Pistas</h2>
        <p>Palabras comunes que te faltan, por letra inicial y número de letras. Hay ${pangramas} pangrama${pangramas === 1 ? '' : 's'}.</p>
        ${pendientes.length ? `<table class="tabla-pistas"><tr><th></th>${largos.map(n => `<th>${n}</th>`).join('')}</tr>${filas}</table>` : '<p>¡No te falta ninguna!</p>'}
        <div class="acciones"><button class="boton sec" data-a="rendirse">Ver soluciones</button></div>`);
      c.querySelector('[data-a=rendirse]').onclick = () => {
        U.modal.abrir(`<h2>Soluciones</h2>${listaSoluciones(reto, estado.encontradas)}`);
      };
    }

    function listaSoluciones(r, encontradas) {
      const pang = p => r.letras.every(l => p.includes(l));
      return `<p>Letras: <b style="text-transform:uppercase">${r.central}</b> + <span style="text-transform:uppercase">${r.letras.filter(l => l !== r.central).join(' ')}</span></p>
        <div class="lista-palabras">${r.comunes.slice().sort((a, b) => a.localeCompare(b, 'es')).map(p =>
          `<span class="${pang(p) ? 'pangrama' : encontradas.includes(p) ? '' : 'falta'}">${dic.mapa.get(p) || p}</span>`).join('')}</div>`;
    }

    function mostrarAyer() {
      const ayer = U.hoy(new Date(Date.now() - 864e5));
      const r = generar(dic, ayer);
      U.modal.abrir(`<h2>Soluciones de ayer</h2>${listaSoluciones(r, [])}<p style="font-size:13px;color:var(--texto-suave)">Los pangramas aparecen resaltados.</p>`);
    }

    function alTeclear(e) {
      if (!document.getElementById('modal').hidden) return;
      const t = teclaFisica(e);
      if (t) { e.preventDefault(); pulsar(t); }
      else if (e.key === ' ') { e.preventDefault(); if (reto) mezclar(); }
    }
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }

  return {
    id: 'lexireto', titulo: 'Lexireto', descripcion: 'Forma palabras con las letras del panal',
    icono: 'L', color: '#c9972c', datos: [], ayuda, estadoHoy, montar, generar
  };
})();
