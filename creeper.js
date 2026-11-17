(() => {
  'use strict';

  const button = document.querySelector('[data-creeper-button]');
  if (!button) return;

  const icon = button.querySelector('.creeper-icon');
  const percent = button.querySelector('.creeper-percent');
  const status = button.parentElement.querySelector('[data-creeper-status]');
  const storageKey = 'ian.creeper.charge.v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 1800;
  let charge = 0;
  let pulse;
  let overlay;
  let timeout;

  const restore = () => {
    try {
      const saved = Number(sessionStorage.getItem(storageKey));
      if (Number.isInteger(saved) && saved >= 0 && saved < 100 && saved % 10 === 0) charge = saved;
    } catch { /* The game also works without storage. */ }
  };

  const save = (value) => {
    try { sessionStorage.setItem(storageKey, String(value)); } catch { /* Keep the current page playable. */ }
  };

  const render = () => {
    button.style.setProperty('--creeper-charge', `${charge}%`);
    percent.textContent = `${charge}%`;
  };

  const finish = (announce = true) => {
    if (!overlay) return;
    window.clearTimeout(timeout);
    overlay.remove();
    overlay = null;
    document.body.classList.remove('creeper-shaking');
    button.removeAttribute('aria-disabled');
    charge = 0;
    render();
    if (announce) status.textContent = 'Boom. The world respawned. Creeper charge 0 percent.';
  };

  const explode = () => {
    const quiet = reducedMotion.matches;
    overlay = document.createElement('div');
    overlay.className = quiet ? 'creeper-overlay creeper-quiet' : 'creeper-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.setProperty('--creeper-duration', `${duration}ms`);

    const sprite = document.createElement('div');
    sprite.className = 'creeper-sprite';
    const head = icon.cloneNode();
    head.className = 'creeper-head';
    sprite.append(head);
    sprite.insertAdjacentHTML('beforeend', '<span class="creeper-torso"></span><span class="creeper-feet"></span>');
    overlay.append(sprite);

    if (!quiet) {
      const colors = ['#86bd62', '#4d8d36', '#f4effb', '#c3a9eb', '#fff'];
      for (let index = 0; index < 24; index += 1) {
        const angle = index * 2.399963;
        const radius = 22 + (index % 9) * 6;
        const pixel = document.createElement('span');
        pixel.className = 'creeper-pixel';
        pixel.style.setProperty('--pixel-x', `${Math.cos(angle) * radius}vmin`);
        pixel.style.setProperty('--pixel-y', `${Math.sin(angle) * radius * .65}vmax`);
        pixel.style.setProperty('--pixel-size', `${10 + (index % 5) * 6}px`);
        pixel.style.setProperty('--pixel-color', colors[index % colors.length]);
        overlay.append(pixel);
      }
      document.body.classList.add('creeper-shaking');
    }

    const message = document.createElement('p');
    message.className = 'creeper-boom';
    message.textContent = 'The world respawned.';
    overlay.append(message);

    button.setAttribute('aria-disabled', 'true');
    status.textContent = 'Creeper charge 100 percent. Boom!';
    document.body.append(overlay);
    timeout = window.setTimeout(finish, quiet ? 1250 : duration);
  };

  restore();
  render();
  button.disabled = false;
  button.addEventListener('click', () => {
    if (overlay) return;
    charge += 10;
    render();
    save(charge === 100 ? 0 : charge);
    if (charge === 100) {
      explode();
      return;
    }
    status.textContent = `Creeper charge ${charge} percent.`;
    if (!reducedMotion.matches && typeof icon.animate === 'function') {
      pulse?.cancel();
      pulse = icon.animate([
        { transform: 'scale(.92)', filter: 'brightness(1)' },
        { transform: 'scale(1.23)', filter: 'brightness(1.42)' },
        { transform: 'scale(1)', filter: 'brightness(1)' },
      ], { duration: 230, easing: 'ease-out' });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay) finish();
  });
  window.addEventListener('pagehide', () => finish(false));
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    restore();
    render();
  });
})();
