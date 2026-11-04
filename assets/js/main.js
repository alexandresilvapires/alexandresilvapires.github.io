'use strict';
// Highlights the current section in the sticky sub-navigation.
const links = [...document.querySelectorAll('.subnav a[href^="#"]')];
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach(a => a.toggleAttribute('aria-current', a.hash === '#' + e.target.id));
    const on = links.find(a => a.hash === '#' + e.target.id);
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('main section[id]').forEach(s => io.observe(s));

// One-time hint on the academic page pointing to the personal page.
const header = document.querySelector('.site-header .wrap');
if (document.body.dataset.side === 'academic' && header) {
  let seen = false;
  try { seen = localStorage.getItem('seenPersonalHint'); } catch (e) {}
  if (!seen) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = '<a href="./personal.html">You\u2019re on my academic page. Check my personal page here!</a><button type="button" aria-label="Dismiss">\u00d7</button>';
    hint.querySelector('button').addEventListener('click', () => hint.remove());
    header.appendChild(hint);
    try { localStorage.setItem('seenPersonalHint', '1'); } catch (e) {}
  }
}

// Image preview on hover for [data-preview] rows. It hides as soon as the pointer leaves the row, including onto the image.
const items = document.querySelectorAll('[data-preview]');
if (items.length && matchMedia('(hover: hover)').matches) {
  const img = document.createElement('img');
  img.className = 'preview';
  img.alt = '';
  document.body.appendChild(img);
  const hide = () => img.classList.remove('on');
  items.forEach(el => {
    el.addEventListener('mouseenter', () => {
      const r = el.getBoundingClientRect();
      img.src = el.dataset.preview;
      img.style.left = Math.max(8, Math.min(r.left, innerWidth - 276)) + 'px';
      if (r.top > 220) { img.style.top = (r.top - 8) + 'px'; img.style.transform = 'translateY(-100%)'; }
      else { img.style.top = (r.bottom + 8) + 'px'; img.style.transform = 'none'; }
      img.classList.add('on');
    });
    el.addEventListener('mouseleave', hide);
  });
  addEventListener('scroll', hide, { passive: true });
}