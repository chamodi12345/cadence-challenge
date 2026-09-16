import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT, parsePageParams, toOffset, toPageMeta } from './pagination';

describe('toOffset (regression: pages are 1-based, page 1 is the first page)', () => {
  it('returns 0 for the first page', () => {
    expect(toOffset({ page: 1, limit: 25 })).toBe(0);
  });

  it('offsets by (page - 1) * limit', () => {
    expect(toOffset({ page: 2, limit: 25 })).toBe(25);
    expect(toOffset({ page: 3, limit: 50 })).toBe(100);
  });
});

describe('parsePageParams', () => {
  it('defaults to the first page and the default limit', () => {
    expect(parsePageParams({})).toEqual({ page: 1, limit: DEFAULT_LIMIT });
  });

  it('parses valid values', () => {
    expect(parsePageParams({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('falls back on junk input', () => {
    expect(parsePageParams({ page: 'banana', limit: '-4' })).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
    });
  });

  it('caps the limit', () => {
    expect(parsePageParams({ limit: '99999' }).limit).toBe(MAX_LIMIT);
  });
});

describe('toPageMeta', () => {
  it('computes total pages', () => {
    expect(toPageMeta({ page: 1, limit: 25 }, 51).totalPages).toBe(3);
  });

  it('reports one page when there are no rows', () => {
    expect(toPageMeta({ page: 1, limit: 25 }, 0).totalPages).toBe(1);
  });
});
