import { describe, expect, it } from 'vitest';
import * as db from './index';

describe('@mentorhub/db public API', () => {
  it('exposes entities, config and ORM helpers', () => {
    for (const name of [
      'User',
      'USER_ROLES',
      'baseProperties',
      'createOrmConfig',
      'entities',
      'DEFAULT_DATABASE_URL',
      'createOrm',
      'isUniqueViolation',
      'getOrm',
    ]) {
      expect(db, name).toHaveProperty(name);
    }
    expect(db.entities).toContain(db.User);
  });
});
