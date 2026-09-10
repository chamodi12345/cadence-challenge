import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

// Same reasoning as auth.service.test.ts: static imports are hoisted above
// this assignment, so JWT_SECRET must be set before auth.middleware is
// imported dynamically, not via a static import at the top of this file.
process.env.JWT_SECRET = 'test-secret';
const JWT_SECRET = 'test-secret';

let requireAuth: typeof import('./auth.middleware').requireAuth;
let requireRole: typeof import('./auth.middleware').requireRole;
type AuthedRequest = import('./auth.middleware').AuthedRequest;

beforeAll(async () => {
  ({ requireAuth, requireRole } = await import('./auth.middleware'));
});

function makeRes() {
  const res: { statusCode?: number; body?: unknown; status: (code: number) => typeof res; json: (body: unknown) => typeof res } = {
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function makeReq(headers: Record<string, string> = {}): AuthedRequest {
  return { headers } as unknown as AuthedRequest;
}

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request with a malformed Authorization header', () => {
    const req = makeReq({ authorization: 'NotBearer abc123' });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid/tampered token', () => {
    const req = makeReq({ authorization: 'Bearer not-a-real-jwt' });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a request with a valid token and populates req.user', () => {
    const token = jwt.sign(
      { sub: 'usr_1', companyId: 'cmp_1', role: 'COMPANY_ADMIN', agentId: null },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({
      id: 'usr_1',
      companyId: 'cmp_1',
      role: 'COMPANY_ADMIN',
      agentId: null,
    });
  });

  it('rejects an expired token', () => {
    const token = jwt.sign(
      { sub: 'usr_1', companyId: 'cmp_1', role: 'COMPANY_ADMIN', agentId: null },
      JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const req = makeReq({ authorization: `Bearer ${token}` });
    const res = makeRes();
    const next = vi.fn();

    requireAuth(req, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('allows a request when the user has an allowed role', () => {
    const req = makeReq();
    req.user = { id: 'usr_1', companyId: 'cmp_1', role: 'COMPANY_ADMIN', agentId: null };
    const res = makeRes();
    const next = vi.fn();

    const middleware = requireRole('COMPANY_ADMIN', 'FINANCE');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects a request when the user has a disallowed role', () => {
    const req = makeReq();
    req.user = { id: 'usr_1', companyId: 'cmp_1', role: 'AGENT', agentId: 'agt_1' };
    const res = makeRes();
    const next = vi.fn();

    const middleware = requireRole('COMPANY_ADMIN');
    middleware(req, res as never, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request with no user at all (requireAuth was skipped)', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    const middleware = requireRole('COMPANY_ADMIN');
    middleware(req, res as never, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});