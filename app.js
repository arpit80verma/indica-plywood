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

