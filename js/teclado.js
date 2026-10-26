// Teclado en pantalla con distribución española (incluye la Ñ)
'use strict';

function crearTeclado(alPulsar, { conEnviar = true } = {}) {
  const filas = [
    'qwertyuiop'.split(''),
    'asdfghjklñ'.split(''),
    [conEnviar ? 'enviar' : null, ...'zxcvbnm'.split(''), 'borrar'].filter(Boolean)
  ];
  const teclas = {};
  const raiz = U.el('div', { class: 'teclado' });
  for (const fila of filas) {
    const f = U.el('div', { class: 'fila' });
    for (const t of fila) {
      const ancha = t === 'enviar' || t === 'borrar';
      const b = U.el('button', { class: 'tecla' + (ancha ? ' ancha' : ''), 'data-tecla': t, 'aria-label': t });
      if (t === 'borrar') b.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      else b.textContent = t === 'enviar' ? 'ENVIAR' : t;
      b.addEventListener('click', () => alPulsar(t));
      teclas[t] = b;
      f.append(b);
    }
    raiz.append(f);
  }

  // Estados de color, de menor a mayor prioridad
  const orden = { gris: 1, amarillo: 2, verde: 3 };
  raiz.colorear = (letra, estado) => {
    const b = teclas[letra];
    if (!b) return;
    const actual = b.dataset.estado;
    if (!actual || orden[estado] > orden[actual]) {
      b.dataset.estado = estado;
      b.classList.remove('gris', 'amarillo', 'verde');
      b.classList.add(estado);
    }
  };
  raiz.limpiar = () => {
    for (const b of Object.values(teclas)) {
      delete b.dataset.estado;
      b.classList.remove('gris', 'amarillo', 'verde');
    }
  };
  return raiz;
}

// Traduce un evento de teclado físico a una tecla del teclado en pantalla
function teclaFisica(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === 'Enter') return 'enviar';
  if (e.key === 'Backspace') return 'borrar';
  const k = U.norm(e.key);
  return /^[a-zñ]$/.test(k) ? k : null;
}
