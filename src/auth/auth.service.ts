import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '8h';

interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT';
  must_change_password: boolean;
  agent_id: string | null;
  password_reset_required_by: string | null; 
}

export async function login(email: string, password: string) {
  const { rows } = await pool.query<UserRow>(
   `SELECT id, company_id, email, password_hash, full_name, role, must_change_password, agent_id,
        password_reset_required_by
   FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];

  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) return null;


  if (
  user.must_change_password &&
  user.password_reset_required_by &&
  new Date(user.password_reset_required_by) < new Date()
) {
  return null;
}

  const token = jwt.sign(
    { sub: user.id, companyId: user.company_id, role: user.role,  agentId: user.agent_id  },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: user.company_id,
      mustChangePassword: user.must_change_password, // <-- new
      agentId: user.agent_id, // <-- new
    },
  };
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
 await pool.query(
  `UPDATE users SET password_hash = $1, must_change_password = false, password_reset_required_by = NULL WHERE id = $2`,
  [passwordHash, userId]
);
}