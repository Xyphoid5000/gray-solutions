// Small HTTP helpers shared by the Worker modules.

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

/** Parses a JSON object body; anything unparseable becomes {}. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Per-isolate in-memory throttle: `limit` attempts per `windowMs` per IP. */
export function makeThrottle(
  limit: number,
  windowMs: number,
): { blocked(ip: string): boolean; record(ip: string): void } {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return {
    blocked(ip: string): boolean {
      const entry = attempts.get(ip);
      if (!entry) return false;
      if (Date.now() > entry.resetAt) {
        attempts.delete(ip);
        return false;
      }
      return entry.count >= limit;
    },
    record(ip: string): void {
      const now = Date.now();
      const entry = attempts.get(ip);
      if (!entry || now > entry.resetAt) {
        attempts.set(ip, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count += 1;
      }
    },
  };
}
