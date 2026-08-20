import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import bcrypt from 'bcrypt';

// Static `import` statements are hoisted above all other code by the JS
// module system, regardless of where they're written textually — so setting
// process.env.JWT_SECRET before a static import does NOT actually delay
// that import. auth.service.ts reads JWT_SECRET once, at module load time.
// The fix: set the env var first, then dynamically import the module under
// test, so it genuinely loads after JWT_SECRET exists.
process.env.JWT_SECRET = 'test-secret';

vi.mock('../db/pool', () => ({
  pool: { query: vi.fn() },
}));

let login: typeof import('./auth.service').login;
let pool: typeof import('../db/pool').pool;

beforeAll(async () => {
  ({ login } = await import('./auth.service'));
  ({ pool } = await import('../db/pool'));
});

describe('auth.service login()', () => {
  beforeEach(() => {
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('returns a token and user for correct email + password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [
        {
          id: 'usr_1',
          company_id: 'cmp_test',
          email: 'admin@test.test',
          password_hash: passwordHash,
          full_name: 'Test Admin',
          role: 'COMPANY_ADMIN',
          must_change_password: false,
          agent_id: null,
        },
      ],
    });

    const result = await login('admin@test.test', 'correct-password');

    expect(result).not.toBeNull();
    expect(result?.user.email).toBe('admin@test.test');
    expect(result?.user.role).toBe('COMPANY_ADMIN');
    expect(result?.user.mustChangePassword).toBe(false);
    expect(typeof result?.token).toBe('string');
    expect(result?.token.split('.').length).toBe(3);
  });

  it('returns null for a wrong password on an existing user', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [
        {
          id: 'usr_1',
          company_id: 'cmp_test',
          email: 'admin@test.test',
          password_hash: passwordHash,
          full_name: 'Test Admin',
          role: 'COMPANY_ADMIN',
          must_change_password: false,
          agent_id: null,
        },
      ],
    });

    const result = await login('admin@test.test', 'wrong-password');

    expect(result).toBeNull();
  });

  it('returns null for an email that does not exist', async () => {
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

    const result = await login('nobody@test.test', 'anything');

    expect(result).toBeNull();
  });

  it('never returns the password hash in the response', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [
        {
          id: 'usr_1',
          company_id: 'cmp_test',
          email: 'admin@test.test',
          password_hash: passwordHash,
          full_name: 'Test Admin',
          role: 'COMPANY_ADMIN',
          must_change_password: false,
          agent_id: null,
        },
      ],
    });

    const result = await login('admin@test.test', 'correct-password');

    expect(JSON.stringify(result)).not.toContain(passwordHash);
    expect(JSON.stringify(result)).not.toContain('password_hash');
  });

  it('passes mustChangePassword through correctly when true', async () => {
    const passwordHash = await bcrypt.hash('temp-pass', 10);
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [
        {
          id: 'usr_2',
          company_id: 'cmp_test',
          email: 'newuser@test.test',
          password_hash: passwordHash,
          full_name: 'New User',
          role: 'AGENT',
          must_change_password: true,
          agent_id: 'agt_1',
        },
      ],
    });

    const result = await login('newuser@test.test', 'temp-pass');

    expect(result?.user.mustChangePassword).toBe(true);
    expect(result?.user.agentId).toBe('agt_1');
  });
});