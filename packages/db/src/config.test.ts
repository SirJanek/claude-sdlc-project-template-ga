import { describe, expect, it } from 'vitest';
import { MikroORM } from '@mikro-orm/postgresql';
import { createOrmConfig } from './config';
import { User } from './entities/User';

describe('ORM config', () => {
  it('maps the User entity to table "user" with the expected columns (no DB connection)', async () => {
    const orm = new MikroORM(createOrmConfig({ DATABASE_URL: 'postgresql://x:y@localhost:1/none' }));
    const meta = orm.getMetadata().get(User);
    expect(meta.tableName).toBe('user');
    expect(Object.keys(meta.properties).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'role', 'updatedAt']);
    expect(meta.properties.email.unique).toBe(true);
    expect(meta.properties.role.items).toEqual(['mentee', 'mentor', 'admin']);
  });

  it('reads the pool size and URL from the environment', () => {
    const cfg = createOrmConfig({ DATABASE_URL: 'postgresql://a:b@h:1/d', DB_POOL_MAX: '3' });
    expect(cfg.clientUrl).toBe('postgresql://a:b@h:1/d');
    expect(cfg.pool?.max).toBe(3);
  });
});
