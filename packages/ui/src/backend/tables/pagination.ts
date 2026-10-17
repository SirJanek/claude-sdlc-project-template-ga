export interface Page<T> {
  rows: T[];
  page: number;
  pageCount: number;
}

/** Slices rows for a 1-based page; clamps out-of-range pages instead of returning nothing. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (current - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: current, pageCount };
}
