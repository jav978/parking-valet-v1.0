export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface JwtPayloadWithRt extends JwtPayload {
  refreshToken: string;
}
