export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  sessionToken?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface JwtPayloadWithRt extends JwtPayload {
  refreshToken: string;
}
