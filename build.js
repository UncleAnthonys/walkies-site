#!/usr/bin/env node
// Walkies static site builder — no dependencies.
// Usage: node build.js <site>            e.g. node build.js walkies-bath
//        node build.js <site> --fetch    also downloads every image into the site so it no longer depends on Squarespace
// Output: dist/<site>/
'use strict';
const fs = require('fs');
const path = require('path');

const siteId = process.argv[2] || 'walkies-bath';
const FETCH = process.argv.includes('--fetch');
const ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'sites', siteId);
const OUT = path.join(ROOT, 'dist', siteId);
const S = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'site.json'), 'utf8'));

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const telHref = p => 'tel:' + p.replace(/\s+/g, '');

// Stable local file name for a Squarespace CDN url: "<first 8 of folder id>-<file name>"
function localName(url) {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean);
  const file = decodeURIComponent(parts.pop()).replace(/\+/g, '-').replace(/[^\w.\-]+/g, '-');
  const folder = (parts.pop() || '').replace(/[^\w]/g, '').slice(0, 8);
  return (folder ? folder + '-' : '') + file;
}
const allImages = new Set();
function img(url, width = 1500) {
  if (!url) return '';
  if (!/^https?:/.test(url)) return url; // already local
  allImages.add(url);
  const local = path.join(SITE_DIR, 'images', localName(url));
  if (fs.existsSync(local)) return 'images/' + localName(url);
  return url + (url.includes('?') ? '&' : '?') + 'format=' + width + 'w';
}

// ---------- nav ----------
const multi = S.paddocks.length > 1;
const nav = [
  { label: 'About', href: 'index.html#about' },
  multi
    ? { label: 'Our Paddocks', children: S.paddocks.map(p => ({ label: p.name, href: p.slug + '.html' })) }
    : { label: 'Our Paddock', href: S.paddocks[0].slug + '.html' },
  { label: 'Find Us', href: 'find-us.html' },
  { label: 'Gallery', href: 'gallery.html' },
  { label: 'Sensory Garden', href: 'sensory-garden.html' },
  { label: 'FAQs', href: 'faqs.html' },
  { label: 'Book Now', href: 'book-now.html' },
  { label: 'Contact Us', href: 'contact-us.html' }
];

const icons = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21 8.1c-.1-1.6-.4-3-1.6-4.1S16.9 2.5 15.3 2.4c-1.6-.1-5.4-.1-7 0C6.7 2.5 5.3 2.8 4.2 4S2.5 6.5 2.4 8.1c-.1 1.6-.1 6.4 0 8 .1 1.6.4 3 1.6 4.1s2.5 1.5 4.1 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.1-1.6s1.5-2.5 1.6-4.1c.1-1.6.1-6.3-.8-8zM19 18.2a3 3 0 0 1-1.7 1.7c-1.2.5-4 .4-5.3.4s-4.1.1-5.3-.4A3 3 0 0 1 5 18.2c-.5-1.2-.4-4-.4-5.3s-.1-4.1.4-5.3A3 3 0 0 1 6.7 6c1.2-.5 4-.4 5.3-.4s4.1-.1 5.3.4A3 3 0 0 1 19 7.6c.5 1.2.4 4 .4 5.3s.1 4.1-.4 5.3z"/></svg>'
};
const socials = () => Object.entries(S.social).filter(([, u]) => u)
  .map(([k, u]) => `<a class="social" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${k}">${icons[k] || ''}</a>`).join('');

function navHtml(current) {
  return nav.map(n => n.children
    ? `<li class="has-sub"><button class="sub-toggle" aria-expanded="false">${esc(n.label)}</button><ul class="sub">${n.children.map(c => `<li><a href="${c.href}"${c.href === current ? ' aria-current="page"' : ''}>${esc(c.label)}</a></li>`).join('')}</ul></li>`
    : `<li><a href="${n.href}"${n.href === current ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`).join('');
}

// ---------- layout ----------
function layout({ file, title, description, body }) {
  const t = S.theme;
  const fonts = [t.headingFont, t.bodyFont].filter((v, i, a) => a.indexOf(v) === i)
    .map(f => 'family=' + f.replace(/ /g, '+') + ':wght@300;400;600;700').join('&');
  const fullTitle = title ? `${title} — ${S.name}` : S.name;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || S.metaDescription)}">
