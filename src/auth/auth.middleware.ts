import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthedRequest extends Request {
  user?: { id: string; companyId: string; role: string; agentId: string | null };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as {
      sub: string;
      companyId: string;
      role: string;
      agentId: string | null;
    };
    req.user = { id: payload.sub, companyId: payload.companyId, role: payload.role, agentId: payload.agentId };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}