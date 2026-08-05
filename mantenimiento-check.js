// ============================================================
// MANTENIMIENTO — chequea en Firestore (colección "config",
// documento "sitio", campo "activo") si el mantenimiento está
// prendido. Si está en true, manda a cualquiera que entre a esta
// página directo a mantenimiento.html.
//
// El estado se prende/apaga desde el panel admin.html (pestaña
// "Mantenimiento" del sidebar), sin tocar código ni GitHub.
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

(async function () {
  // si ya estoy en la página de mantenimiento, no hace falta chequear nada
  if (location.pathname.endsWith('mantenimiento.html')) return;

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'config', 'sitio'));

    if (snap.exists() && snap.data().activo) {
      window.location.replace('mantenimiento.html');
    }
  } catch (err) {
    // si falla la consulta (sin internet, Firestore caído, etc.) dejamos
    // pasar a la página normal en vez de bloquear el sitio entero.
    console.error('Error al chequear modo mantenimiento:', err);
  }
})();