/* Theme switch, shared by every page. The pill is a radiogroup; the pour variant is one
   toggle button. Either way the state lives in <html data-theme> and localStorage. */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement, KEY = 'dm-theme';
  const NAME = {'strawberry-matcha': 'strawberry matcha', 'cranberry-cold-brew': 'cranberry cold brew'};
  const other = t => t === 'strawberry-matcha' ? 'cranberry-cold-brew' : 'strawberry-matcha';
  const radios = [...document.querySelectorAll('#themeSwitch [role="radio"]')];
  const pour = document.getElementById('themePour');
  // replays the pour on a glass; the class comes off so the next swap can restart it
  function pourInto(svg){
    if (!svg || reduce) return;
    svg.classList.remove('pour'); void svg.getBoundingClientRect(); svg.classList.add('pour');
    setTimeout(() => svg.classList.remove('pour'), 460);
  }
  function syncControls(t){
    radios.forEach(b => { const on = b.dataset.setTheme === t; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    if (pour){
      pour.setAttribute('aria-label', `Theme: ${NAME[t]}. Switch to ${NAME[other(t)]}`);
      pour.querySelector('.lbl').textContent = NAME[t];
    }
  }
  const sync = () => syncControls(root.dataset.theme);
  // Repainting the page in the new palette (painted SVG-filter grounds, the crossfade
  // snapshot) is heavy, especially in Firefox. Running it while the switcher animates
  // starves the animation of frames, so the switcher moves first and the page follows.
  const SETTLE = 380;
  const GECKO = /\bGecko\/\d/.test(navigator.userAgent) && !/like Gecko/.test(navigator.userAgent);
  let pending = 0, target = null;
  function set(t, user){
    if (t === (target || root.dataset.theme)) return;
    target = t;
    clearTimeout(pending);
    syncControls(t);
    const seg = radios.find(b => b.dataset.setTheme === t);
    pourInto(seg && seg.querySelector('.drink'));
    pourInto(pour && pour.querySelector('.drink'));
    if (user) { try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked: the choice lasts for this visit */ } }
    const apply = () => { target = null; root.dataset.theme = t; sync(); document.dispatchEvent(new CustomEvent('themechange')); };
    if (reduce) { apply(); return; }
    pending = setTimeout(() => {
      // Gecko freezes the page (switcher included) while it snapshots or cross-fades the
      // filter-heavy grounds, so there the palette swaps in one step once the switcher settles.
      if (GECKO) apply();
      else if (document.startViewTransition) document.startViewTransition(apply);
      else { root.classList.add('theme-fade'); apply(); setTimeout(() => root.classList.remove('theme-fade'), 320); }
    }, SETTLE);
  }
  radios.forEach((b, i) => {
    b.addEventListener('click', () => set(b.dataset.setTheme, true));
    b.addEventListener('keydown', e => {
      const d = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[e.key];
      if (!d) return;
      e.preventDefault();
      const n = radios[(i + d + radios.length) % radios.length];
      n.focus(); set(n.dataset.setTheme, true);
    });
  });
  if (pour) pour.addEventListener('click', () => set(other(root.dataset.theme), true));
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  // with no saved choice the page keeps following the OS setting
  if (!saved) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => set(e.matches ? 'cranberry-cold-brew' : 'strawberry-matcha', false));
  sync();
})();
