(() => {
  'use strict';

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
  preciseHover.addEventListener('change', resetAll);
  reducedMotion.addEventListener('change', resetAll);
  window.addEventListener('blur', resetAll);
  window.addEventListener('pagehide', resetAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetAll();
  });
})();