<link rel="canonical" href="${esc(S.domain)}/${file === 'index.html' ? '' : file.replace('.html', '')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || S.metaDescription)}">
<meta property="og:image" content="${esc(img(S.shareImage))}">
<meta property="og:type" content="website">
<link rel="icon" href="${esc(img(S.logo, 100))}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">
<link rel="stylesheet" href="assets/style.css">
<style>:root{--heading:'${t.headingFont}',system-ui,sans-serif;--body:'${t.bodyFont}',system-ui,sans-serif;--accent:${t.accent};--accent-ink:${t.accentText};--ink:${t.ink};--muted:${t.muted};--pale:${t.paleBg};--foot:${t.footerBg};--foot-ink:${t.footerInk}}</style>
</head>
<body>
<header class="site-header">
  <div class="header-top">
    <button class="menu-btn" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <a class="logo" href="index.html"><img src="${esc(img(S.logo, 750))}" alt="${esc(S.name)}"></a>
    <div class="header-socials">${socials()}</div>
  </div>
  <nav class="main-nav" aria-label="Main"><ul>${navHtml(file)}</ul></nav>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <h3>Quick Links</h3>
      <ul class="plain">
        <li><a href="find-us.html">Find Us</a></li>
        <li><a href="gallery.html">Gallery</a></li>
        <li><a href="sensory-garden.html">Sensory Garden</a></li>
        <li><a href="faqs.html">FAQs</a></li>
        <li><a href="book-now.html">Book Now</a></li>
        <li><a href="terms-conditions.html">Terms &amp; Conditions</a></li>
        <li><a href="xl-bully-terms-conditions.html">XL Bully T&amp;C's</a></li>
      </ul>
    </div>
    <div>
      <h3>Contact Us</h3>
      <p><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a><br>
      <a href="${telHref(S.contact.phone)}">${esc(S.contact.phone)}</a></p>
      <div class="footer-socials">${socials()}</div>
    </div>
    <div>
      <h3>Opening Hours</h3>
      <p>${esc(S.contact.hours)}</p>
    </div>
  </div>
  <p class="copyright">© ${new Date().getFullYear()} ${esc(S.name)}</p>
</footer>
<div class="lightbox" hidden><button class="lb-close" aria-label="Close">×</button><button class="lb-prev" aria-label="Previous">‹</button><img alt=""><button class="lb-next" aria-label="Next">›</button></div>
<script src="assets/main.js" defer></script>
</body>
</html>`;
}

const bookBtn = (label = 'Book Now') => `<a class="btn" href="book-now.html">${esc(label)}</a>`;
const paras = arr => arr.map(p => `<p>${p}</p>`).join('');
const galleryGrid = (urls, cls = '') => `<div class="gallery ${cls}">${urls.map((u, i) =>
  `<a href="${esc(img(u, 2500))}" class="g-item" data-i="${i}"><img loading="lazy" src="${esc(img(u, 750))}" alt="${esc(S.shortName)} dog paddock photo ${i + 1}"></a>`).join('')}</div>`;

// ---------- pages ----------
const pages = {};

pages['index.html'] = layout({
  file: 'index.html',
  body: `
<section class="hero" style="background-image:url('${esc(img(S.home.heroImage, 2500))}')">
  <div class="hero-inner">
    <h1>${esc(S.home.heroTitle)}</h1>
    ${bookBtn()}
  </div>
</section>
<section class="band intro" id="about">
  <div class="narrow center">${paras(S.home.intro.map(esc))}${bookBtn()}</div>
</section>
<section class="band pale">
  <h2 class="center">How does it work?</h2>
  <div class="steps">${S.home.steps.map(s => `
    <div class="step">
      <img loading="lazy" src="${esc(img(s.image, 750))}" alt="">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
    </div>`).join('')}
  </div>
</section>
${multi ? `<section class="band">
  <h2 class="center">Our Paddocks</h2>
  <div class="paddock-cards">${S.paddocks.map(p => `
    <a class="paddock-card" href="${p.slug}.html">
      <img loading="lazy" src="${esc(img(p.images[0], 1000))}" alt="${esc(p.name)} paddock">
      <span class="pc-body"><h3>${esc(p.name)}</h3><span>${esc(p.prices[0].price)} – ${esc(p.prices[p.prices.length - 1].price)} per 50 mins</span></span>
    </a>`).join('')}
  </div>
</section>` : ''}
<section class="band testimonials">
  <h2 class="center">Testimonials</h2>
  <div class="quotes">${S.home.testimonials.map(t => `
    <figure><blockquote>“${esc(t.text)}”</blockquote><figcaption>— ${esc(t.name)}</figcaption></figure>`).join('')}
  </div>
  <div class="center">${bookBtn()}</div>
