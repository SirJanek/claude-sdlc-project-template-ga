/**
 * Shared unit-test settings for every package. Coverage must stay at 100% (AGENTS.md › Testing):
 * a change that leaves code untested fails `make test`. Exclusions are limited to tests and the
 * paths each package lists (documented in AGENTS.md).
 */
export const FULL_COVERAGE = { lines: 100, branches: 100, functions: 100, statements: 100 };

export function unitTestConfig(
  options: { environment?: 'node' | 'jsdom'; coverageExclude?: string[]; extensions?: string[] } = {},
) {
  // `extensions` lets a dependency-free JavaScript package (tools/setup: .mjs) use the same gate.
  const extensions = options.extensions ?? ['ts', 'tsx'];
  const ext = extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;
  return {
    include: [`src/**/*.test.${ext}`],
    environment: options.environment ?? 'node',
    coverage: {
      provider: 'v8' as const,
      include: [`src/**/*.${ext}`],
      exclude: [`src/**/*.test.${ext}`, ...(options.coverageExclude ?? [])],
      thresholds: FULL_COVERAGE,
      reporter: ['text', 'json-summary'],
    },
  };
}
