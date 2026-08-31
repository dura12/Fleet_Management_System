const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isTripDuration,
  computeExpectedReturn,
  inferTripDuration,
} = require('../dist/common/trip-duration');

describe('trip-duration', () => {
  it('recognizes valid duration codes', () => {
    assert.equal(isTripDuration('2h'), true);
    assert.equal(isTripDuration('1w'), true);
    assert.equal(isTripDuration('9h'), false);
  });

  it('computes 2h return from departure', () => {
    const start = new Date('2026-09-01T09:00:00.000Z');
    const end = computeExpectedReturn(start, '2h');
    assert.equal(end.getTime() - start.getTime(), 2 * 60 * 60 * 1000);
  });

  it('computes full-day return before 1pm as same-day 5pm local', () => {
    const start = new Date('2026-09-01T10:00:00');
    const end = computeExpectedReturn(start, '1d');
    assert.equal(end.getHours(), 17);
    assert.equal(end.getMinutes(), 0);
  });

  it('infers duration from travel and return gap', () => {
    const start = new Date('2026-09-01T09:00:00.000Z');
    const twoHourEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    assert.equal(inferTripDuration(start, twoHourEnd), '2h');
  });
});
