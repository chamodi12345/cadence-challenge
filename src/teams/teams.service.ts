import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import type { CreateTeamInput, AddMemberInput } from './teams.schema';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface MemberRow {
  id: string;
  agentId: string;
  agentCode: string;
  fullName: string;
  isLead: boolean;
}

interface TeamRow {
  id: string;
  companyId: string;
  name: string;
  members: MemberRow[];
}

async function loadMembers(teamId: string): Promise<MemberRow[]> {
  const { rows } = await pool.query(
    `SELECT tm.id, tm.agent_id AS "agentId", a.agent_code AS "agentCode",
            a.full_name AS "fullName", tm.is_lead AS "isLead"
       FROM team_members tm
       JOIN agents a ON a.id = tm.agent_id
      WHERE tm.team_id = $1
      ORDER BY tm.is_lead DESC, a.agent_code ASC`,
    [teamId],
  );
  return rows;
}

export async function listTeams(companyId: string): Promise<TeamRow[]> {
  const { rows: teams } = await pool.query(
    `SELECT id, company_id AS "companyId", name FROM teams WHERE company_id = $1 ORDER BY name ASC`,
    [companyId],
  );
  const results: TeamRow[] = [];
  for (const t of teams) {
    results.push({ ...t, members: await loadMembers(t.id) });
  }
  return results;
}

export async function createTeam(companyId: string, input: CreateTeamInput): Promise<TeamRow> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO teams (id, company_id, name) VALUES ($1, $2, $3)
     RETURNING id, company_id AS "companyId", name`,
    [id, companyId, input.name],
  );
  return { ...rows[0], members: [] };
}

export async function deleteTeam(companyId: string, teamId: string): Promise<void> {
  const { rows } = await pool.query('SELECT id FROM teams WHERE id = $1 AND company_id = $2', [
    teamId,
    companyId,
  ]);
  if (!rows[0]) throw new HttpError(404, 'Team not found');
  await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
}

export async function addMember(
  companyId: string,
  teamId: string,
  input: AddMemberInput,
): Promise<TeamRow> {
  const { rows: teamRows } = await pool.query(
    'SELECT id FROM teams WHERE id = $1 AND company_id = $2',
    [teamId, companyId],
  );
  if (!teamRows[0]) throw new HttpError(404, 'Team not found');

  const { rows: agentRows } = await pool.query(
    'SELECT id FROM agents WHERE company_id = $1 AND agent_code = $2',
    [companyId, input.agentCode],
  );
  const agent = agentRows[0];
  if (!agent) throw new HttpError(404, `No agent with code ${input.agentCode} exists`);

  try {
    await pool.query(
      `INSERT INTO team_members (id, team_id, agent_id, is_lead) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), teamId, agent.id, input.isLead],
    );
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
      throw new HttpError(409, 'This agent is already a member of this team');
    }
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT id, company_id AS "companyId", name FROM teams WHERE id = $1`,
    [teamId],
  );
  return { ...rows[0], members: await loadMembers(teamId) };
}

export async function removeMember(companyId: string, teamId: string, memberId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT tm.id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = $1 AND tm.team_id = $2 AND t.company_id = $3`,
    [memberId, teamId, companyId],
  );
  if (!rows[0]) throw new HttpError(404, 'Team member not found');
  await pool.query('DELETE FROM team_members WHERE id = $1', [memberId]);
}