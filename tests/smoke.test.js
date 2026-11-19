import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleErrorCopy, isPermanentSampleError } from '../src/platform/claude.js';

test('sample error copy covers permanent and transient codes', () => {
  assert.ok(isPermanentSampleError('not_granted'));
  assert.ok(!isPermanentSampleError('rate_limited'));
  assert.equal(sampleErrorCopy('cancelled'), '');
  assert.match(sampleErrorCopy('something_new'), /again/);
});
