/** Platform scopes — no contextId binding required */
export const PLATFORM_SCOPES = {
  BAZI_CALCULATE: 'bazi:calculate',
  INSIGHT_INTERPRET: 'insight:interpret',
  DAILY_INSIGHT_READ: 'daily-insight:read',
  TUTOR_CHAT: 'tutor:chat',
} as const;

/** Data scopes — require a bound contextId */
export const DATA_SCOPES = {
  PROFILE_READ_SELF: 'profile:read:self',
  PROFILE_READ_ANY: 'profile:read:any',
  PROFILE_WRITE_SELF: 'profile:write:self',
  PROFILE_WRITE_ANY: 'profile:write:any',
  CARD_DRAW: 'card:draw',
} as const;

/** Admin scopes */
export const ADMIN_SCOPES = {
  TENANT_MANAGE: 'tenant:manage',
  OPEN_APP_MANAGE: 'open-app:manage',
} as const;

export const ALL_SCOPES = {
  ...PLATFORM_SCOPES,
  ...DATA_SCOPES,
  ...ADMIN_SCOPES,
} as const;

export type Scope = (typeof ALL_SCOPES)[keyof typeof ALL_SCOPES];

/** Scopes that require an accountId binding on the credential */
export const DATA_SCOPE_SET = new Set<string>(Object.values(DATA_SCOPES));

export function isDataScope(scope: string): boolean {
  return DATA_SCOPE_SET.has(scope);
}

/** Role → scope mapping for JWT users */
export const ROLE_SCOPES: Record<string, string[]> = {
  guest: [PLATFORM_SCOPES.BAZI_CALCULATE],
  user: [
    PLATFORM_SCOPES.BAZI_CALCULATE,
    PLATFORM_SCOPES.INSIGHT_INTERPRET,
    PLATFORM_SCOPES.DAILY_INSIGHT_READ,
    DATA_SCOPES.PROFILE_READ_SELF,
    DATA_SCOPES.PROFILE_WRITE_SELF,
    DATA_SCOPES.CARD_DRAW,
  ],
  admin: Object.values(ALL_SCOPES),
};