</section>`
});

for (const p of S.paddocks) {
  pages[p.slug + '.html'] = layout({
    file: p.slug + '.html',
    title: p.name,
    description: p.intro[0],
    body: `
<section class="page-hero" style="background-image:url('${esc(img(p.images[0], 2500))}')"><h1>${esc(p.name)}</h1></section>
<section class="band">
  <div class="two-col">
    <div>
      ${paras(p.intro.map(esc))}
      <h3>${esc(p.featuresTitle)}</h3>
      <ul class="ticks">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <ul class="plain rules">${p.rules.map(r => `<li>${r}</li>`).join('')}</ul>
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
    </div>
    <aside class="price-card">
      <h3>Prices</h3>
      <table>${p.prices.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(x.price)}</td></tr>`).join('')}</table>
      <p class="small">${esc(p.priceNote)}</p>
      ${bookBtn('Book ' + p.name)}
      <p class="small addr">${esc(p.address)}<br>what3words: <a href="https://what3words.com/${esc(p.what3words)}" target="_blank" rel="noopener">///${esc(p.what3words)}</a></p>
    </aside>
  </div>
</section>
<section class="band pale">${galleryGrid(p.images)}</section>`
  });
}

pages['find-us.html'] = layout({
  file: 'find-us.html',
  title: 'Find Us',
  body: `
<section class="band"><h1 class="center">Find us</h1>
${S.paddocks.map(p => `
  <div class="find-row">
    <div>
      <h2>${esc(p.name)} Paddock</h2>
      <p><strong>Address:</strong> ${esc(p.address)}</p>
      <p><strong>what3words:</strong> <a href="https://what3words.com/${esc(p.what3words)}" target="_blank" rel="noopener">///${esc(p.what3words)}</a></p>
      <p>${esc(p.directions)}</p>
      <p><a class="btn btn-outline" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.mapQuery)}" target="_blank" rel="noopener">Open in Google Maps</a></p>
    </div>
    <div class="find-media">
      ${p.directionsImage ? `<img loading="lazy" src="${esc(img(p.directionsImage, 1000))}" alt="Directions to ${esc(p.name)} paddock">` : ''}
      <iframe loading="lazy" title="Map of ${esc(p.name)} paddock" src="https://maps.google.com/maps?q=${encodeURIComponent(p.mapQuery)}&z=14&output=embed"></iframe>
    </div>
  </div>`).join('')}
</section>`
});

pages['gallery.html'] = layout({
  file: 'gallery.html',
  title: 'Gallery',
  description: 'Some photographs of our four legged friends enjoying the exclusive dog field.',
  body: `<section class="band"><h1 class="center">Gallery</h1>${galleryGrid(S.gallery, 'masonry')}</section>`
});

