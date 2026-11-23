/* Posts index filter. The tab row ships hidden, so without JS the full list shows.
   Filtering is in place: non-matching rows leave the flow and the rest pack up to the top,
   animated FLIP-style with transform and opacity only. The active tag lives in ?tag=<name>. */
(function(){
  const tabsEl = document.querySelector('.ix-tabs');
  const list = document.getElementById('ix-list');
  if (!tabsEl || !list) return;
  const tabs = [...tabsEl.querySelectorAll('.ix-tab')];
  const items = [...list.querySelectorAll('.ix-item')];
  const status = document.querySelector('[data-ix-status]');
  const known = new Set(tabs.map(t => t.dataset.tag));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const noun = (list.closest('.ix').querySelector('h1').textContent || 'posts').trim();
  let current = '';
  let anims = [];

  const tagsOf = li => (li.dataset.tags || '').split(' ').filter(Boolean);
  const matches = (li, tag) => !tag || tagsOf(li).includes(tag);
  const shown = li => !li.hidden && !li.classList.contains('is-leaving');

  // Ends every running animation and settles rows in their final state, so a click that
  // lands mid-animation always starts from a clean layout.
  function settle(){
    anims.forEach(a => a.cancel());
    anims = [];
    items.forEach(li => {
      if (li.classList.contains('is-leaving')){ li.hidden = true; li.classList.remove('is-leaving', 'keep-rule'); li.style.top = ''; }
    });
  }

  function apply(tag, animate){
    // First: where each row is on screen right now, mid-animation included.
    const first = new Map();
    const fade = new Map();
    if (animate) items.forEach(li => {
      if (li.hidden) return;
      first.set(li, li.getBoundingClientRect());
      fade.set(li, +getComputedStyle(li).opacity);
    });
    const listTop = list.getBoundingClientRect().top;
    settle();

    current = tag;
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.tag === tag)));

    const leaving = [];
    items.forEach(li => {
      const on = matches(li, tag);
      if (!on && !li.hidden && animate && first.has(li)){
        // Out of the flow at once, but held where it was while it fades.
        if (getComputedStyle(li).borderTopStyle !== 'none') li.classList.add('keep-rule');
        li.classList.add('is-leaving');
        li.style.top = (first.get(li).top - listTop) + 'px';
        leaving.push(li);
      } else {
        li.hidden = !on;
      }
    });

    const n = items.filter(shown).length;
    const word = n === 1 ? noun.replace(/s$/, '') : noun;
    if (status) status.textContent = tag ? `${n} ${word} tagged ${tag}` : `all ${n} ${word}`;
    if (!animate) return;

    // Last, Invert, Play.
    const base = {duration: 340, easing: EASE};
    items.forEach(li => {
      if (!shown(li)) return;
      const a = first.get(li);
      const b = li.getBoundingClientRect();
      if (a){
        const dy = a.top - b.top;
        if (Math.abs(dy) < 0.5 && fade.get(li) >= 0.999) return;
        anims.push(li.animate([{transform: `translateY(${dy}px)`, opacity: fade.get(li)}, {transform: 'none', opacity: 1}], base));
      } else {
        anims.push(li.animate([{transform: 'translateY(8px)', opacity: 0}, {transform: 'none', opacity: 1}], {...base, duration: 300, delay: 90, fill: 'backwards'}));
      }
    });
    leaving.forEach(li => {
      const a = li.animate([{opacity: fade.get(li)}, {opacity: 0}], {duration: 160, easing: 'ease-out', fill: 'forwards'});
      anims.push(a);
      a.onfinish = () => {
        if (!li.classList.contains('is-leaving')) return;
        li.hidden = true; li.classList.remove('is-leaving', 'keep-rule'); li.style.top = '';
        a.cancel();
      };
    });
  }

  function setURL(tag){
    const url = new URL(location.href);
    if (tag) url.searchParams.set('tag', tag); else url.searchParams.delete('tag');
    history.replaceState(history.state, '', url);
  }

  function choose(tag){
    if (!known.has(tag)) tag = '';
    if (tag === current) return;
    apply(tag, !reduce.matches);
    setURL(tag);
  }

  tabsEl.addEventListener('click', e => {
    const t = e.target.closest('.ix-tab');
    if (t) choose(t.dataset.tag);
  });

  // A chip on a row filters in place instead of following its ?tag= link.
  list.addEventListener('click', e => {
    const chip = e.target.closest('a.tagchip[data-tag]');
    if (!chip || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!known.has(chip.dataset.tag)) return;
    e.preventDefault();
    choose(chip.dataset.tag);
    if (tabsEl.getBoundingClientRect().top < 0){
      tabsEl.scrollIntoView({block: 'start', behavior: reduce.matches ? 'auto' : 'smooth'});
    }
  });

  tabsEl.hidden = false;
  const initial = new URLSearchParams(location.search).get('tag') || '';
  if (known.has(initial) && initial) apply(initial, false);
  else if (initial) setURL('');
  // On narrow screens the row scrolls: keep the pressed tab in view and fade whichever edge has more.
  const pressed = tabs.find(t => t.dataset.tag === current);
  if (pressed && tabsEl.scrollWidth > tabsEl.clientWidth) tabsEl.scrollLeft = pressed.getBoundingClientRect().left - tabsEl.getBoundingClientRect().left - 16;
  function edges(){
    const max = tabsEl.scrollWidth - tabsEl.clientWidth;
    tabsEl.classList.toggle('more-l', tabsEl.scrollLeft > 1);
    tabsEl.classList.toggle('more-r', tabsEl.scrollLeft < max - 1);
  }
  edges();
  tabsEl.addEventListener('scroll', edges, {passive: true});
  addEventListener('resize', edges, {passive: true});
})();
