import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface RejectedRow {
  row: number;
  reason: string;
}

export interface ImportResult {
  totalRows: number;
  accepted: number;
  rejected: number;
  rejections: RejectedRow[];
}

const HEADER_MAP: Record<string, string> = {
  ref: 'external_ref',
  'agent code': 'agent_code',
  'booking date': 'booking_date',
  amount: 'amount',
  product: 'product_code',
};

const REQUIRED_CANONICAL = ['external_ref', 'agent_code', 'booking_date', 'amount', 'product_code'];

function canonicalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase();
  return HEADER_MAP[key] ?? key.replace(/\s+/g, '_');
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore, \n handles the line break
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Use optional chaining on r[0] — noUncheckedIndexedAccess treats every
  // array index as possibly undefined regardless of the length check.
  return rows.filter((r) => !(r.length === 1 && r[0]?.trim() === ''));
}

function parseDate(raw: string): string | null {
  const v = raw.trim();

  let y: number, m: number, d: number;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (iso) {
    [, y, m, d] = iso.map(Number) as unknown as [never, number, number, number];
  } else if (dmy) {
    [, d, m, y] = dmy.map(Number) as unknown as [never, number, number, number];
  } else {
    return null;
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  if (!valid) return null;

  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

function parseAmount(raw: string): { value: string; currency: string | null } | null {
  let v = raw.trim();

  let currency: string | null = null;

  const prefixMatch = v.match(/^(Rs\.?|LKR|USD)\s*/i);
  if (prefixMatch) {
    const fullMatch = prefixMatch[0] ?? '';
    // The regex's capturing group is mandatory (no `?`), so a successful
    // match always has group 1. Fall back to '' only to satisfy the type
    // checker's inability to see that guarantee — this branch never
    // actually executes with captured === ''.
    const captured = prefixMatch[1] ?? '';
    if (captured) {
      currency = captured.toUpperCase().replace('.', '') === 'RS' ? null : captured.toUpperCase();
    }
    v = v.slice(fullMatch.length).trim();
  }

  const suffixMatch = v.match(/\s*(USD|LKR)$/i);
  if (suffixMatch) {
    const fullSuffix = suffixMatch[0] ?? '';
    const capturedSuffix = suffixMatch[1] ?? '';
    if (capturedSuffix) {
      currency = capturedSuffix.toUpperCase();
    }
    v = v.slice(0, v.length - fullSuffix.length).trim();
  }

  v = v.replace(/,/g, '');

  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;

  const decimals = v.split('.')[1];
  if (decimals && decimals.length > 2) return null;

  const num = Number(v);
  if (!(num > 0)) return null;

  return { value: num.toFixed(2), currency };
}

export async function importBookingsCsv(
  companyId: string,
  fileBuffer: Buffer,
): Promise<ImportResult> {
  const text = fileBuffer.toString('utf8');
  const allRows = splitCsv(text);

  if (allRows.length === 0) {
    throw new HttpError(400, 'CSV file is empty');
  }

  const rawHeaders = allRows[0];
  if (!rawHeaders) {
    throw new HttpError(400, 'CSV file is empty');
  }
  const canonicalHeaders = rawHeaders.map(canonicalizeHeader);
  const missing = REQUIRED_CANONICAL.filter((h) => !canonicalHeaders.includes(h));
  if (missing.length > 0) {
    throw new HttpError(400, `CSV is missing required columns: ${missing.join(', ')}`);
  }

  const dataRows = allRows.slice(1);
  if (dataRows.length === 0) {
    throw new HttpError(400, 'CSV file has no data rows');
  }

  const { rows: agentRows } = await pool.query<{ agent_code: string }>(
    'SELECT agent_code FROM agents WHERE company_id = $1',
    [companyId],
  );
  const validAgentCodes = new Set(agentRows.map((a) => a.agent_code.toUpperCase()));

  const { rows: existingRows } = await pool.query<{ external_ref: string }>(
    'SELECT external_ref FROM bookings WHERE company_id = $1',
    [companyId],
  );
  const existingRefs = new Set(existingRows.map((r) => r.external_ref));
  const seenInFile = new Set<string>();

  const rejections: RejectedRow[] = [];
  let accepted = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2;
    const fields = dataRows[i];

    if (!fields) {
      rejections.push({ row: rowNumber, reason: 'Row could not be read' });
      continue;
    }

    if (fields.length !== canonicalHeaders.length) {
      rejections.push({
        row: rowNumber,
        reason: `Row has ${fields.length} columns, expected ${canonicalHeaders.length} — check for an unquoted comma or a missing/extra field`,
      });
      continue;
    }

    const record: Record<string, string> = {};
    canonicalHeaders.forEach((h, idx) => {
      record[h] = fields[idx] ?? '';
    });

    const externalRef = record.external_ref?.trim();
    if (!externalRef) {
      rejections.push({ row: rowNumber, reason: 'external_ref is required' });
      continue;
    }

    const agentCodeRaw = record.agent_code?.trim();
    if (!agentCodeRaw) {
      rejections.push({ row: rowNumber, reason: 'agent_code is required' });
      continue;
    }
    const agentCode = agentCodeRaw.toUpperCase();
    if (!validAgentCodes.has(agentCode)) {
      rejections.push({ row: rowNumber, reason: `Unknown agent code: ${agentCodeRaw}` });
      continue;
    }

    const bookingDate = parseDate(record.booking_date ?? '');
    if (!bookingDate) {
      rejections.push({
        row: rowNumber,
        reason: `Invalid booking_date: "${record.booking_date}" (expected YYYY-MM-DD or DD/MM/YYYY, and a real calendar date)`,
      });
      continue;
    }

    const parsedAmount = parseAmount(record.amount ?? '');
    if (!parsedAmount) {
      rejections.push({
        row: rowNumber,
        reason: `Invalid amount: "${record.amount}" (must be a positive number with at most 2 decimal places)`,
      });
      continue;
    }

    const productCode = record.product_code?.trim().toUpperCase();
    if (!productCode) {
      rejections.push({ row: rowNumber, reason: 'product_code is required' });
      continue;
    }

    if (existingRefs.has(externalRef) || seenInFile.has(externalRef)) {
      rejections.push({
        row: rowNumber,
        reason: `Duplicate booking (external_ref "${externalRef}" already exists)`,
      });
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO bookings
           (id, company_id, external_ref, agent_code, booking_date, amount, currency, product_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          companyId,
          externalRef,
          agentCode,
          bookingDate,
          parsedAmount.value,
          parsedAmount.currency ?? 'LKR',
          productCode,
        ],
      );
      seenInFile.add(externalRef);
      accepted++;
    } catch (err) {
      rejections.push({ row: rowNumber, reason: `Insert failed: ${(err as Error).message}` });
    }
  }

  return {
    totalRows: dataRows.length,
    accepted,
    rejected: rejections.length,
    rejections,
  };
}