const sg = S.sensoryGarden;
pages['sensory-garden.html'] = layout({
  file: 'sensory-garden.html',
  title: 'Sensory Garden',
  body: `
<section class="page-hero" style="background-image:url('${esc(img(sg.images[0], 2500))}')"><h1>Sensory Garden</h1></section>
<section class="band"><div class="narrow">
  <p class="lead">${esc(sg.intro)}</p>
  ${sg.sections.map(s => `<h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>`).join('')}
</div></section>
<section class="band pale">${galleryGrid(sg.images, 'three')}</section>
<section class="band"><div class="narrow">
  <h2>${esc(sg.plantsTitle)}</h2>
  <dl class="plants">${sg.plants.map(([n, d]) => `<div><dt>${esc(n)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
</div></section>`
});

pages['faqs.html'] = layout({
  file: 'faqs.html',
  title: 'FAQs',
  body: `<section class="band"><div class="narrow"><h1 class="center">FAQs</h1>
  <div class="faq">${S.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  <p class="center">Still got a question? <a href="contact-us.html">Get in touch</a>.</p></div></section>`
});

const embed = S.booking.embedUrl;
pages['book-now.html'] = layout({
  file: 'book-now.html',
  title: 'Book Now',
  body: `<section class="band"><div class="narrow"><h1 class="center">Book Now</h1>
  <ul class="plain booking-info">${S.bookingInfo.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>
  <div class="booking-frame">${embed
    ? `<iframe src="${esc(embed)}" title="Book a session" width="100%" height="900" frameborder="0" allow="payment"></iframe><script src="https://embed.acuityscheduling.com/js/embed.js"></script>`
    : `<div class="center"><a class="btn btn-big" href="${esc(S.booking.fallbackUrl)}" target="_blank" rel="noopener">Choose your date &amp; time</a></div>`}
  </div></section>`
});

pages['contact-us.html'] = layout({
  file: 'contact-us.html',
  title: 'Contact Us',
  body: `<section class="band"><div class="narrow center"><h1>Contact us.</h1>
  <p class="lead">Email: <a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a></p>
  <p class="lead">Phone: <a href="${telHref(S.contact.phone)}">${esc(S.contact.phone)}</a>${S.contact.altPhone ? ` or <a href="${telHref(S.contact.altPhone)}">${esc(S.contact.altPhone)}</a>` : ''}</p>
  <p>Or message us on <a href="${esc(S.social.facebook)}" target="_blank" rel="noopener">Facebook</a> or <a href="${esc(S.social.instagram)}" target="_blank" rel="noopener">Instagram</a>.</p>
  <p>${esc(S.contact.hours)}</p>${bookBtn()}</div></section>`
});

pages['terms-conditions.html'] = layout({
  file: 'terms-conditions.html',
  title: 'Terms & Conditions',
  body: `<section class="band"><div class="narrow"><h1>Terms &amp; Conditions</h1>
  ${S.terms.map(([h, t]) => `<h2 class="h3">${esc(h)}</h2><p>${esc(t)}</p>`).join('')}</div></section>`
});

pages['xl-bully-terms-conditions.html'] = layout({
  file: 'xl-bully-terms-conditions.html',
  title: "XL Bully T&C's",
  body: `<section class="band"><div class="narrow"><h1>XL Bully Terms &amp; Conditions</h1>
  <p class="lead">${esc(S.xlBullyTerms.intro)}</p>
  <ol>${S.xlBullyTerms.items.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div></section>`
});

pages['404.html'] = layout({
  file: '404.html', title: 'Page not found',
  body: `<section class="band"><div class="narrow center"><h1>Page not found</h1><p>Sorry, that page doesn't exist.</p><a class="btn" href="index.html">Back to home</a></div></section>`
});

// ---------- write ----------
async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

  if (FETCH) {
    // collect every image url by doing a dry render pass first
    const imgDir = path.join(SITE_DIR, 'images');
    fs.mkdirSync(imgDir, { recursive: true });
    let ok = 0, fail = 0;
    for (const url of allImages) {
      const dest = path.join(imgDir, localName(url));
      if (fs.existsSync(dest)) { ok++; continue; }
      try {
        const res = await fetch(url + '?format=2500w');
        if (!res.ok) throw new Error(res.status);
        fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        ok++;
      } catch (e) { fail++; console.warn('  could not download', url, e.message); }
    }
    console.log(`images: ${ok} saved, ${fail} failed -> sites/${siteId}/images/`);
    // re-run without --fetch so pages now point at the local copies
    require('child_process').execFileSync(process.execPath, [__filename, siteId], { stdio: 'inherit' });
    return;
  }

  for (const [f, html] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, f), html);
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(OUT, 'assets', f));
  const imgDir = path.join(SITE_DIR, 'images');
  if (fs.existsSync(imgDir)) fs.cpSync(imgDir, path.join(OUT, 'images'), { recursive: true });
  // pretty URLs: /find-us works as well as /find-us.html on Netlify / Cloudflare Pages
  fs.writeFileSync(path.join(OUT, '_redirects'), [
    '/home / 301',
    '/bathampton-1 /bathampton 301',
    '/bradford-on-avon-1 /bradford-on-avon 301',
    '/https/walkiesbathbooknowasme /book-now 301',
    '/https/walkiesbathbooknow /book-now 301'
  ].join('\n') + '\n');
  console.log(`built ${Object.keys(pages).length} pages -> dist/${siteId}/`);
}
main();
