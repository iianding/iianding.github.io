'use strict';
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const engine = require('../notes/sorting/sort-engine.js');
const examples = require('../notes/sorting/code-examples.js');
let seed = 516528;
const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
for (const text of ['', '1,,2', '1,2,', '1;2', 'NaN', 'Infinity', '1e3', '0x11', '1000000', '-1000000', '9999999', '0.0001', '1.2.3', '<script>alert(1)</script>', Array(21).fill('1').join(',')]) {
  assert.ok(engine.parseNumbers(text).error, text);
}
for (const [text, values] of [['0', [0]], ['-0, +1, .5, -.125', [0, 1, .5, -.125]], ['999999.999, -999999.999', [999999.999, -999999.999]], [Array(20).fill('2').join(','), Array(20).fill(2)]]) {
  assert.deepEqual(engine.parseNumbers(text).values, values);
}
const cases = [[], [1], [0], [-1, 0, 1], Array(20).fill(0), Array.from({ length: 20 }, (_, i) => i), Array.from({ length: 20 }, (_, i) => 20 - i), [999999.999, -999999.999, .001, -.001, 0, -.5, .5, .001]];
for (let i = 0; i < 500; i++) cases.push(Array.from({ length: Math.floor(random() * 21) }, () => Math.round((random() - .5) * 1999999998) / 1000));
const start = performance.now();
const maxSteps = {};
for (const name of engine.algorithms) {
  assert.deepEqual(Object.keys(examples[name]).sort(), ['c', 'cpp', 'java', 'python']);
  maxSteps[name] = 0;
  for (const values of cases) {
    const original = values.slice(), expected = values.slice().sort((a, b) => a - b);
    let last, steps = 0;
    for (const frame of engine.createStepper(name, values)) {
      assert.ok(++steps < 2000, `${name}: runaway generator`);
      assert.equal(frame.values.length, values.length);
      assert.ok(frame.values.every(Number.isFinite));
      assert.ok(frame.focus.every(i => Number.isInteger(i) && i >= 0 && i < values.length));
      last = frame;
    }
    assert.equal(last.kind, 'done');
    assert.deepEqual(last.values, expected, name);
    assert.deepEqual(values, original, 'input must remain untouched');
    maxSteps[name] = Math.max(maxSteps[name], steps);
  }
}
assert.equal(engine.randomValues(random).length, 15);
assert.throws(() => engine.createStepper('bubble', Array(21).fill(1)));
assert.throws(() => engine.createStepper('radix', [Infinity]));
console.log(JSON.stringify({ result: 'PASS', algorithms: 8, casesPerAlgorithm: cases.length, maxSteps, computeCheckMs: Math.round(performance.now() - start) }));
