import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

vi.mock('../db/pool', () => ({
  pool: { query: vi.fn() },
}));

let createUser: typeof import('./users.service').createUser;
let pool: typeof import('../db/pool').pool;

beforeAll(async () => {
  ({ createUser } = await import('./users.service'));
  ({ pool } = await import('../db/pool'));
});

describe('users.service createUser()', () => {
  beforeEach(() => {
    (pool.query as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('rejects creating a second login for an agent that already has one', async () => {
    (pool.query as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ id: 'agt_1' }] }) // agent lookup
      .mockResolvedValueOnce({ rows: [{ id: 'usr_existing' }] }); // existing login check

    await expect(
      createUser('cmp_1', {
        email: 'chethana@test.test',
        fullName: 'Chethana',
        role: 'AGENT',
        agentCode: 'AG-001',
      })
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('AG-001 already has a login'),
    });

    // No insert should have been attempted.
    expect((pool.query as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('creates an agent login when the agent has no login yet', async () => {
    (pool.query as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [{ id: 'agt_2' }] }) // agent lookup
      .mockResolvedValueOnce({ rows: [] }) // no existing login
      .mockResolvedValueOnce({ rows: [{ id: 'usr_new' }] }); // INSERT ... RETURNING

    const result = await createUser('cmp_1', {
      email: 'new@test.test',
      fullName: 'New Agent',
      role: 'AGENT',
      agentCode: 'AG-002',
    });

    expect(result.email).toBe('new@test.test');
    expect(typeof result.tempPassword).toBe('string');
  });
});