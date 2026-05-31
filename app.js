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


