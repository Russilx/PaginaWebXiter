// ============================================================
// CURSOR FX — brasas/chispas rojas que siguen al mouse.
// Se agrega solo con este script (como particles.js), no hace
// falta tocar el HTML de cada página más que incluirlo.
// Se desactiva solo en pantallas táctiles (no hay cursor) y si
// el usuario tiene activado "reducir movimiento".
// ============================================================
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return; // sin mouse real, no hace nada

  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-fx-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.style.mixBlendMode = 'screen'; // el brillo se suma a lo que hay debajo
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let ancho = 0, alto = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function ajustarTamano(){
    ancho = window.innerWidth;
    alto = window.innerHeight;
    canvas.width = ancho * dpr;
    canvas.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ajustarTamano();
  window.addEventListener('resize', ajustarTamano);

  const particulas = [];
  const MAX_PARTICULAS = 140;

  let mouseX = -100, mouseY = -100;
  let mouseAnterior = { x: -100, y: -100 };
  let mouseActivo = false;

  function crearParticula(x, y){
    if (particulas.length >= MAX_PARTICULAS) particulas.shift();

    const angulo = Math.random() * Math.PI * 2;
    const velocidad = Math.random() * 0.6 + 0.15;

    particulas.push({
      x, y,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad - 0.3, // leve tendencia a subir, como una brasa
      vida: 1,
      // decae distinto cada partícula, para que no todas se apaguen a la vez
      decaimiento: Math.random() * 0.018 + 0.012,
      tamano: Math.random() * 2.4 + 1.2,
      // algunas más rojas, otras más anaranjadas/doradas, como brasas reales
      color: Math.random() > 0.35 ? '225,6,0' : '255,140,40'
    });
  }

  function onMove(e){
    mouseActivo = true;
    mouseX = e.clientX;
    mouseY = e.clientY;

    // distancia recorrida desde el último frame, para emitir más
    // partículas si el mouse se mueve rápido y menos si está quieto
    const dx = mouseX - mouseAnterior.x;
    const dy = mouseY - mouseAnterior.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const cantidad = Math.min(Math.ceil(dist / 18), 4);

    for (let i = 0; i < cantidad || i === 0; i++){
      const t = cantidad > 0 ? i / cantidad : 0;
      crearParticula(
        mouseAnterior.x + dx * t + (Math.random() * 6 - 3),
        mouseAnterior.y + dy * t + (Math.random() * 6 - 3)
      );
      if (cantidad === 0) break;
    }

    mouseAnterior = { x: mouseX, y: mouseY };
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseleave', () => { mouseActivo = false; });

  function animar(){
    ctx.clearRect(0, 0, ancho, alto);

    for (let i = particulas.length - 1; i >= 0; i--){
      const p = particulas[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vida -= p.decaimiento;

      if (p.vida <= 0){
        particulas.splice(i, 1);
        continue;
      }

      const radio = p.tamano * p.vida;
      const gradiente = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radio * 4);
      gradiente.addColorStop(0, `rgba(${p.color},${p.vida * 0.9})`);
      gradiente.addColorStop(1, `rgba(${p.color},0)`);

      ctx.beginPath();
      ctx.fillStyle = gradiente;
      ctx.arc(p.x, p.y, radio * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // brillo suave pegado al cursor mientras se mueve
    if (mouseActivo){
      const halo = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 26);
      halo.addColorStop(0, 'rgba(225,6,0,0.18)');
      halo.addColorStop(1, 'rgba(225,6,0,0)');
      ctx.beginPath();
      ctx.fillStyle = halo;
      ctx.arc(mouseX, mouseY, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animar);
  }
  requestAnimationFrame(animar);
})();