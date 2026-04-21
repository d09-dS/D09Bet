import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "dotbet-jwt-secret-key-change-in-production-min-32-chars!!"
);

const ACCESS_TOKEN_EXP = "8h";
const REFRESH_TOKEN_EXP = "7d";

interface TokenPayload extends JWTPayload {
  sub: string;
  username: string;
  role: string;
  type: "access" | "refresh";
}

export async function generateAccessToken(userId: string, username: string, role: string) {
  return new SignJWT({ username, role, type: "access" } as TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXP)
    .sign(secret);
}

export async function generateRefreshToken(userId: string, username: string, role: string) {
  return new SignJWT({ username, role, type: "refresh" } as TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXP)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const payload = await verifyToken(token);
  return payload?.sub ?? null;
}

export async function getRoleFromToken(token: string): Promise<string | null> {
  const payload = await verifyToken(token);
  return payload?.role ?? null;
}
