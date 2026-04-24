import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

// ─── Auth helpers ────────────────────────────────────────

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload?.sub || payload.type !== "access") return null;

  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) throw new ApiError(401, "unauthorized");
  return user;
}

export async function requireRole(req: NextRequest, ...roles: string[]) {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) throw new ApiError(403, "forbidden");
  return user;
}

// ─── Error handling ──────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string>,
    public errorParams?: Record<string, string | number>
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.fieldErrors) body.fieldErrors = err.fieldErrors;
    if (err.errorParams) body.errorParams = err.errorParams;
    return NextResponse.json(body, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "internalServerError" }, { status: 500 });
}

// ─── Serialisation (Decimal / BigInt → number) ───────────

// Recursively convert Prisma Decimal objects and BigInts to plain numbers.
// This must happen BEFORE JSON.stringify because stringify calls .toJSON()
// on Decimals first, turning them into strings the replacer can't detect.
function deepConvert(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (
    typeof value === "object" &&
    "toNumber" in (value as object) &&
    typeof (value as Record<string, unknown>).toNumber === "function"
  ) {
    return (value as { toNumber(): number }).toNumber();
  }
  if (Array.isArray(value)) return value.map(deepConvert);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepConvert(v);
    }
    return result;
  }
  return value;
}

export function serialize<T>(obj: T): T {
  return deepConvert(obj) as T;
}

// ─── Pagination ──────────────────────────────────────────

export function parsePagination(req: NextRequest, defaultSize = 20) {
  const url = req.nextUrl;
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get("size") ?? defaultSize)));
  return { page, size, skip: page * size, take: size };
}

export function pageResponse<T>(content: T[], total: number, page: number, size: number) {
  return {
    content,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    number: page,
    size,
  };
}

// ─── System settings helper ──────────────────────────────

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const s = await prisma.systemSetting.findUnique({ where: { key } });
  return s?.value ?? defaultValue;
}

export async function getDecimalSetting(key: string, defaultValue: number): Promise<number> {
  const v = await getSetting(key, String(defaultValue));
  return Number(v);
}

export async function getBooleanSetting(key: string, defaultValue: boolean): Promise<boolean> {
  const v = await getSetting(key, String(defaultValue));
  return v === "true";
}
