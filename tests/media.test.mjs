import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real script with offline DOM/media adapters; no network or media decoder.
function harness(reduced = false) {
  function element(dataset = {}) {
    const listeners = {}, classes = new Set();
    return { dataset, style: {}, hidden: false, paused: true,
      addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
      fire(t, event = {}) { for (const fn of listeners[t] || []) fn({ target: this, ...event }); },
      setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; },
      classList: { remove: n => classes.delete(n), contains: n => classes.has(n), toggle(n) { if (classes.has(n)) { classes.delete(n); return false; } classes.add(n); return true; } },
      scrollTo() {}, closest() { return null; }, focus() { this.focused = true; },
      showModal() { this.open = true; }, close() { this.open = false; this.fire('close'); },
      play() { this.paused = false; this.fire('play'); return Promise.resolve(); },
      pause() { this.paused = true; this.fire('pause'); }, load() {},
    };
  }
  const ids = Object.fromEntries(['viewer', 'viewer-image', 'zoom', 'viewer-title', 'original', 'previous', 'next', 'close', 'hero-video', 'motion-toggle', 'film-viewer', 'film-player', 'film-title', 'film-count', 'film-previous', 'film-next', 'film-close'].map(id => [id, element()]));
  const drawings = [element({ src: 'a.png', title: 'A' }), element({ src: 'b.png', title: 'B' })];
  const films = [element({ video: 'a.mp4', title: 'A' }), element({ video: 'b.mp4', title: 'B' })];
  const canvas = element(), body = element();
  ids['hero-video'].paused = false;
  const document = { body, getElementById: id => ids[id], querySelector: () => canvas, querySelectorAll: s => s === '.film-card' ? films : drawings };
  vm.runInNewContext(fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), { document, matchMedia: () => ({ matches: reduced }), IntersectionObserver: class { observe() {} } });
  return { ids, drawings, films, canvas, body };
}
test('drawing navigation wraps, resets zoom and restores focus and scrolling', () => {
  const { ids, drawings, canvas, body } = harness();
  drawings[0].fire('click');
  assert.equal(ids.viewer.open, true); assert.equal(body.style.overflow, 'hidden');
  ids.zoom.fire('click'); assert.equal(canvas.classList.contains('zoomed'), true);
  ids.previous.fire('click'); assert.equal(ids['viewer-image'].src, 'b.png');
  assert.equal(canvas.classList.contains('zoomed'), false);
  ids.next.fire('click'); assert.equal(ids['viewer-image'].src, 'a.png');
  ids.close.fire('click'); assert.equal(body.style.overflow, ''); assert.equal(drawings[0].focused, true);
});
test('film viewer pauses background and cleans up playback on close', () => {
  const { ids, films, body } = harness();
  films[0].fire('click'); assert.equal(ids['hero-video'].paused, true);
  assert.equal(ids['film-player'].src, 'a.mp4');
  ids['film-previous'].fire('click'); assert.equal(ids['film-player'].src, 'b.mp4');
  ids['film-close'].fire('click'); assert.equal(ids['film-player'].paused, true);
  assert.equal(ids['film-player'].src, undefined); assert.equal(body.style.overflow, ''); assert.equal(films[0].focused, true);
});
test('reduced motion stops background autoplay', () => {
  const { ids } = harness(true);
  assert.equal(ids['hero-video'].paused, true); assert.equal(ids['motion-toggle'].hidden, true);
});
