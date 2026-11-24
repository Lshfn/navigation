/* Da Dragon Wiv Da Long Tongue, magexxx67 — https://www.rw-designer.com/cursor-detail/5918 */
(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const style = document.createElement('style');
  style.textContent = `html.dragon-interaction-cursor,html.dragon-interaction-cursor body,html.dragon-interaction-cursor body * {cursor:none !important;}
    #dragon-interaction-cursor {position:fixed;width:48px;height:48px;left:0;top:0;pointer-events:none;z-index:2147483647;display:none;}
    #dragon-interaction-cursor[hidden] {display:none !important;}`;
  document.head.append(style);
  const image = document.createElement('img');
  image.id = 'dragon-interaction-cursor';
  image.alt = '';
  image.setAttribute('aria-hidden','true');
  image.draggable = false;
  image.src = new URL('./media/portfolio/dragon-cursor.webp',document.currentScript.src).href;
  document.body.append(image);
  let active = false;
  let ready = false;
  const show = value => {
    active = value;
    const visible = active && ready;
    document.documentElement.classList.toggle('dragon-interaction-cursor',visible);
    image.style.display = visible ? 'block' : 'none';
  };
  image.addEventListener('load',() => { ready = true; show(active); });
  image.addEventListener('error',() => { ready = false; show(false); });
  const track = event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    image.style.left = event.clientX + 'px';
    image.style.top = event.clientY + 'px';
    show(true);
  };
  document.addEventListener('pointermove',track,{passive:true});
  document.addEventListener('pointerover',track,{passive:true});
  document.addEventListener('pointerdown',track,{passive:true});
  document.addEventListener('pointerup',track,{passive:true});
  const reset = () => show(false);
  document.addEventListener('pointercancel',reset,{passive:true});
  document.documentElement.addEventListener('pointerleave',reset,{passive:true});
  window.addEventListener('blur',reset);
})();
