// Utilidades compartidas por todos los pasatiempos
'use strict';

const U = (() => {
  // Quita tildes y diéresis pero conserva la ñ
  function norm(s) {
    return s.toLowerCase()
      .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
      .replace(/[óò]/g, 'o').replace(/[úùü]/g, 'u');
  }

  // Fecha local en formato AAAA-MM-DD
  function hoy(fecha = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
  }

  // Número de día desde el lanzamiento (para numerar los retos diarios)
  function numeroDia(clave = hoy()) {
    const [a, m, d] = clave.split('-').map(Number);
    return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(2026, 9, 27)) / 864e5) + 1;
  }

  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // Generador pseudoaleatorio con semilla (mulberry32)
  function azar(semilla) {
    let a = typeof semilla === 'number' ? semilla >>> 0 : hash(String(semilla));
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function barajar(lista, rnd = Math.random) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  const guardado = {
    leer(clave, defecto = null) {
      try {
        const v = localStorage.getItem('pasatiempos.' + clave);
        return v == null ? defecto : JSON.parse(v);
      } catch { return defecto; }
    },
    escribir(clave, valor) {
      try { localStorage.setItem('pasatiempos.' + clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
    },
    borrar(clave) {
      try { localStorage.removeItem('pasatiempos.' + clave); } catch { /* sin almacenamiento */ }
    }
  };

  let temporizadorAviso;
  function aviso(texto, ms = 1600) {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.classList.remove('visible'), ms);
  }

  const modal = {
    abrir(html, alCerrar) {
      const m = document.getElementById('modal');
      m.querySelector('.modal-contenido').innerHTML = html;
      m.hidden = false;
      m._alCerrar = alCerrar;
      return m.querySelector('.modal-contenido');
    },
    cerrar() {
      const m = document.getElementById('modal');
      if (m.hidden) return;
      m.hidden = true;
      if (m._alCerrar) { const f = m._alCerrar; m._alCerrar = null; f(); }
    }
  };

  function el(etiqueta, atributos = {}, ...hijos) {
    const e = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const h of hijos.flat()) if (h != null) e.append(h);
    return e;
  }

  const scripts = {};
  function cargarScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((ok, mal) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = ok;
        s.onerror = () => { delete scripts[src]; mal(new Error('No se pudo cargar ' + src)); };
        document.head.append(s);
      });
    }
    return scripts[src];
  }

  // Diccionario de la RAE: mapa palabra normalizada -> forma con tildes
  let diccionario;
  function cargarDiccionario() {
    if (!diccionario) {
      diccionario = Promise.all([cargarScript('data/palabras.js'), cargarScript('data/frecuentes.js')]).then(() => {
        const mapa = new Map();
        for (const p of window.PALABRAS.split(' ')) {
          const n = norm(p);
          if (!mapa.has(n) || p === n) mapa.set(n, p);
        }
        const frecuentes = new Set(window.FRECUENTES.split(' ').map(norm));
        window.PALABRAS = window.FRECUENTES = null;
        return { mapa, frecuentes };
      });
    }
    return diccionario;
  }

  async function compartir(texto) {
    try {
      if (navigator.share) { await navigator.share({ text: texto }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(texto);
      aviso('Copiado al portapapeles');
    } catch { aviso('No se pudo compartir'); }
  }

  function formatoTiempo(seg) {
    const m = Math.floor(seg / 60), s = seg % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return { norm, hoy, numeroDia, hash, azar, barajar, guardado, aviso, modal, el, cargarScript, cargarDiccionario, compartir, formatoTiempo };
})();
