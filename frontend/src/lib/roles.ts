// src/lib/roles.ts
export type Role = 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT';

export const ROLE_LABELS: Record<Role, string> = {
  COMPANY_ADMIN: 'Company Admin',
  FINANCE: 'Finance Admin',
  AGENT: 'Agent',
};

export function roleHomePath(role: Role): string {
  switch (role) {
    case 'COMPANY_ADMIN':
      return '/dashboard';
    case 'FINANCE':
      return '/finance';
    case 'AGENT':
      return '/agent';
  }
}