// ============================================================
// ANUNCIO / CARTEL PERSONALIZABLE — franja arriba de todo en
// index.html, con el texto deslizándose de izquierda a derecha.
// El texto y si está prendido o no se manejan desde el panel de
// admin (pestaña "Sitio" → "Anuncio"), sin tocar código.
// Guardado en Firestore: colección "config", documento "anuncio".
//
// El recorrido se calcula en píxeles reales (ancho del cartel +
// ancho del texto) y se mueve a velocidad constante, así siempre
// se ve fluido y rápido sin importar si el texto es corto o largo.
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const VELOCIDAD_PX_POR_SEG = 150; // más alto = más rápido

let animacionActual = null;

function arrancarAnimacion(viewport, track){
  if(animacionActual) animacionActual.cancel();

  const anchoViewport = viewport.offsetWidth;
  const anchoTexto = track.scrollWidth;
  const distancia = anchoViewport + anchoTexto;
  const duracionMs = (distancia / VELOCIDAD_PX_POR_SEG) * 1000;

  // entra por la izquierda (texto completo oculto fuera del cartel)
  // y sale del todo por la derecha, en línea recta y a velocidad fija
  animacionActual = track.animate(
    [
      { transform: `translateX(-${anchoTexto}px)` },
      { transform: `translateX(${anchoViewport}px)` }
    ],
    { duration: duracionMs, iterations: Infinity, easing: 'linear' }
  );
}

async function iniciar(){
  const banner = document.getElementById('anuncio-banner');
  const viewport = document.getElementById('anuncio-viewport');
  const track = document.getElementById('anuncio-track');
  if(!banner || !viewport || !track) return;

  try{
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'config', 'anuncio'));

    if(!snap.exists()) return;
    const datos = snap.data();
    const texto = (datos.texto || '').trim();

    if(!datos.activo || !texto) return; // apagado o sin texto: no se muestra nada

    track.textContent = texto;
    banner.style.display = 'flex';

    // si el navegador tiene "reducir movimiento" activado, se muestra
    // fijo y centrado sin animar (ver CSS)
    const prefiereMenosMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefiereMenosMovimiento) return;

    // se espera un frame para que el navegador ya haya calculado el
    // ancho real del texto antes de medirlo
    requestAnimationFrame(() => arrancarAnimacion(viewport, track));

    // si cambia el tamaño de la ventana, se recalcula el recorrido
    // para que siga entrando y saliendo justo por los bordes
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => arrancarAnimacion(viewport, track), 200);
    });
  }catch(err){
    console.error('Error al cargar el anuncio:', err);
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', iniciar);
}else{
  iniciar();
}