import bcrypt from 'bcrypt';
import { pool } from '../db/pool';
import type { CreateUserInput, UpdateUserInput } from './users.schema';
import { randomBytes, randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function listUsers(companyId: string) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role, agent_id, created_at
       FROM users
      WHERE company_id = $1
      ORDER BY created_at`,
    [companyId]
  );
  return rows;
}

export async function createUser(companyId: string, input: CreateUserInput) {
  let agentId: string | null = null;

  if (input.role === 'AGENT') {
    if (!input.agentCode) {
      throw new HttpError(400, 'agentCode is required when role is AGENT');
    }
    const agentLookup = await pool.query(
      `SELECT id FROM agents WHERE company_id = $1 AND agent_code = $2`,
      [companyId, input.agentCode]
    );
    if (!agentLookup.rows[0]) {
      throw new HttpError(404, `No agent with code ${input.agentCode} exists in this company`);
    }
    agentId = agentLookup.rows[0].id;
  }

  // No email/SMTP integration yet, so we generate a temp password and
  // return it once — same pattern you'd use for real email delivery later.
  const tempPassword = randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);



  const userId = randomUUID();
  
const inserted = await pool.query(
  `INSERT INTO users (
     id,
     company_id,
     email,
     full_name,
     password_hash,
     role,
     agent_id,
     must_change_password,
     password_reset_required_by
   )
   VALUES ($1, $2, $3, $4, $5, $6, $7, true, now() + interval '7 days')
   RETURNING id`,
  [
    userId,
    companyId,
    input.email,
    input.fullName,
    passwordHash,
    input.role,
    agentId
  ]
);

  return {
    id: inserted.rows[0].id,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    tempPassword,
  };
}



export async function updateUser(companyId: string, userId: string, input: UpdateUserInput) {
  const target = await pool.query(
    `SELECT id, role FROM users WHERE id = $1 AND company_id = $2`,
    [userId, companyId]
  );
  if (!target.rows[0]) {
    throw new HttpError(404, 'User not found in this company');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.fullName !== undefined) {
    fields.push(`full_name = $${i++}`);
    values.push(input.fullName);
  }
  if (input.role !== undefined) {
    fields.push(`role = $${i++}`);
    values.push(input.role);
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'No fields to update');
  }

  values.push(userId, companyId);
  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i++} AND company_id = $${i}`,
    values
  );

  return { id: userId, ...input };
}

export async function deleteUser(companyId: string, userId: string, requestingUserId: string) {
  if (userId === requestingUserId) {
    throw new HttpError(400, 'You cannot delete your own account');
  }

  const target = await pool.query(
    `SELECT id, role FROM users WHERE id = $1 AND company_id = $2`,
    [userId, companyId]
  );
  if (!target.rows[0]) {
    throw new HttpError(404, 'User not found in this company');
  }

  if (target.rows[0].role === 'COMPANY_ADMIN') {
    const adminCount = await pool.query(
      `SELECT COUNT(*) FROM users WHERE company_id = $1 AND role = 'COMPANY_ADMIN'`,
      [companyId]
    );
    if (parseInt(adminCount.rows[0].count, 10) <= 1) {
      throw new HttpError(400, 'Cannot delete the last Company Admin');
    }
  }

  await pool.query(`DELETE FROM users WHERE id = $1 AND company_id = $2`, [userId, companyId]);
}