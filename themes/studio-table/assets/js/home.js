/* Home: the clothesline tags kick as the ducks pass, the stitch sews in once, the shelf plant swaps on
   click, the shelf cat grumbles on click, ruled papers snap to baselines. */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);

  /* When mama passes ~40% across a [data-bump]'s zone, replay its .go animation and that of each
     data-with partner in the scene (the line sags and both pegged tags dip). */
  const scene = $('#scene'), mama = $('#train svg:last-child');
  if (!reduce && scene && mama){
    const replay = el => { el.classList.remove('go'); el.getBoundingClientRect(); el.classList.add('go'); };
    const targets = [...scene.querySelectorAll('[data-bump]')].map(el => ({
      el, zone: el.dataset.zone ? $(el.dataset.zone, el) : el,
      with: el.dataset.with ? [...scene.querySelectorAll(el.dataset.with)].filter(w => w !== el) : [], done: false}));
    if (targets.length) setInterval(() => {
      const m = mama.getBoundingClientRect();
      targets.forEach(t => {
        const r = t.zone.getBoundingClientRect(), mid = r.left + r.width * .4;
        if (!t.done && m.right > mid && m.left < r.right){ t.done = true; replay(t.el); t.with.forEach(replay); }
        if (t.done && m.right < r.left - 60) t.done = false;
      });
    }, 120);
  }

  // One-shot stitch-in the first time the panel is seen; the resting state is the full graph.
  const panel = $('#stitch');
  if (panel && !reduce && 'IntersectionObserver' in window){
    const cols = $('#grid').viewBox.baseVal.width / 14;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.disconnect();
      panel.classList.add('sewing');
      setTimeout(() => panel.classList.remove('sewing'), cols * 26 + 600);
    }), {threshold: .35});
    io.observe(panel);
  }

  /* Shelf plant easter egg: a click swaps to the next of the eight plants, looping. One swap
     runs at a time; clicks during a swap queue at most one more, so bursts never stack. */
  const plants = [...document.querySelectorAll('.sh-plants .sh-pl')];
  if (plants.length > 1){
    let cur = 0, busy = false, queued = false;
    // SVGElement has no .hidden property, so the attribute is toggled directly
    const show = (from, to) => { from.setAttribute('hidden', ''); to.removeAttribute('hidden'); };
    const swap = () => {
      const from = plants[cur];
      cur = (cur + 1) % plants.length;
      const to = plants[cur];
      if (reduce || !from.animate){ show(from, to); return; }
      busy = true;
      from.animate([{transform:'scale(1)', opacity:1}, {transform:'translateY(3px) scale(.85)', opacity:0}],
        {duration:110, easing:'cubic-bezier(.4,0,1,1)'}).finished.then(() => {
        show(from, to);
        return to.animate([
          {transform:'translateY(6px) scale(.7)', opacity:0},
          {transform:'translateY(-1px) scale(1.06)', opacity:1, offset:.6},
          {transform:'none', opacity:1}
        ], {duration:190, easing:'cubic-bezier(.2,.8,.2,1)'}).finished;
      }).catch(() => show(from, to)).finally(() => {
        busy = false;
        if (queued){ queued = false; swap(); }
      });
    };
    plants[0].parentElement.addEventListener('click', () => { if (busy) queued = true; else swap(); });
  }

  /* Shelf cat easter egg: a click wakes the napping cat grumpy (shake, anger mark in place of the
     zz, half-open eyes) and it dozes off 1.8s after the last click. Clicks during the 400ms shake
     are ignored so it never restarts or jitters; later clicks only push the return-to-sleep back.
     Three accepted clicks within 2s bump the mark once. Like the plant it is aria-hidden with no
     cursor, focus or hint, so there is deliberately no keyboard path. Reduced motion drops the
     shake and pop in CSS but keeps the instant swap. */
  const lie = $('.sh-lie'), cat = lie && $('.sh-cat', lie);
  if (cat){
    const SHAKE = reduce ? 0 : 400, HOLD = 1800, BUMP_WINDOW = 2000;
    let timer = 0, since = 0, taps = 0;
    const sleep = () => { lie.classList.remove('is-grumpy', 'is-furious'); taps = 0; };
    cat.addEventListener('click', () => {
      const now = performance.now();
      if (lie.classList.contains('is-grumpy')){
        if (now - since < SHAKE) return;
        if (++taps >= 3 && now - since <= BUMP_WINDOW) lie.classList.add('is-furious');
      } else {
        since = now; taps = 1;
        lie.classList.add('is-grumpy');
      }
      clearTimeout(timer);
      timer = setTimeout(sleep, HOLD);
    });
  }

  /* Baseline snapping for the ruled papers: measure where the text baseline falls inside one
     line box, offset the rules to it, and nudge other type sizes onto the same rules. */
  function baseline(el){
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const y = probe.offsetTop;
    probe.remove();
    return y;
  }
  function snap(){
    const sheet = $('#sheet'), p = sheet && $('p', sheet);
    if (p){
      const bp = baseline(p);
      sheet.style.setProperty('--ry', bp + 'px');
      sheet.style.setProperty('--hshift', (bp - baseline($('h2', sheet))) + 'px');
      const meta = $('.meta', sheet);
      if (meta) sheet.style.setProperty('--mshift', (bp - baseline(meta)) + 'px');
    }
    const list = $('#plist'), v = list && $('.v', list), k = list && $('.k', list);
    if (v && k){
      const bv = baseline(v);
      list.style.setProperty('--ry', bv + 'px');
      list.style.setProperty('--kshift', (bv - baseline(k)) + 'px');
      const more = $('.more', list);
      if (more){ more.style.top = '0px'; list.style.setProperty('--moreshift', (bv - baseline(more)) + 'px'); more.style.top = ''; }
    }
  }
  snap();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
  let rt = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(snap); });
})();
