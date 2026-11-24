{
  // mobile menu
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.main-nav');
  btn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  // dropdown (click/tap; hover handled by CSS on desktop)
  document.querySelectorAll('.sub-toggle').forEach(t => t.addEventListener('click', e => {
    const li = t.parentElement;
    const open = li.classList.toggle('open');
    t.setAttribute('aria-expanded', open);
    e.stopPropagation();
  }));
  document.addEventListener('click', () => document.querySelectorAll('.has-sub.open').forEach(li => {
    li.classList.remove('open'); li.querySelector('.sub-toggle').setAttribute('aria-expanded', false);
  }));

  // lightbox
  const lb = document.querySelector('.lightbox');
  const lbImg = lb.querySelector('img');
  let items = [], idx = 0;
  const show = i => { idx = (i + items.length) % items.length; lbImg.src = items[idx].href; };
  document.querySelectorAll('.gallery').forEach(g => g.addEventListener('click', e => {
    const a = e.target.closest('.g-item'); if (!a) return;
    e.preventDefault();
    items = [...g.querySelectorAll('.g-item')];
    show(items.indexOf(a)); lb.hidden = false; document.body.style.overflow = 'hidden';
  }));
  const close = () => { lb.hidden = true; lbImg.src = ''; document.body.style.overflow = ''; };
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
}
