import test from 'node:test';
import assert from 'node:assert';
import { isAdult } from './age_utils.js';

test('minor is not an adult', () => {
  assert.strictEqual(isAdult(17), false);
});

test('boundary adult at 18', () => {
  assert.strictEqual(isAdult(18), true);
});

test('senior is an adult', () => {
  assert.strictEqual(isAdult(19), true);
});
