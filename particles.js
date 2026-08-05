// ============================================================
// ESCENA DE FONDO — infierno nocturno con montañas y ruinas
// góticas, luna de sangre, resplandor de horizonte, humo,
// luciérnagas y brasas cayendo. Se agrega solo con este script;
// no requiere tocar el HTML de cada página.
// ============================================================
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const body = document.body;
  const mobile = window.innerWidth < 700;

  // ---------- escena estática (montañas, luna, resplandor) ----------
  const escena = document.createElement('div');
  escena.className = 'bg-scene';
  escena.setAttribute('aria-hidden', 'true');
  escena.innerHTML =
    '<div class="horizon-glow"></div>' +
    '<div class="bg-mountains-far"></div>' +
    '<div class="moon-halo"></div>' +
    '<div class="moon"></div>' +
    '<div class="bg-mountains-near"></div>';
  body.insertBefore(escena, body.firstChild);

  // ---------- humo subiendo lentamente ----------
  const capaHumo = document.createElement('div');
  capaHumo.className = 'smoke-layer';
  capaHumo.setAttribute('aria-hidden', 'true');
  const cantidadHumo = mobile ? 4 : 7;
  for (let i = 0; i < cantidadHumo; i++) {
    const s = document.createElement('span');
    s.className = 'smoke';

    const size = (Math.random() * 140 + 90).toFixed(0);      // 90px a 230px
    const left = (Math.random() * 100).toFixed(2);
    const duration = (Math.random() * 20 + 24).toFixed(1);   // 24s a 44s
    const delay = (Math.random() * -40).toFixed(1);
    const drift = (Math.random() * 160 - 80).toFixed(0);
    const opacity = (Math.random() * 0.16 + 0.08).toFixed(2);

    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = left + '%';
    s.style.animationDuration = duration + 's';
    s.style.animationDelay = delay + 's';
    s.style.setProperty('--smoke-drift', drift + 'px');
    s.style.setProperty('--smoke-opacity', opacity);

    capaHumo.appendChild(s);
  }
  body.appendChild(capaHumo);

  // ---------- luciérnagas / chispas flotando ----------
  const capaFireflies = document.createElement('div');
  capaFireflies.className = 'firefly-layer';
  capaFireflies.setAttribute('aria-hidden', 'true');
  const cantidadFF = mobile ? 8 : 16;
  for (let i = 0; i < cantidadFF; i++) {
    const f = document.createElement('span');
    f.className = 'firefly';

    const size = (Math.random() * 2.5 + 1.5).toFixed(1);     // 1.5px a 4px
    const top = (Math.random() * 85 + 5).toFixed(2);
    const left = (Math.random() * 100).toFixed(2);
    const duration = (Math.random() * 6 + 4).toFixed(1);     // 4s a 10s
    const delay = (Math.random() * -10).toFixed(1);
    const driftX = (Math.random() * 50 - 25).toFixed(0);
    const driftY = (Math.random() * -40 - 10).toFixed(0);

    f.style.width = size + 'px';
    f.style.height = size + 'px';
    f.style.top = top + '%';
    f.style.left = left + '%';
    f.style.animationDuration = duration + 's';
    f.style.animationDelay = delay + 's';
    f.style.setProperty('--fly-drift-x', driftX + 'px');
    f.style.setProperty('--fly-drift-y', driftY + 'px');

    capaFireflies.appendChild(f);
  }
  body.appendChild(capaFireflies);

  // ---------- brasas cayendo ----------
  const cantidad = mobile ? 18 : 32;
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

  body.appendChild(capa);
})();