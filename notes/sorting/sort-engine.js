(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SortLab = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const MAX_ITEMS = 20;
  const MAX_ABS = 1000000;
  const algorithms = ['bubble', 'selection', 'insertion', 'shell', 'merge', 'quick', 'heap', 'radix'];

  function parseNumbers(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return { error: 'The list is feeling empty. Add at least one number.' };
    if (raw.length > 300) return { error: 'A smaller guest list, please: up to 20 short numbers.' };
    const parts = raw.split(',');
    if (parts.length > MAX_ITEMS) return { error: 'Twenty numbers is the limit. The others will need another turn.' };
    if (parts.some(part => !part.trim())) return { error: 'Every comma needs a number on both sides.' };
    const values = [];
    for (const part of parts) {
      const token = part.trim();
      if (token.length > 12 || /^[-+]?\d{7,}/.test(token)) return { error: 'That number is a bit ambitious. Keep its size below 1,000,000.' };
      if (!/^[+-]?(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(token)) return { error: 'Use ordinary numbers and commas, with up to 3 decimal places.' };
      const value = Number(token);
      if (!Number.isFinite(value) || Math.abs(value) >= MAX_ABS) return { error: 'Keep every number between −1,000,000 and 1,000,000, excluding the ends.' };
      values.push(Object.is(value, -0) ? 0 : value);
    }
    return { values };
  }
  function randomValues(random = Math.random) {
    return Array.from({ length: 15 }, () => 1 + Math.floor(random() * 99));
  }
  function createStepper(name, input) {
    if (!algorithms.includes(name)) throw new Error('Unknown sorting algorithm.');
    if (!Array.isArray(input) || input.length > MAX_ITEMS || input.some(v => !Number.isFinite(v) || Math.abs(v) >= MAX_ABS || Math.abs(v * 1000 - Math.round(v * 1000)) > 0.00001)) throw new Error('Invalid sorting input.');
    return run();

    function* run() {
      const a = input.slice();
      let comparisons = 0, writes = 0;
      const frame = (kind, focus, message) => ({ values: a.slice(), kind, focus, message, comparisons, writes });
      function* compare(i, j, message) { comparisons++; yield frame('compare', [i, j], message); }
      function* swap(i, j) {
        if (i === j) return;
        [a[i], a[j]] = [a[j], a[i]]; writes += 2;
        yield frame('move', [i, j], `Swap positions ${i + 1} and ${j + 1}. A small change of scenery.`);
      }
      function* insertion(gap) {
        for (let i = gap; i < a.length; i++) {
          const held = a[i]; let j = i;
          while (j >= gap) {
            comparisons++;
            yield frame('compare', [j - gap, j], `Gap ${gap}: compare ${a[j - gap]} with the held ${held}.`);
            if (a[j - gap] <= held) break;
            a[j] = a[j - gap]; writes++;
            yield frame('move', [j - gap, j], `Make a little room for ${held}.`); j -= gap;
          }
          if (j !== i) { a[j] = held; writes++; yield frame('move', [j], `${held} has found its seat.`); }
        }
      }
      function* quick(lo, hi) {
        if (lo >= hi) return;
        const pivot = a[hi]; let next = lo;
        yield frame('pass', [hi], `Pivot: ${pivot}. Everyone else, pick a side.`);
        for (let j = lo; j < hi; j++) {
          yield* compare(j, hi, `Compare ${a[j]} with pivot ${pivot}.`);
          if (a[j] <= pivot) { yield* swap(next, j); next++; }
        }
        yield* swap(next, hi);
        yield* quick(lo, next - 1); yield* quick(next + 1, hi);
      }
      function* sift(size, root) {
        while (true) {
          let largest = root, left = 2 * root + 1, right = left + 1;
          if (left < size) { yield* compare(left, largest, 'Check the left child. The largest value gets the top bunk.'); if (a[left] > a[largest]) largest = left; }
          if (right < size) { yield* compare(right, largest, 'Check the right child before making any promises.'); if (a[right] > a[largest]) largest = right; }
          if (largest === root) return;
          yield* swap(root, largest); root = largest;
        }
      }
      if (a.length > 1) {
        switch (name) {
          case 'bubble':
            for (let end = a.length - 1; end > 0; end--) {
              let changed = false;
              for (let i = 0; i < end; i++) {
                yield* compare(i, i + 1, 'Ask two neighbours whether they are in the right order.');
                if (a[i] > a[i + 1]) { yield* swap(i, i + 1); changed = true; }
              }
              if (!changed) break;
            }
            break;
          case 'selection':
            for (let i = 0; i < a.length - 1; i++) {
              let smallest = i;
              for (let j = i + 1; j < a.length; j++) { yield* compare(j, smallest, 'Find the smallest value still waiting for a place.'); if (a[j] < a[smallest]) smallest = j; }
              yield* swap(i, smallest);
            }
            break;
          case 'insertion': yield* insertion(1); break;
          case 'shell':
            for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
              yield frame('pass', [], `Gap ${gap}: start with distant neighbours, then move closer.`);
              yield* insertion(gap);
            }
            break;
          case 'merge': {
            const buffer = new Array(a.length);
            for (let width = 1; width < a.length; width *= 2) {
              for (let lo = 0; lo < a.length; lo += 2 * width) {
                const mid = Math.min(lo + width, a.length), hi = Math.min(lo + 2 * width, a.length);
                let i = lo, j = mid;
                for (let k = lo; k < hi; k++) {
                  if (i < mid && j < hi) yield* compare(i, j, `Merge two sorted groups, each up to ${width} long.`);
                  buffer[k] = i < mid && (j >= hi || a[i] <= a[j]) ? a[i++] : a[j++];
                }
                for (let k = lo; k < hi; k++) { a[k] = buffer[k]; writes++; yield frame('move', [k], 'Copy the merged group back. A little teamwork.'); }
              }
            }
            break;
          }
          case 'quick': yield* quick(0, a.length - 1); break;
          case 'heap':
            for (let root = Math.floor(a.length / 2) - 1; root >= 0; root--) yield* sift(a.length, root);
            for (let end = a.length - 1; end > 0; end--) { yield* swap(0, end); yield* sift(end, 0); }
            break;
          case 'radix': {
            const output = new Array(a.length);
            // Three decimal places fit safely in signed 32-bit keys in our input range.
            const key = value => (Math.round(value * 1000) ^ 0x80000000) >>> 0;
            for (let shift = 0; shift < 32; shift += 8) {
              const count = new Uint32Array(256);
              for (let i = 0; i < a.length; i++) {
                comparisons++; count[(key(a[i]) >>> shift) & 255]++;
                yield frame('compare', [i], `Byte ${shift / 8 + 1} of 4: inspect ${a[i]}. No neighbour comparisons needed.`);
              }
              for (let bucket = 1; bucket < 256; bucket++) count[bucket] += count[bucket - 1];
              for (let i = a.length - 1; i >= 0; i--) output[--count[(key(a[i]) >>> shift) & 255]] = a[i];
              for (let i = 0; i < a.length; i++) { a[i] = output[i]; writes++; yield frame('move', [i], `Collect byte ${shift / 8 + 1}. Equal keys keep their place in the queue.`); }
            }
            break;
          }
        }
      }
      yield frame('done', [], 'Sorted. Everyone is finally standing in the right place.');
      return a.slice();
    }
  }
  return { MAX_ITEMS, MAX_ABS, algorithms, parseNumbers, randomValues, createStepper };
});
