(() => {
  'use strict';

  const links = Array.from(document.querySelectorAll('[data-album-photo]'));
  const viewer = document.querySelector('#photo-viewer');
  if (!links.length || !viewer || typeof viewer.showModal !== 'function') return;

  const image = viewer.querySelector('#viewer-image');
  const count = viewer.querySelector('.viewer-count');
  const caption = viewer.querySelector('.viewer-caption');
  const status = viewer.querySelector('.viewer-status');
  let current = 0;
  let opener = null;

  const showPhoto = (index) => {
    current = (index + links.length) % links.length;
    const link = links[current];
    const preview = link.querySelector('img');
    image.hidden = true;
    status.hidden = false;
    status.textContent = 'Loading photograph…';
    viewer.setAttribute('aria-busy', 'true');
    image.alt = preview.alt;
    image.width = Number(preview.getAttribute('width'));
    image.height = Number(preview.getAttribute('height'));
    count.textContent = `${current + 1} / ${links.length}`;
    caption.textContent = preview.alt;
    image.src = link.href;
  };

  image.addEventListener('load', () => {
    image.hidden = false;
    status.hidden = true;
    viewer.removeAttribute('aria-busy');
  });
  image.addEventListener('error', () => {
    status.hidden = false;
    status.textContent = 'This photograph could not be loaded. Please try again.';
    viewer.removeAttribute('aria-busy');
  });

  links.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showPhoto(index);
      viewer.showModal();
      document.body.classList.add('photo-viewer-open');
    });
  });

  viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-viewer-previous]').addEventListener('click', () => showPhoto(current - 1));
  viewer.querySelector('[data-viewer-next]').addEventListener('click', () => showPhoto(current + 1));
  viewer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showPhoto(current + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('photo-viewer-open');
    opener?.focus({ preventScroll: true });
  });
})();
