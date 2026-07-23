// ============================================================
// PARTÍCULAS DE FONDO — brasas rojas cayendo, estilo ambiental.
// Se agrega solo con este script; no requiere tocar el HTML.
// ============================================================
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cantidad = window.innerWidth < 700 ? 16 : 30;
  const capa = document.createElement('div');
  capa.className = 'ember-layer';
  capa.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < cantidad; i++) {
    const ember = document.createElement('span');
    ember.className = 'ember';

    const size = (Math.random() * 4 + 2).toFixed(1);       // 2px a 6px
    const left = (Math.random() * 100).toFixed(2);          // 0% a 100%
    const duration = (Math.random() * 14 + 10).toFixed(1);  // 10s a 24s
    const delay = (Math.random() * -24).toFixed(1);         // arranca a mitad de camino
    const drift = (Math.random() * 120 - 60).toFixed(0);    // deriva -60px a 60px
    const opacity = (Math.random() * 0.5 + 0.35).toFixed(2);

    ember.style.width = size + 'px';
    ember.style.height = size + 'px';
    ember.style.left = left + '%';
    ember.style.setProperty('--ember-duration', duration + 's');
    ember.style.setProperty('--ember-delay', delay + 's');
    ember.style.setProperty('--ember-drift', drift + 'px');
    ember.style.setProperty('--ember-opacity', opacity);

    capa.appendChild(ember);
  }

  document.body.appendChild(capa);
})();
