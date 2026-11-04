(() => {
  'use strict';
  const config = window.WEBSITE_COMMUNITY || {};
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const apiBase = local ? config.localApiBase : config.apiBase;
  const buttons = Array.from(document.querySelectorAll('[data-album-like]'));
  const queueKey = 'ian.community.pending-hearts.v1';
  const idKey = 'ian.community.visitor.v1';
  const albumPattern = /^[a-z][a-z0-9-]{0,45}-20\d{2}-\d{2}-\d{2}$/;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const draft = location.pathname.includes('/_templates/');
  const counts = new Map();
  const queues = new Map();
  const running = new Set();
  const timers = new Map();
  let visitEventId;
  let visitorId;
  let month;
  let refreshing = false;
  let retryTimer = 0;
  const uuid = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  const validCount = value => Number.isSafeInteger(value) && value >= 0;
  const fullNumber = new Intl.NumberFormat('en-GB');
  const shortNumber = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
  const format = value => value < 10000 ? fullNumber.format(value) : shortNumber.format(value);
  const status = text => document.querySelectorAll('[data-community-status]').forEach(node => { node.textContent = text; });
  const saveQueue = () => {
    try { sessionStorage.setItem(queueKey, JSON.stringify(Object.fromEntries(queues))); } catch { /* Hearts still work without storage. */ }
  };
  const render = albumId => {
    const value = counts.get(albumId);
    buttons.filter(button => button.dataset.albumLike === albumId).forEach(button => {
      button.querySelector('[data-like-count]').textContent = validCount(value) ? format(value) : '—';
      const title = button.dataset.albumTitle.replace(/[.!?]+$/, '');
      button.setAttribute('aria-label', `Give a heart to ${title}.${validCount(value) ? ` ${fullNumber.format(value)} ${value === 1 ? 'heart' : 'hearts'}.` : ''}`);
      button.setAttribute('aria-busy', String(!!queues.get(albumId)?.length));
      button.title = 'A little heart. As many times as you like.';
    });
  };
  const applySnapshot = data => {
    if (!data || !data.visitors || !data.likes) throw new Error('Invalid counter response');
    const visitors = data.visitors;
    if (!['total', 'monthly', 'views'].every(key => validCount(visitors[key]))) throw new Error('Invalid visitor totals');
    month = visitors.month;
    document.querySelectorAll('[data-visitor-count]').forEach(node => {
      const value = visitors[node.dataset.visitorCount];
      node.textContent = format(value);
      node.title = fullNumber.format(value);
    });
    const ids = new Set(buttons.map(button => button.dataset.albumLike));
    ids.forEach(id => {
      if (!running.has(id)) {
        const value = data.likes[id] ?? 0;
        if (validCount(value)) counts.set(id, Math.max(counts.get(id) || 0, value));
        render(id);
      }
    });
    status('Visitor totals are up to date.');
  };
  const request = async (path, body, keepalive = false) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store', keepalive,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Counters unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  };
  const flush = async albumId => {
    if (running.has(albumId) || !queues.get(albumId)?.length) return;
    running.add(albumId);
    try {
      while (queues.get(albumId)?.length) {
        const eventIds = queues.get(albumId).slice(0, 20);
        const result = await request('/likes', { albumId, eventIds });
        if (result.albumId !== albumId || !validCount(result.count) || !Array.isArray(result.eventIds) ||
            !eventIds.every(id => result.eventIds.includes(id))) throw new Error('Invalid heart response');
        const acknowledged = new Set(eventIds);
        queues.set(albumId, queues.get(albumId).filter(id => !acknowledged.has(id)));
        saveQueue();
        counts.set(albumId, Math.max(counts.get(albumId) || 0, result.count));
        buttons.filter(button => button.dataset.albumLike === albumId).forEach(button => button.classList.add('has-hearts'));
        render(albumId);
        status(`${fullNumber.format(result.count)} ${result.count === 1 ? 'heart' : 'hearts'}. Much appreciated.`);
      }
    } catch {
      buttons.filter(button => button.dataset.albumLike === albumId).forEach(button => { button.title = 'That heart is waiting for a connection. Tap to try again.'; });
      status('A heart is waiting for a connection. It will retry when you return.');
    } finally {
      running.delete(albumId);
      buttons.filter(button => button.dataset.albumLike === albumId).forEach(button => button.setAttribute('aria-busy', 'false'));
    }
  };
  const refresh = async (register = false) => {
    if (refreshing) return;
    refreshing = true;
    try {
      register = register && !draft;
      let data = await request(register ? '/visits' : '/stats', register ? { visitorId, eventId: visitEventId } : undefined);
      if (!draft && !register && data.visitors?.month !== month) data = await request('/visits', { visitorId, eventId: visitEventId });
      applySnapshot(data);
    } catch {
      status('The counters are taking a short breather. Please try again shortly.');
      if (register && !retryTimer) retryTimer = setTimeout(() => { retryTimer = 0; refresh(true); }, 30000);
    } finally { refreshing = false; }
  };
  if (!apiBase || !['http:', 'https:'].includes(location.protocol)) {
    buttons.forEach(button => { button.disabled = true; button.title = 'Hearts and visitor totals are available on the live site.'; });
    status('Hearts and visitor totals are available on the live site.');
    return;
  }
  try {
    visitorId = localStorage.getItem(idKey);
    if (!uuidPattern.test(visitorId || '')) { visitorId = uuid(); localStorage.setItem(idKey, visitorId); }
  } catch {
    try { visitorId = sessionStorage.getItem(idKey); if (!uuidPattern.test(visitorId || '')) visitorId = uuid(); sessionStorage.setItem(idKey, visitorId); }
    catch { visitorId = uuid(); }
  }
  visitEventId = uuid();
  try {
    const saved = JSON.parse(sessionStorage.getItem(queueKey) || '{}');
    Object.entries(saved).forEach(([id, events]) => {
      if (albumPattern.test(id) && Array.isArray(events)) queues.set(id, events.filter(event => typeof event === 'string' && uuidPattern.test(event)).slice(0, 200));
    });
  } catch { /* A missing or blocked session store is harmless. */ }
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.albumLike;
      const pending = queues.get(id) || [];
      if (pending.length >= 200) { status('A few hearts are still on their way. Give them a moment.'); return; }
      pending.push(uuid()); queues.set(id, pending); saveQueue();
      button.classList.remove('heart-pop'); void button.offsetWidth; button.classList.add('heart-pop');
      render(id);
      if (!timers.has(id)) timers.set(id, setTimeout(() => { timers.delete(id); flush(id); }, 70));
    });
    button.addEventListener('animationend', () => button.classList.remove('heart-pop'));
  });
  queues.forEach((_, id) => flush(id));
  refresh(true);
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  window.addEventListener('online', () => { refresh(true); queues.forEach((_, id) => flush(id)); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); queues.forEach((_, id) => flush(id)); } });
  window.addEventListener('pageshow', event => { if (event.persisted) { visitEventId = uuid(); refresh(true); } });
  window.addEventListener('pagehide', () => {
    saveQueue();
    queues.forEach((events, albumId) => { if (events.length) request('/likes', { albumId, eventIds: events.slice(0, 20) }, true).catch(() => {}); });
  });
})();
