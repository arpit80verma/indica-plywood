/* ============ LOADER ============ */
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('gone'), 1600);
});
document.getElementById('yr').textContent = new Date().getFullYear();

/* ============ NAV ============ */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
  // active link
  const sections = document.querySelectorAll('section[id], header[id]');
  let cur = '';
  sections.forEach(s => { if (window.scrollY + 120 >= s.offsetTop) cur = s.id; });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
  });
});

/* ============ REVEAL ============ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      // count up
      if (e.target.classList.contains('stat')) {
        const b = e.target.querySelector('b[data-count]');
        if (b && !b.dataset.done) {
          b.dataset.done = '1';
          const target = +b.dataset.count;
          let v = 0;
          const step = Math.max(1, Math.ceil(target / 40));
          const t = setInterval(() => {
            v += step;
            if (v >= target) { v = target; clearInterval(t); }
            b.textContent = v;
          }, 32);
        }
      }
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.18 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ============ HERO 3D — PLYWOOD SHEETS ============ */
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0d06, 8, 28);

  const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.6, 9);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Lights
  const amb = new THREE.AmbientLight(0xffd7a8, 1.1); scene.add(amb);
  const key = new THREE.DirectionalLight(0xffd29a, 3.2);
  key.position.set(4, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 30;
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xE8A75A, 1.4);
  rim.position.set(-5, 3, -4); scene.add(rim);
  const fill = new THREE.PointLight(0xffa050, 1.0, 18); fill.position.set(2, -2, 5); scene.add(fill);

  // Procedural wood-grain texture
  function makeWoodTexture(hueShift = 0) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    // base gradient
    const g = ctx.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, `hsl(${24 + hueShift}, 60%, ${38 + hueShift * 0.4}%)`);
    g.addColorStop(.5, `hsl(${30 + hueShift}, 68%, ${54 + hueShift * 0.3}%)`);
    g.addColorStop(1, `hsl(${22 + hueShift}, 58%, ${36 + hueShift * 0.4}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    // grain lines
    for (let i = 0; i < 180; i++) {
      ctx.strokeStyle = `rgba(${30 + Math.random() * 40},${15 + Math.random() * 20},${5 + Math.random() * 10},${0.06 + Math.random() * 0.18})`;
      ctx.lineWidth = 0.4 + Math.random() * 1.4;
      ctx.beginPath();
      const y = Math.random() * 512;
      ctx.moveTo(0, y);
      const cp1 = y + (Math.random() - .5) * 30;
      const cp2 = y + (Math.random() - .5) * 30;
      ctx.bezierCurveTo(170, cp1, 340, cp2, 512, y + (Math.random() - .5) * 12);
      ctx.stroke();
    }
    // knots
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const rad = ctx.createRadialGradient(x, y, 0, x, y, 25 + Math.random() * 20);
      rad.addColorStop(0, 'rgba(20,10,4,.5)');
      rad.addColorStop(1, 'rgba(20,10,4,0)');
      ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(x, y, 40, 0, 6.28); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Edge (laminated layers) texture for sides
  function makeEdgeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 32;
    const ctx = c.getContext('2d');
    const colors = ['#3a1d10', '#7a3b1a', '#5a2d15', '#a8541f', '#3a1d10', '#7a3b1a', '#5a2d15'];
    const slice = 32 / colors.length;
    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * slice, 256, slice + 0.5);
    });
    // slight noise
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * .25})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 32, 1, 1);
    }
    return new THREE.CanvasTexture(c);
  }
  const edgeTex = makeEdgeTexture();

  // Build stacked plywood sheets
  const sheets = [];
  const group = new THREE.Group();
  scene.add(group);

  const SHEET_W = 2.8, SHEET_D = 1.9, SHEET_H = 0.13;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const woodTex = makeWoodTexture((i - 3) * 4);
    const topMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.55,
      metalness: 0.08,
      emissive: new THREE.Color(0x2a1408),
      emissiveIntensity: 0.35,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: edgeTex,
      roughness: 0.7,
      metalness: 0.05,
      emissive: new THREE.Color(0x1a0d06),
      emissiveIntensity: 0.4,
    });
    // Order in BoxGeometry mat array: +x, -x, +y, -y, +z, -z
    const mats = [sideMat, sideMat, topMat, topMat.clone(), sideMat, sideMat];
    const geo = new THREE.BoxGeometry(SHEET_W, SHEET_H, SHEET_D);
    const mesh = new THREE.Mesh(geo, mats);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.baseY = (i - (N - 1) / 2) * (SHEET_H + 0.045);
    mesh.userData.idx = i;
    mesh.position.y = mesh.userData.baseY;
    mesh.position.x = (Math.random() - 0.5) * 0.06;
    mesh.position.z = (Math.random() - 0.5) * 0.06;
    group.add(mesh);
    sheets.push(mesh);
  }

  // Floating particles (sawdust)
  const dustGeo = new THREE.BufferGeometry();
  const DC = 180;
  const pos = new Float32Array(DC * 3);
  for (let i = 0; i < DC; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xE8A75A, size: 0.035, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Subtle ground catcher (invisible to bg but takes shadow)
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), shadowMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Group tilt — stack visible on the right
  group.rotation.x = -0.45;
  group.rotation.y = 0.55;
  group.rotation.z = -0.05;
  group.position.x = 3.0;
  group.position.y = -0.3;
  group.position.z = 0;

  // Mouse
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('mousemove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  });

  // Scroll factor for explode
  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  // Resize
  function onResize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    // adjust group placement on mobile
    if (w < 900) {
      group.position.x = 0;
      group.position.y = -1.4;
      group.scale.setScalar(0.65);
      camera.position.set(0, 0, 9);
      camera.lookAt(0, -1.4, 0);
    } else {
      group.position.x = 3.0;
      group.position.y = -0.3;
      group.scale.setScalar(0.95);
      camera.position.set(0, 0, 9);
      camera.lookAt(0, 0, 0);
    }
  }
  window.addEventListener('resize', onResize);
  onResize();

  // Animate
  const clock = new THREE.Clock();
  let entry = 0;
  let lastT = 0;
  function animate() {
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - lastT);
    lastT = t;
    entry = Math.min(1, entry + dt * 0.6);
    const ease = 1 - Math.pow(1 - entry, 3);

    // smooth cursor follow
    tx += (mx - tx) * 0.05;
    ty += (my - ty) * 0.05;

    const scrollFactor = Math.min(1, scrollY / (window.innerHeight * 0.9));

    sheets.forEach((s, i) => {
      const intro = 8 - i * 0.18;
      s.position.y = s.userData.baseY * ease + (1 - ease) * intro;
      // explode on scroll
      const explode = scrollFactor * (i - (N - 1) / 2) * 0.55;
      s.position.y += explode;
      // gentle float
      s.rotation.z = Math.sin(t * 0.5 + i) * 0.01;
      s.rotation.x = -0.02 + Math.cos(t * 0.4 + i * 0.7) * 0.008;
    });

    group.rotation.y = 0.55 + tx * 0.4 + Math.sin(t * 0.25) * 0.06;
    group.rotation.x = -0.45 + ty * 0.2 + Math.cos(t * 0.3) * 0.03;
    // fade scroll
    group.position.y = -0.3 - scrollFactor * 1.6;

    // dust
    dust.rotation.y = t * 0.04;
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < DC; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.002;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
  window.__DBG = { scene, camera, group, sheets, renderer };
})();


/* ============ THEME TOGGLE (day/night) ============ */
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  const saved = localStorage.getItem('indica-theme');
  if(saved) root.setAttribute('data-theme', saved);
  btn.addEventListener('click', () => {
    const cur = root.getAttribute('data-theme') === 'day' ? '' : 'day';
    if(cur) root.setAttribute('data-theme', cur); else root.removeAttribute('data-theme');
    localStorage.setItem('indica-theme', cur);
  });
})();

/* ============ PALETTE SWITCHER ============ */
(function(){
  const root = document.documentElement;
  const btn  = document.getElementById('paletteToggle');
  const pop  = document.getElementById('palettePop');
  if(!btn || !pop) return;
  const swatches = pop.querySelectorAll('.sw');
  const saved = localStorage.getItem('indica-palette') || 'amber';
  apply(saved);
  function apply(name){
    if(name && name !== 'amber') root.setAttribute('data-palette', name);
    else root.removeAttribute('data-palette');
    swatches.forEach(s => s.classList.toggle('active', s.dataset.palette === (name||'amber')));
  }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('open');
  });
  swatches.forEach(s => s.addEventListener('click', () => {
    const name = s.dataset.palette;
    apply(name);
    localStorage.setItem('indica-palette', name);
    setTimeout(()=>pop.classList.remove('open'), 220);
  }));
  document.addEventListener('click', e => {
    if(!pop.contains(e.target) && e.target !== btn) pop.classList.remove('open');
  });
  document.addEventListener('keydown', e => { if(e.key==='Escape') pop.classList.remove('open'); });
})();

/* ============ PRODUCT CARD CURSOR SHIMMER ============ */
(function(){
  const cards = document.querySelectorAll('.product');
  cards.forEach(card => {
    // randomise grain direction per card
    const angles = ['85deg','90deg','95deg','100deg','75deg'];
    card.style.setProperty('--grain-angle', angles[Math.floor(Math.random()*angles.length)]);
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '50%');
    });
  });
})();

/* ============ PROCESS CAROUSEL (autoplay + dots + arrows + swipe + keyboard) ============ */
(function(){
  const wrap = document.getElementById('scrolly');
  if(!wrap) return;
  const numEl   = wrap.querySelector('.sc-num');
  const titleEl = wrap.querySelector('.sc-title');
  const bodyEl  = wrap.querySelector('.sc-body');
  const progEl  = wrap.querySelector('.sc-prog i');
  const sgs     = wrap.querySelectorAll('.stage-svg .sg');
  const dots    = wrap.querySelectorAll('.sc-dot');
  const prevBtn = wrap.querySelector('.sc-prev');
  const nextBtn = wrap.querySelector('.sc-next');
  const playBtn = wrap.querySelector('.sc-play');
  const tmpl    = document.getElementById('scStepData');
  const steps   = Array.from(tmpl.content.querySelectorAll('[data-step]'));
  const total   = steps.length;
  const INTERVAL = 2600;

  let current = -1;
  let timer = null;
  let playing = true;
  let inView = false;
  let hovered = false;

  function setStep(n, dir){
    n = (n + total) % total;
    if(n === current) return;
    const forward = (dir !== undefined) ? dir > 0 : (current === -1 || (n > current && !(current === total-1 && n === 0)));
    current = n;
    sgs.forEach((g, i) => g.classList.toggle('active', i === n));
    dots.forEach((d, i) => d.classList.toggle('active', i === n));
    const sp = steps[n];
    numEl.textContent = String(n+1).padStart(2,'0') + ' / 07';
    const slideOut = forward ? 'translateX(-18px)' : 'translateX(18px)';
    const slideIn  = forward ? 'translateX(18px)'  : 'translateX(-18px)';
    titleEl.style.opacity = '0';
    bodyEl.style.opacity = '0';
    titleEl.style.transform = slideOut;
    bodyEl.style.transform = slideOut;
    setTimeout(() => {
      titleEl.innerHTML = sp.dataset.title;
      bodyEl.innerHTML  = sp.dataset.body;
      titleEl.style.transform = slideIn;
      bodyEl.style.transform  = slideIn;
      // force reflow then animate in
      void titleEl.offsetWidth;
      titleEl.style.opacity = '1';
      bodyEl.style.opacity = '1';
      titleEl.style.transform = 'translateX(0)';
      bodyEl.style.transform  = 'translateX(0)';
    }, 220);
    progEl.style.width = (((n+1)/total)*100) + '%';
  }

  function tick(){ setStep(current + 1, 1); }

  function startTimer(){
    stopTimer();
    if(playing && inView && !hovered) timer = setInterval(tick, INTERVAL);
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }
  function resetTimer(){ if(playing && inView && !hovered) startTimer(); }

  // controls
  prevBtn.addEventListener('click', () => { setStep(current - 1, -1); resetTimer(); });
  nextBtn.addEventListener('click', () => { setStep(current + 1, 1); resetTimer(); });
  dots.forEach(d => d.addEventListener('click', () => {
    const i = parseInt(d.dataset.i,10);
    setStep(i, i > current ? 1 : -1);
    resetTimer();
  }));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.setAttribute('data-playing', playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause autoplay' : 'Play autoplay');
    if(playing) startTimer(); else stopTimer();
  });

  // pause on hover (desktop)
  wrap.addEventListener('mouseenter', () => { hovered = true; stopTimer(); });
  wrap.addEventListener('mouseleave', () => { hovered = false; resetTimer(); });

  // swipe (touch)
  let sx = null, sy = null;
  wrap.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if(sx === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
      if(dx < 0) setStep(current + 1, 1); else setStep(current - 1, -1);
      resetTimer();
    }
    sx = sy = null;
  }, { passive: true });

  // keyboard
  wrap.setAttribute('tabindex', '-1');
  wrap.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowRight'){ setStep(current+1,1); resetTimer(); }
    else if(e.key === 'ArrowLeft'){ setStep(current-1,-1); resetTimer(); }
  });

  // pause when not visible (saves CPU & avoids progress skipping when offscreen)
  const io2 = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      inView = e.isIntersecting;
      if(inView) resetTimer(); else stopTimer();
    });
  }, { threshold: 0, rootMargin: '0px 0px -20% 0px' });
  io2.observe(wrap);

  // respect reduced motion: stop autoplay
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    playing = false;
    playBtn.setAttribute('data-playing','false');
  }

  // init
  setStep(0, 1);
})();


/* ============ ANIMATED PRODUCT POSTERS ============ */
(function(){
  const POSTERS = {
    marina: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="pmW" x1="0" x2="1"><stop offset="0" stop-color="#0a3a55"/><stop offset="1" stop-color="#1a5d7a"/></linearGradient>
          <linearGradient id="pmSky" x1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d10"/><stop offset="1" stop-color="#7a3b1a"/></linearGradient>
        </defs>
        <rect width="600" height="360" fill="url(#pmSky)"/>
        <g class="sun"><circle cx="450" cy="120" r="40" fill="#3fb44a" opacity=".55"/><circle cx="450" cy="120" r="22" fill="#f3b56b"/></g>
        <rect y="200" width="600" height="160" fill="url(#pmW)" opacity=".88"/>
        <g class="waves" stroke="#3fb44a" fill="none" stroke-width="1.6" opacity=".7">
          <path class="w1" d="M-100 230 q 50 -14 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0"/>
          <path class="w2" d="M-100 258 q 50 -16 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0" opacity=".6"/>
          <path class="w3" d="M-100 290 q 50 -18 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0" opacity=".4"/>
        </g>
        <g class="drops" fill="#3fb44a">
          <circle class="d d1" cx="120" cy="60" r="2"/>
          <circle class="d d2" cx="220" cy="40" r="1.6"/>
          <circle class="d d3" cx="320" cy="80" r="2.2"/>
          <circle class="d d4" cx="180" cy="100" r="1.4"/>
          <circle class="d d5" cx="380" cy="50" r="2"/>
        </g>
      </svg>`,
    ironwood: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="piG" x1="0" x2="1"><stop offset="0" stop-color="#2e1a0c"/><stop offset="1" stop-color="#a1561e"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#piG)"/>
        <g class="rings" fill="none" stroke="#3fb44a" stroke-width="1.2">
          <ellipse class="rg r1" cx="300" cy="180" rx="60" ry="40" opacity=".7"/>
          <ellipse class="rg r2" cx="300" cy="180" rx="110" ry="72" opacity=".55"/>
          <ellipse class="rg r3" cx="300" cy="180" rx="170" ry="110" opacity=".4"/>
          <ellipse class="rg r4" cx="300" cy="180" rx="240" ry="160" opacity=".28"/>
          <ellipse class="rg r5" cx="300" cy="180" rx="320" ry="210" opacity=".18"/>
        </g>
        <circle cx="300" cy="180" r="4" fill="#3fb44a"/>
      </svg>`,
    skyride: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="psG" x1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0d22"/><stop offset="1" stop-color="#3b2412"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#psG)"/>
        <g class="stars">
          ${Array.from({length:60},(_,i)=>{const x=Math.random()*600,y=Math.random()*360,r=Math.random()*1.2+.4,d=(Math.random()*4).toFixed(2);return `<circle class="st" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#3fb44a" style="animation-delay:${d}s"/>`}).join('')}
        </g>
        <g class="shoot">
          <line class="sh sh1" x1="-60" y1="80" x2="40" y2="110" stroke="#3fb44a" stroke-width="1.4"/>
          <line class="sh sh2" x1="-60" y1="160" x2="60" y2="200" stroke="#f3b56b" stroke-width="1.2"/>
        </g>
      </svg>`,
    flushdoor: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="pfdG" x1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b1608"/><stop offset="1" stop-color="#8b4a1f"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#pfdG)"/>
        <g class="door-wrap">
          <rect class="door" x="220" y="40" width="180" height="300" rx="4" fill="#5a2d15" stroke="#3fb44a" stroke-width="1.5"/>
          <rect x="235" y="55" width="150" height="270" rx="2" fill="none" stroke="#3fb44a" stroke-width=".6" opacity=".4"/>
          <path class="grain" d="M240 70v260M260 70v260M280 70v260M300 70v260M320 70v260M340 70v260M360 70v260M380 70v260" stroke="#3a1e10" stroke-width=".8" opacity=".4"/>
          <circle class="knob" cx="376" cy="190" r="4" fill="#3fb44a"/>
        </g>
        <g class="light">
          <path d="M0 0 L600 0 L600 360 L0 360 Z" fill="none"/>
          <rect class="sweep" x="-200" y="-50" width="160" height="500" fill="#3fb44a" opacity=".12" transform="skewX(-20)"/>
        </g>
      </svg>`,
    ironwooddoor: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="pidG" x1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a1a08"/><stop offset="1" stop-color="#b06228"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#pidG)"/>
        <g class="layers">
          <rect class="ly" x="60" y="60"  width="480" height="40" fill="#7a3b1a" opacity=".85"/>
          <rect class="ly" x="60" y="108" width="480" height="40" fill="#9a4c20" opacity=".85"/>
          <rect class="ly" x="60" y="156" width="480" height="40" fill="#7a3b1a" opacity=".85"/>
          <rect class="ly" x="60" y="204" width="480" height="40" fill="#9a4c20" opacity=".85"/>
          <rect class="ly" x="60" y="252" width="480" height="40" fill="#7a3b1a" opacity=".85"/>
        </g>
        <g class="grainH" stroke="#3fb44a" stroke-width=".4" opacity=".4">
          <path d="M60 80h480M60 128h480M60 176h480M60 224h480M60 272h480"/>
        </g>
      </svg>`,
    pfdoor: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="ppfG" x1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1208"/><stop offset="1" stop-color="#6f3a18"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#ppfG)"/>
        <g class="ripples" fill="none" stroke="#3fb44a">
          <circle class="rp" cx="180" cy="180" r="20" stroke-width="1.4"/>
          <circle class="rp" cx="180" cy="180" r="60" stroke-width="1.1" opacity=".7"/>
          <circle class="rp" cx="180" cy="180" r="110" stroke-width=".9" opacity=".5"/>
          <circle class="rp2" cx="420" cy="220" r="18" stroke-width="1.4"/>
          <circle class="rp2" cx="420" cy="220" r="56" stroke-width="1.1" opacity=".7"/>
          <circle class="rp2" cx="420" cy="220" r="100" stroke-width=".8" opacity=".45"/>
        </g>
        <g class="droplets" fill="#3fb44a">
          <ellipse class="dp" cx="180" cy="100" rx="4" ry="6"/>
          <ellipse class="dp dp2" cx="420" cy="140" rx="4" ry="6"/>
        </g>
      </svg>`,
    blockboard: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="pbbG" x1="0" x2="1" y2="1"><stop offset="0" stop-color="#321a0c"/><stop offset="1" stop-color="#9a5526"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#pbbG)"/>
        <g class="battens">
          ${Array.from({length:14},(_,i)=>{const x=20+i*42;return `<rect class="bt" x="${x}" y="60" width="32" height="240" fill="#7a3b1a" stroke="#3fb44a" stroke-width=".7" style="animation-delay:${(i*.08).toFixed(2)}s"/>`}).join('')}
        </g>
        <rect x="10" y="54" width="580" height="4" fill="#3fb44a" opacity=".5"/>
        <rect x="10" y="302" width="580" height="4" fill="#3fb44a" opacity=".5"/>
      </svg>`,
    flexi: `
      <svg class="poster" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="pflG" x1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1608"/><stop offset="1" stop-color="#bf7032"/></linearGradient></defs>
        <rect width="600" height="360" fill="url(#pflG)"/>
        <g class="flex" fill="none" stroke="#3fb44a" stroke-width="2">
          <path class="fx fx1" d="M40 180 Q 200 60 300 180 T 560 180" opacity=".9"/>
          <path class="fx fx2" d="M40 200 Q 200 80 300 200 T 560 200" opacity=".6"/>
          <path class="fx fx3" d="M40 220 Q 200 100 300 220 T 560 220" opacity=".4"/>
          <path class="fx fx4" d="M40 160 Q 200 40 300 160 T 560 160" opacity=".5"/>
        </g>
      </svg>`
  };

  document.querySelectorAll('.product[data-poster]').forEach(card => {
    const key = card.getAttribute('data-poster');
    const svg = POSTERS[key];
    const img = card.querySelector('.product-img');
    if(!svg || !img) return;
    img.insertAdjacentHTML('afterbegin', svg);
  });
})();


/* ============ ENQUIRE NOW MODAL ============ */
(function(){
  const modal = document.getElementById('enquireModal');
  if(!modal) return;
  const form = document.getElementById('enquireForm');
  let opened = false;

  function open(){
    if(opened) return;
    opened = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    setTimeout(()=>{ const f = modal.querySelector('input'); if(f) f.focus(); }, 350);
  }
  function close(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    opened = false;
  }

  modal.addEventListener('click', e=>{ if(e.target.matches('[data-close]')) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.classList.contains('open')) close(); });

  if(form){
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if(btn){ btn.innerHTML = 'Thank you ✓'; btn.disabled = true; }
      setTimeout(close, 1400);
    });
  }

  // Side tab opens the modal
  const tab = document.getElementById('enquireTab');
  if(tab) tab.addEventListener('click', ()=>open());

  // Expose for nav links
  window.openEnquireModal = open;

  function openWithInterest(value){
    const sel = modal.querySelector('select[name="interest"]');
    if(sel && value){
      const opt = [...sel.options].find(o=>o.value===value || o.textContent===value);
      if(opt) sel.value = opt.value;
    }
    open();
  }

  // Contact-tag buttons
  const ctEnq = document.getElementById('ctEnquire');
  const ctDeal = document.getElementById('ctDealer');
  if(ctEnq) ctEnq.addEventListener('click', e=>{ e.preventDefault(); openWithInterest(); });
  if(ctDeal) ctDeal.addEventListener('click', e=>{ e.preventDefault(); openWithInterest('Dealership Enquiry'); });

  // 'Become a Dealer' primary buttons
  document.querySelectorAll('a.btn').forEach(a=>{
    if(a.textContent.trim().toLowerCase().startsWith('become a dealer')){
      a.addEventListener('click', e=>{ e.preventDefault(); openWithInterest('Dealership Enquiry'); });
    }
  });
  // 'Request Quote' nav CTA -> open modal directly
  document.querySelectorAll('a.btn-cta').forEach(a=>{
    a.addEventListener('click', e=>{ e.preventDefault(); open(); });
  });
  // All '.link-arrow' Enquire links on product cards
  document.querySelectorAll('a.link-arrow[href="#contact"]').forEach(a=>{
    a.addEventListener('click', e=>{ e.preventDefault(); open(); });
  });
})();
