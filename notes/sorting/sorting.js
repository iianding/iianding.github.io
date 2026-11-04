(() => {
  'use strict';
  const engine = window.SortLab;
  if (!engine) return;
  const initial = engine.randomValues();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
  let active = null;

  class Demo {
    constructor(lab) {
      this.lab = lab; this.name = lab.dataset.sortLab;
      this.chart = lab.querySelector('[data-chart]'); this.plot = lab.querySelector('[data-bars]');
      this.axis = lab.querySelector('.zero-line'); this.input = lab.querySelector('[data-input]');
      this.editor = lab.querySelector('[data-editor]'); this.error = lab.querySelector('[data-error]');
      this.startButton = lab.querySelector('[data-action="start"]'); this.startLabel = lab.querySelector('[data-start-label]');
      this.startIcon = lab.querySelector('[data-start-icon]'); this.customButton = lab.querySelector('[data-action="custom"]');
      this.state = lab.querySelector('[data-state]'); this.message = lab.querySelector('[data-message]');
      this.announcement = lab.querySelector('[data-announcement]'); this.pace = lab.querySelector('[data-speed]');
      this.running = false; this.timer = 0; this.iterator = null; this.completed = false;
      lab.querySelectorAll('button[disabled]').forEach(button => { button.disabled = false; });
      this.setNumbers(initial, 'Fifteen numbers. Not yet a queue.');
      this.startButton.addEventListener('click', () => this.running ? this.pause('Paused. The numbers are not going anywhere.') : this.start());
      this.customButton.addEventListener('click', () => this.openEditor());
      lab.querySelector('[data-action="shuffle"]').addEventListener('click', () => this.setNumbers(engine.randomValues(), 'A fresh list. Same small sorting problem.'));
      lab.querySelector('[data-action="reset"]').addEventListener('click', () => this.setNumbers(this.original, 'Back to the starting order. No hard feelings.'));
      lab.querySelector('[data-action="cancel"]').addEventListener('click', () => this.closeEditor());
      this.editor.addEventListener('submit', event => { event.preventDefault(); this.applyInput(); });
      this.input.addEventListener('input', () => {
        if (this.input.getAttribute('aria-invalid') === 'true') {
          const result = engine.parseNumbers(this.input.value);
          if (!result.error) this.clearError();
        }
      });
      this.pace.addEventListener('change', () => {
        this.setPace();
        if (this.running) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), this.delay()); }
      });
      this.setPace();
    }
    delay() { return Math.max(reducedMotion.matches ? 150 : 0, Number(this.pace.value)); }
    setPace() { this.lab.style.setProperty('--step-duration', `${Math.min(180, this.delay() * 0.8)}ms`); }
    clearError() { this.input.removeAttribute('aria-invalid'); this.editor.classList.remove('has-error'); this.error.textContent = ''; }
    announce(text) { this.announcement.textContent = text; }
    closeEditor() {
      this.editor.hidden = true; this.customButton.setAttribute('aria-expanded', 'false');
      this.startButton.disabled = false; this.clearError();
    }
    openEditor() {
      if (!this.editor.hidden) { this.closeEditor(); return; }
      if (this.running) this.pause('Paused while you edit the guest list.');
      this.input.value = this.original.join(', '); this.clearError();
      this.editor.hidden = false; this.customButton.setAttribute('aria-expanded', 'true'); this.startButton.disabled = true;
      this.input.focus();
    }
    applyInput() {
      const result = engine.parseNumbers(this.input.value);
      if (result.error) {
        this.input.setAttribute('aria-invalid', 'true'); this.editor.classList.add('has-error');
        this.error.textContent = result.error; this.input.focus(); return;
      }
      this.setNumbers(result.values, 'Your list is ready. Press Start to introduce a little order.');
      this.startButton.focus();
    }
    setNumbers(values, message) {
      if (this.running) this.pause('Resetting the list.');
      clearTimeout(this.timer); this.timer = 0;
      this.original = values.slice(); this.iterator = null; this.completed = false; this.steps = 0;
      this.lab.dataset.many = String(values.length > 15);
      this.min = Math.min(0, ...values); this.max = Math.max(0, ...values); this.span = this.max - this.min || 1;
      this.zero = -this.min / this.span * 100;
      this.plot.style.setProperty('--zero', `${this.zero}%`);
      this.plot.style.gridTemplateColumns = `repeat(${values.length}, minmax(0, 1fr))`;
      const slots = [...this.plot.querySelectorAll('.sort-bar-slot')];
      if (slots.length !== values.length) {
        const fragment = document.createDocumentFragment();
        values.forEach(() => {
          const slot = document.createElement('span'); slot.className = 'sort-bar-slot';
          const bar = document.createElement('span'); bar.className = 'sort-bar';
          const label = document.createElement('span'); label.className = 'sort-bar-label';
          slot.append(bar, label); fragment.append(slot);
        });
        this.plot.replaceChildren(fragment, this.axis);
      }
      this.slots = [...this.plot.querySelectorAll('.sort-bar-slot')];
      this.startLabel.textContent = 'Start'; this.startIcon.textContent = '▷'; this.state.textContent = 'Ready';
      this.lab.dataset.running = 'false'; this.closeEditor(); this.input.value = values.join(', ');
      this.render({ values, kind: 'ready', focus: [], comparisons: 0, writes: 0, message });
      this.announce(message);
    }
    render(frame) {
      this.current = frame.values.slice();
      const focused = new Set(frame.focus);
      this.slots.forEach((slot, index) => {
        const value = frame.values[index], height = Math.abs(value) / this.span * 100;
        const bar = slot.querySelector('.sort-bar');
        bar.style.setProperty('--bar-height', `${height.toFixed(3)}%`);
        bar.style.setProperty('--bar-bottom', `${(value < 0 ? this.zero - height : this.zero).toFixed(3)}%`);
        slot.classList.toggle('is-focused', focused.has(index));
        slot.classList.toggle('is-moving', focused.has(index) && frame.kind === 'move');
        slot.classList.toggle('is-sorted', frame.kind === 'done');
        slot.title = String(value);
        const label = slot.querySelector('.sort-bar-label');
        label.textContent = String(value).length <= 4 ? String(value) : compact.format(value);
      });
      this.lab.querySelector('[data-values]').textContent = frame.values.join(', ');
      this.lab.querySelector('[data-comparisons]').textContent = String(frame.comparisons);
      this.lab.querySelector('[data-writes]').textContent = String(frame.writes);
      this.lab.dataset.step = String(this.steps);
      this.message.textContent = frame.message;
      this.chart.setAttribute('aria-label', `${frame.kind === 'done' ? 'Sorted' : 'Current'} order: ${frame.values.join(', ')}`);
    }
    start() {
      if (active && active !== this) active.pause('Another demo has the floor. This one will wait.');
      if (this.completed) this.setNumbers(this.original, 'One more look at the same list.');
      this.closeEditor();
      if (!this.iterator) this.iterator = engine.createStepper(this.name, this.original);
      active = this; this.running = true; this.lab.dataset.running = 'true';
      this.startLabel.textContent = 'Pause'; this.startIcon.textContent = 'Ⅱ'; this.state.textContent = 'Sorting';
      this.announce('Sorting started. Pause whenever you like.'); this.tick();
    }
    pause(message) {
      clearTimeout(this.timer); this.timer = 0; this.running = false;
      if (active === this) active = null;
      this.lab.dataset.running = 'false'; this.startLabel.textContent = this.iterator && !this.completed ? 'Resume' : 'Start';
      this.startIcon.textContent = '▷'; this.state.textContent = 'Paused'; this.message.textContent = message; this.announce(message);
    }
    tick() {
      if (!this.running) return;
      try {
        const next = this.iterator.next();
        if (next.done) return;
        this.steps++; this.render(next.value);
        if (next.value.kind === 'done') {
          this.running = false; this.completed = true; this.timer = 0;
          if (active === this) active = null;
          this.lab.dataset.running = 'false'; this.startLabel.textContent = 'Replay'; this.startIcon.textContent = '↻'; this.state.textContent = 'Sorted';
          this.announce('Sorted. The list is now in ascending order.'); return;
        }
        this.timer = setTimeout(() => this.tick(), this.delay());
      } catch {
        this.pause('This demo needs a reset. Please try again.'); this.iterator = null;
      }
    }
  }

  const demos = [...document.querySelectorAll('[data-sort-lab]')].map(lab => new Demo(lab));
  if (typeof IntersectionObserver === 'function') {
    const visible = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && active?.lab === entry.target) active.pause('Paused off screen. Pick up where you left off.');
      });
    }, { threshold: 0 });
    demos.forEach(demo => visible.observe(demo.lab));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) active.pause('Paused while this tab takes a breather.'); });
  window.addEventListener('pagehide', () => { if (active) active.pause('Paused.'); });

  const languages = { c: 'C', cpp: 'C++', python: 'Python', java: 'Java' };
  document.querySelectorAll('[data-algorithm]').forEach(section => {
    const name = section.dataset.algorithm;
    const tabs = [...section.querySelectorAll('[data-language]')];
    const panel = section.querySelector('[role="tabpanel"]');
    function select(tab, focus = false) {
      const language = tab.dataset.language, example = window.SortExamples?.[name]?.[language];
      if (typeof example !== 'string') return;
      tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
      const fragment = document.createDocumentFragment();
      example.split('\n').forEach(line => { const span = document.createElement('span'); span.className = 'code-line'; span.textContent = line || ' '; fragment.append(span); });
      panel.querySelector('code').replaceChildren(fragment);
      panel.setAttribute('aria-labelledby', tab.id);
      section.querySelector('[data-code-label]').textContent = languages[language];
      if (focus) tab.focus();
    }
    tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));
    section.querySelector('[role="tablist"]').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let index = tabs.indexOf(document.activeElement);
      if (index < 0) index = 0;
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[index], true);
    });
  });
})();
