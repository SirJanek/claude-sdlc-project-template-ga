import { describe, expect, it } from 'vitest';
import { MikroORM } from '@mikro-orm/postgresql';
import { createOrmConfig } from './config';
import { User } from './entities';

describe('ORM config', () => {
  it('maps the User entity to table "users" with the expected columns (no DB connection)', async () => {
    const orm = new MikroORM(createOrmConfig({ DATABASE_URL: 'postgresql://x:y@localhost:1/none' }));
    const meta = orm.getMetadata().get(User);
    expect(meta.tableName).toBe('users');
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

describe('ORM config defaults', () => {
  it('falls back to the local docker database and a pool of 10', () => {
    const cfg = createOrmConfig({});
    expect(cfg.clientUrl).toBe('postgresql://mentorhub:mentorhub@localhost:5433/mentorhub');
    expect(cfg.pool?.max).toBe(10);
    expect(cfg.debug).toBe(false);
  });

  it('logs queries only in development and accepts overrides', () => {
    expect(createOrmConfig({ NODE_ENV: 'development' }).debug).toEqual(['query']);
    expect(createOrmConfig({ NODE_ENV: 'development' }, { debug: false }).debug).toBe(false);
  });

  it('reads process.env when no environment is passed', () => {
    process.env.DB_POOL_MAX = '4';
    expect(createOrmConfig().pool?.max).toBe(4);
  });
});
