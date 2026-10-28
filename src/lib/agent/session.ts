import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const COOKIE = 'ffcs_session';
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Signing key. Set SESSION_SECRET in production; falling back to the API key
 * keeps the token stable per deployment without a second secret to configure.
 */
function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.OPENCODE_API_KEY ?? 'ffcs-dev-secret';
}

const sign = (value: string) =>
  createHmac('sha256', secret()).update(value).digest('base64url');

/** A signed, httpOnly cookie. The id keys the rate limiter. */
export function issueSession(): { header: string; id: string } {
  const id = randomUUID();
  const expires = Date.now() + TTL_MS;
  const token = `${id}.${expires}.${sign(`${id}.${expires}`)}`;

  return {
    id,
    header: `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(
      TTL_MS / 1000,
    )}`,
  };
}

export function readSession(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|; )${COOKIE}=([^;]+)`).exec(cookie);
  if (!match) return null;

  const [id, expires, signature] = match[1].split('.');
  if (!id || !expires || !signature) return null;
  if (Number(expires) < Date.now()) return null;

  const expected = sign(`${id}.${expires}`);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  return id;
}

/** Browsers always send Origin on POST; a mismatch means a cross-site call. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host;
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
