import { describe, expect, it } from 'vitest';
import { Migrator } from '@mikro-orm/migrations';
import { createMigrationConfig, runMigrationCommand, type MigratorLike } from './run-command';

function fakeMigrator(state: {
  executed: string[];
  pending: string[];
  diff?: string[];
}): MigratorLike & { created: unknown[] } {
  const created: unknown[] = [];
  return {
    created,
    up: async () => state.pending.map((name) => ({ name })),
    down: async () => state.executed.slice(-1).map((name) => ({ name })),
    create: async (...args) => (created.push(args), { fileName: 'Migration_x.ts', diff: { up: state.diff ?? [] } }),
    getExecuted: async () => state.executed.map((name) => ({ name })),
    getPending: async () => state.pending.map((name) => ({ name })),
  };
}

describe('runMigrationCommand', () => {
  it('up reports applied migrations or that nothing is pending', async () => {
    expect(await runMigrationCommand(fakeMigrator({ executed: [], pending: ['M1', 'M2'] }), 'up')).toEqual([
      'Applied: M1, M2',
    ]);
    expect(await runMigrationCommand(fakeMigrator({ executed: ['M1'], pending: [] }), 'up')).toEqual([
      'No pending migrations.',
    ]);
  });

  it('down reports the reverted migration or that nothing can be reverted', async () => {
    expect(await runMigrationCommand(fakeMigrator({ executed: ['M1', 'M2'], pending: [] }), 'down')).toEqual([
      'Reverted: M2',
    ]);
    expect(await runMigrationCommand(fakeMigrator({ executed: [], pending: [] }), 'down')).toEqual([
      'Nothing to revert.',
    ]);
  });

  it('create passes the name and says when there is nothing to create', async () => {
    const changed = fakeMigrator({ executed: [], pending: [], diff: ['alter table …'] });
    expect(await runMigrationCommand(changed, 'create', 'add-x')).toEqual(['Created Migration_x.ts']);
    expect(changed.created).toEqual([[undefined, false, false, 'add-x']]);
    expect(await runMigrationCommand(fakeMigrator({ executed: [], pending: [] }), 'create')).toEqual([
      'No schema changes — no migration created.',
    ]);
  });

  it('status lists executed and pending, with a dash when empty', async () => {
    expect(await runMigrationCommand(fakeMigrator({ executed: ['M1'], pending: ['M2'] }), 'status')).toEqual([
      'Executed: M1',
      'Pending:  M2',
    ]);
    expect(await runMigrationCommand(fakeMigrator({ executed: [], pending: [] }), 'status')).toEqual([
      'Executed: —',
      'Pending:  —',
    ]);
  });

  it('rejects unknown commands', async () => {
    await expect(runMigrationCommand(fakeMigrator({ executed: [], pending: [] }), 'drop')).rejects.toThrow(
      /Unknown command "drop"/,
    );
  });
});

describe('createMigrationConfig', () => {
  it('adds the Migrator and points at src/migrations with snapshots', () => {
    const cfg = createMigrationConfig({ DATABASE_URL: 'postgresql://a:b@h:1/d' });
    expect(cfg.extensions).toEqual([Migrator]);
    expect(cfg.migrations).toMatchObject({ emit: 'ts', snapshot: true });
    expect(String(cfg.migrations?.path)).toMatch(/src\/migrations$/);
    expect(cfg.clientUrl).toBe('postgresql://a:b@h:1/d');
    expect(createMigrationConfig().debug).toBe(false);
  });
});
