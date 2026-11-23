/* Single post: tangent notes in the margins with their connectors, and the image lightbox. */
(function(){
  const NS = 'http://www.w3.org/2000/svg';
  const f = n => n.toFixed(1);

  /* ---------- tangents ----------
     Each connector starts at the highlight's corner, drops into the gap under that line of text,
     runs straight to the edge of the text column (dotted when it travels far), and only past the
     column edge turns into one smooth swoosh, optionally with a single round loop, that rises
     into an open arrowhead at the note. It never crosses glyphs and carries no roughen filter. */
  const sheet = document.querySelector('.sheet[data-tangents]');
  if (sheet){
    const body = sheet.querySelector('.post-body');
    const wide = matchMedia('(min-width: 1400px)');  // keep in step with post.css
    const ANCHOR = 30;      // where on the note's edge the arrow lands, from its top
    const pairs = [...sheet.querySelectorAll('aside.tn')].map(note => ({
      note, hl: document.getElementById(note.id + '-hl'), ref: document.getElementById(note.id + '-ref')
    })).filter(p => p.hl && p.ref);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'tn-wires');
    svg.setAttribute('aria-hidden', 'true');
    sheet.appendChild(svg);

    // smooth cubic path through sampled points (Catmull-Rom, tension 1/6)
    function through(pts){
      let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
      for (let i = 0; i < pts.length - 1; i++){
        const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
        d += ` C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
      }
      return d;
    }
    function arrowhead(tip, from){
      const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]) + Math.PI, L = 10;
      const p = k => `${f(tip[0] + Math.cos(a + k) * L)} ${f(tip[1] + Math.sin(a + k) * L)}`;
      return `M${p(-.74)} L${f(tip[0])} ${f(tip[1])} L${p(.74)}`;
    }

    function draw(p, r, gapY, S, col){
      const s = p.note.dataset.side === 'right' ? 1 : -1;
      const N = p.note.getBoundingClientRect();
      const x0 = (s > 0 ? r.right - 3 : r.left + 3) - S.left, y0 = r.bottom - S.top - 1;
      const bend = Math.max(2, Math.min(6, gapY - y0));
      const ex = s > 0 ? col.right + 12 : col.left - 12;
      const tip = [(s > 0 ? N.left - 7 : N.right + 7) - S.left, N.top - S.top + ANCHOR];
      const g = document.createElementNS(NS, 'g');
      g.dataset.for = p.note.id;
      g.dataset.tone = p.note.dataset.tone;
      const runLen = Math.abs(ex - x0);
      const run = `M${f(x0)} ${f(y0)} Q${f(x0)} ${f(gapY)} ${f(x0 + s * bend)} ${f(gapY)} L${f(ex)} ${f(gapY)}`;
      // past the column edge: one cubic, leaving level and rising into the tip from below
      let E = [ex, gapY], loop = '';
      if (p.note.dataset.arrow === 'loop' && Math.abs(tip[0] - ex) > 64){
        // one round loop on a short level stretch past the column edge: a circle traced while the
        // point moves forward, so it rises, swings back over itself and leaves level again
        const R = 7.5, L = 3.4 * R, pts = [];
        for (let i = 0; i <= 32; i++){
          const t = i / 32, th = t * Math.PI * 2;
          pts.push([ex + s * (L * t + R * Math.sin(th)), gapY - R * (1 - Math.cos(th))]);
        }
        loop = through(pts);
        E = [ex + s * L, gapY];
      }
      const dx = Math.abs(tip[0] - E[0]), k2 = Math.min(dx * .36, 24), depth = k2 * .85;
      const c1 = [E[0] + s * dx * .5, gapY], c2 = [tip[0] - s * k2, tip[1] + depth];
      const swoosh = loop + `${loop ? ' ' : ''}M${f(E[0])} ${f(E[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(tip[0])} ${f(tip[1])}`;
      const from = c2;
      g.innerHTML = `<circle cx="${f(x0)}" cy="${f(y0)}" r="2.4"/><path class="${runLen > 48 ? 'dotted' : ''}" d="${run}"/>`
        + `<path d="${swoosh}"/><path d="${arrowhead(tip, from)}"/>`;
      svg.appendChild(g);
    }

    // index cards: put each ruled line just under a text baseline, whatever the system mono's metrics
    function snapCards(){
      sheet.querySelectorAll('.tn-card').forEach(card => {
        const text = card.querySelector('.tn-text');
        if (!text || !card.offsetParent) return;
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        text.insertBefore(probe, text.firstChild);
        // offsetTop ignores the card's rotation; the card is positioned, so it is the offsetParent
        const y = probe.offsetTop;
        probe.remove();
        card.style.setProperty('--ry', y + 2 + 'px');
      });
    }

    function layout(){
      const on = wide.matches;
      sheet.classList.toggle('tn-on', on);
      sheet.classList.toggle('tn-fold', !on);
      svg.textContent = '';
      snapCards();
      if (!on){
        pairs.forEach(p => { p.note.style.top = ''; p.ref.setAttribute('aria-expanded', String(p.note.classList.contains('open'))); p.ref.setAttribute('aria-controls', p.note.id); });
        return;
      }
      pairs.forEach(p => { p.ref.removeAttribute('aria-expanded'); p.ref.removeAttribute('aria-controls'); });
      const S = sheet.getBoundingClientRect(), B = body.getBoundingClientRect();
      const col = {left: B.left - S.left, right: B.right - S.left};
      // figures that reach past the sheet edge keep that margin occupied
      const blocked = {left: [], right: []};
      sheet.querySelectorAll('.fig, .gallery').forEach(el => {
        const r = el.getBoundingClientRect(), span = [r.top - S.top - 18, r.bottom - S.top + 18];
        if (r.right > S.right + 1) blocked.right.push(span);
        if (r.left < S.left - 1) blocked.left.push(span);
      });
      const floor = {left: -Infinity, right: -Infinity};
      pairs.forEach(p => {
        const side = p.note.dataset.side, s = side === 'right' ? 1 : -1;
        const rects = [...p.hl.getClientRects()].filter(r => r.width > 0);
        if (!rects.length) return;
        const r = s > 0 ? rects[rects.length - 1] : rects[0];
        const lh = parseFloat(getComputedStyle(p.hl.closest('p') || body).lineHeight) || r.height * 1.7;
        // bottom of the line box: the middle of the leading between this line and the next
        const gapY = (r.top + r.bottom) / 2 - S.top + lh / 2;
        const h = p.note.offsetHeight;
        // nearest free slot to the ideal spot: above or below any figure in that margin, never above the
        // previous note, so the connector stays short and never sweeps across a figure
        const want = Math.max(gapY - ANCHOR - 12, floor[side]);
        const free = t => t >= floor[side] && blocked[side].every(([a, b]) => t >= b || t + h <= a);
        const options = [want, ...blocked[side].flatMap(([a, b]) => [a - h, b])].filter(free);
        let top = options.length ? options.reduce((best, t) => Math.abs(t - want) < Math.abs(best - want) ? t : best) : want;
        p.note.style.top = f(top) + 'px';
        floor[side] = top + h + 22;
        draw(p, r, gapY, S, col);
      });
    }

    function hot(p, on){
      [p.hl, p.ref, p.note, svg.querySelector(`[data-for="${p.note.id}"]`)].forEach(el => el && el.classList.toggle('hot', on));
    }
    pairs.forEach(p => {
      [p.hl, p.ref, p.note].forEach(el => {
        el.addEventListener('mouseenter', () => hot(p, true));
        el.addEventListener('mouseleave', () => hot(p, false));
      });
      [p.ref, p.note].forEach(el => {
        el.addEventListener('focusin', () => hot(p, true));
        el.addEventListener('focusout', () => hot(p, false));
      });
      p.ref.addEventListener('click', e => {
        e.preventDefault();
        if (wide.matches){ p.note.focus({preventScroll: true}); return; }
        const open = p.note.classList.toggle('open');
        p.ref.setAttribute('aria-expanded', String(open));
        if (open) snapCards();
      });
    });

    let raf = 0;
    const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    layout();
    wide.addEventListener('change', refresh);
    addEventListener('resize', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(body);
    sheet.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', refresh, {once: true}); });
  }

  /* ---------- lightbox ----------
     Every figure links to its full-size image, so without JS a click simply opens the file.
     With JS it lifts into a <dialog>; arrows step through the same gallery (or the post's
     loose figures), Escape closes, and focus returns to the figure. */
  const links = [...document.querySelectorAll('a[data-lb]')];
  if (!links.length) return;
  let dlg = null, group = [], at = 0, opener = null;
  function build(){
    dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Image viewer');
    dlg.innerHTML = '<figure class="lb-fig"><div class="lb-frame"><img alt=""></div><figcaption class="lb-cap"><span class="lb-txt"></span><span class="lb-count mono"></span></figcaption></figure>'
      + '<button class="lb-btn lb-prev" type="button" aria-label="Previous image">&lsaquo;</button><button class="lb-btn lb-next" type="button" aria-label="Next image">&rsaquo;</button><button class="lb-btn lb-close" type="button" aria-label="Close">&times;</button>';
    document.body.appendChild(dlg);
    dlg.querySelector('.lb-prev').addEventListener('click', () => step(-1));
    dlg.querySelector('.lb-next').addEventListener('click', () => step(1));
    dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); });
    dlg.addEventListener('close', () => { if (opener) opener.focus(); });
  }
  function show(){
    const a = group[at], img = a.querySelector('img'), cap = a.closest('figure').querySelector('figcaption');
    const big = dlg.querySelector('img');
    big.src = a.href; big.alt = img ? img.alt : '';
    dlg.querySelector('.lb-txt').textContent = cap ? cap.textContent : '';
    dlg.querySelector('.lb-count').textContent = group.length > 1 ? `${at + 1} / ${group.length}` : '';
    dlg.querySelectorAll('.lb-prev, .lb-next').forEach(b => { b.hidden = group.length < 2; });
    const fig = dlg.querySelector('.lb-fig');
    fig.style.animation = 'none'; void fig.offsetWidth; fig.style.animation = '';
  }
  function step(d){ at = (at + d + group.length) % group.length; show(); }
  links.forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (!dlg) build();
    group = links.filter(l => l.dataset.lb === a.dataset.lb);
    at = group.indexOf(a); opener = a;
    show();
    dlg.showModal();
    dlg.querySelector('.lb-close').focus();
  }));
})();
