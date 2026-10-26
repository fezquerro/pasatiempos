// Navegación entre la portada y los pasatiempos
'use strict';

(() => {
  const JUEGOS = [Wordle, Crucigrama, Sudoku, Lexireto];
  const vista = document.getElementById('vista');
  const titulo = document.getElementById('titulo');
  const btnAtras = document.getElementById('btn-atras');
  const btnAyuda = document.getElementById('btn-ayuda');
  let desmontar = null, juegoActual = null;

  btnAtras.addEventListener('click', () => { location.hash = ''; });
  btnAyuda.addEventListener('click', () => juegoActual && U.modal.abrir(juegoActual.ayuda()));
  const modal = document.getElementById('modal');
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-cerrar')) U.modal.cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') U.modal.cerrar(); });

  function portada() {
    titulo.textContent = 'Pasatiempos';
    btnAtras.hidden = true;
    btnAyuda.hidden = true;
    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const cont = U.el('div', { class: 'portada' }, U.el('p', { class: 'fecha' }, fecha[0].toUpperCase() + fecha.slice(1)));
    const tarjetas = U.el('div', { class: 'tarjetas' });
    for (const j of JUEGOS) {
      const estado = j.estadoHoy();
      tarjetas.append(U.el('button', { class: 'tarjeta', onclick: () => { location.hash = j.id; } },
        U.el('div', { class: 'ico', style: `background:${j.color}` }, j.icono),
        U.el('div', {}, U.el('h2', {}, j.titulo), U.el('p', {}, j.descripcion)),
        estado ? U.el('span', { class: 'estado' }, estado) : null));
    }
    cont.append(tarjetas, U.el('p', { class: 'pie', html:
      'Palabras del <a href="https://dle.rae.es" target="_blank" rel="noopener">Diccionario de la lengua española</a> (RAE).<br>' +
      'En el iPhone: Safari → Compartir → «Añadir a pantalla de inicio».' }));
    vista.append(cont);
  }

  async function abrir(juego) {
    juegoActual = juego;
    titulo.textContent = juego.titulo;
    btnAtras.hidden = false;
    btnAyuda.hidden = false;
    vista.append(U.el('div', { class: 'cargando' }, 'Cargando…'));
    try {
      await Promise.all(juego.datos.map(U.cargarScript));
    } catch {
      vista.innerHTML = '<div class="cargando">No se pudieron cargar los datos. Comprueba la conexión.</div>';
      return;
    }
    if (juegoActual !== juego) return;
    vista.innerHTML = '';
    desmontar = juego.montar(vista);
    if (!U.guardado.leer('ayuda.' + juego.id)) {
      U.guardado.escribir('ayuda.' + juego.id, true);
      U.modal.abrir(juego.ayuda());
    }
  }

  function enrutar() {
    if (desmontar) { desmontar(); desmontar = null; }
    U.modal.cerrar();
    juegoActual = null;
    vista.innerHTML = '';
    vista.scrollTop = 0;
    const juego = JUEGOS.find(j => j.id === location.hash.slice(1));
    if (juego) abrir(juego); else portada();
  }

  window.addEventListener('hashchange', enrutar);
  enrutar();

  // Al volver a la app otro día, refresca la portada para mostrar los retos nuevos
  let dia = U.hoy();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && U.hoy() !== dia) { dia = U.hoy(); enrutar(); }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
