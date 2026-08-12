import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMIT, MAX_LIMIT, parsePageParams, toPageMeta } from './pagination';

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
