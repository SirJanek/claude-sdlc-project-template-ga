import { describe, expect, it } from 'vitest';
import { paginate } from './pagination';

describe('paginate', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i + 1);

  it('slices pages and counts them', () => {
    expect(paginate(rows, 1, 20)).toEqual({ rows: rows.slice(0, 20), page: 1, pageCount: 3 });
    expect(paginate(rows, 3, 20).rows).toEqual([41, 42, 43, 44, 45]);
  });

  it('clamps out-of-range pages and handles empty lists', () => {
    expect(paginate(rows, 9, 20).page).toBe(3);
    expect(paginate(rows, 0, 20).page).toBe(1);
    expect(paginate([], 1, 20)).toEqual({ rows: [], page: 1, pageCount: 1 });
  });
});
