export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  CASHIER: 'CASHIER',
  OPERATOR: 'OPERATOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
