/**
 * Pagination helpers shared by the reporting queries.
 *
 * Contract: pages are 1-based. `page=1` is the first page.
 */
export interface PageParams {
  page: number;
  limit: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 200;

export function parsePageParams(query: Record<string, string | undefined>): PageParams {
  const page = Number(query.page ?? '1');
  const limit = Number(query.limit ?? String(DEFAULT_LIMIT));

  return {
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    limit:
      Number.isFinite(limit) && limit >= 1
        ? Math.min(Math.floor(limit), MAX_LIMIT)
        : DEFAULT_LIMIT,
  };
}

export function toOffset(params: PageParams): number {
  return params.page * params.limit;
}

export function toPageMeta(params: PageParams, total: number): PageMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
