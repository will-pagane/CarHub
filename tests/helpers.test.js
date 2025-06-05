import { describe, it, expect } from 'vitest';
import { convertTimestampsToISO } from '../carhub-api/utils/helpers';

const fakeTimestamp = {
  toDate: () => new Date('2021-01-01T00:00:00Z')
};

describe('convertTimestampsToISO', () => {
  it('converts timestamp fields to ISO strings', () => {
    const input = { foo: fakeTimestamp, bar: 'baz' };
    const result = convertTimestampsToISO(input);
    expect(result.foo).toBe('2021-01-01T00:00:00.000Z');
    expect(result.bar).toBe('baz');
  });
});
