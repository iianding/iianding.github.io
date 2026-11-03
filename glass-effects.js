(() => {
  'use strict';

  if (typeof window.matchMedia !== 'function') return;

  const preciseHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => preciseHover.matches && !reducedMotion.matches;
  const surfaces = document.querySelectorAll('header, .button, .glass-surface');
  const resetters = [];

  surfaces.forEach((surface) => {
    const glint = document.createElement('span');
    glint.className = 'glass-glint';
    glint.setAttribute('aria-hidden', 'true');
    surface.prepend(glint);
    surface.classList.add('glass-reactive');

    let frame = 0;
    let clientX = 0;
    let clientY = 0;

    const reset = () => {
      surface.removeAttribute('data-glass-active');
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const paint = () => {
      frame = 0;
      if (!enabled() || !surface.hasAttribute('data-glass-active')) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--glint-x', `${clientX - bounds.left}px`);
      surface.style.setProperty('--glint-y', `${clientY - bounds.top}px`);
    };

    const track = (event) => {
      if (!enabled() || event.pointerType === 'touch') return;
      clientX = event.clientX;
      clientY = event.clientY;
      surface.setAttribute('data-glass-active', '');
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    surface.addEventListener('pointerenter', track, { passive: true });
    surface.addEventListener('pointermove', track, { passive: true });
    surface.addEventListener('pointerleave', reset, { passive: true });
    surface.addEventListener('pointercancel', reset, { passive: true });
    resetters.push(reset);
  });

  const resetAll = () => resetters.forEach((reset) => reset());
  const watchMedia = (query) => {
    if (typeof query.addEventListener === 'function') query.addEventListener('change', resetAll);
    else if (typeof query.addListener === 'function') query.addListener(resetAll);
  };
  watchMedia(preciseHover);
  watchMedia(reducedMotion);
  window.addEventListener('blur', resetAll);
  window.addEventListener('pagehide', resetAll);
  window.addEventListener('resize', resetAll, { passive: true });
  window.addEventListener('scroll', resetAll, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetAll();
  });
})();
