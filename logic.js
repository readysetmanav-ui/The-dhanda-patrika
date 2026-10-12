// Membership logic. Pure functions plus small database helpers, so they can be tested offline.

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let cachedKeys = null, cachedAt = 0;

const dec = new TextDecoder();
function b64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function googleKeys() {
  if (cachedKeys && Date.now() - cachedAt < 3600e3) return cachedKeys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('could not load Google keys');
  cachedKeys = (await r.json()).keys;
  cachedAt = Date.now();
  return cachedKeys;
}

/** Verifies a Firebase ID token's signature and claims. Throws if anything is wrong. */
export async function verifyIdToken(token, projectId, nowSec, keys) {
  const p = String(token || '').split('.');
  if (p.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(dec.decode(b64u(p[0])));
  const claims = JSON.parse(dec.decode(b64u(p[1])));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad algorithm');
  const jwk = (keys || (await googleKeys())).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) throw new Error('bad signature');
  if (claims.aud !== projectId) throw new Error('wrong audience');
  if (claims.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('wrong issuer');
  if (!(claims.exp > nowSec)) throw new Error('expired');
  if (!(claims.iat <= nowSec + 60)) throw new Error('issued in the future');
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error('missing identity');
  return claims;
}

/** One central rule for who gets Premium. Priority: approved free access, paid, trial, nothing. */
export function membership(u, now) {
  const trialEnd = u.trial_end || null;
  if (u.free_access === 'approved') return { status: 'free_approved', premium: true, until: null, trialEnd };
  if (u.paid_until && u.paid_until > now) return { status: 'paid', premium: true, until: u.paid_until, trialEnd };
  if (trialEnd && trialEnd > now) return { status: 'trial', premium: true, until: trialEnd, trialEnd };
  return { status: trialEnd ? 'trial_expired' : 'free', premium: false, until: null, trialEnd };
}

export async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates or updates the user, and tries to start the one-time trial.
 * A device can claim one trial and an account can have one trial. The database enforces both,
 * so two simultaneous requests cannot create two trials.
 */
export async function ensureUserAndTrial(db, claims, deviceHash, now, trialDays) {
  const uid = claims.sub;
  await db.prepare(
    'INSERT INTO users(uid,email,name,created_at,last_seen) VALUES(?,?,?,?,?) ' +
    'ON CONFLICT(uid) DO UPDATE SET email=excluded.email,name=excluded.name,last_seen=excluded.last_seen'
  ).bind(uid, claims.email.toLowerCase(), claims.name || '', now, now).run();
  let u = await db.prepare('SELECT * FROM users WHERE uid=?').bind(uid).first();
  const trial = { claimed: false, reason: null };
  if (!u.trial_start) {
    const end = now + trialDays * 86400000;
    const res = await db.batch([
      db.prepare('INSERT OR IGNORE INTO trial_claims(device_id,uid,claimed_at) VALUES(?,?,?)').bind(deviceHash, uid, now),
      db.prepare('UPDATE users SET trial_start=?,trial_end=? WHERE uid=? AND trial_start IS NULL AND EXISTS(SELECT 1 FROM trial_claims WHERE device_id=? AND uid=?)').bind(now, end, uid, deviceHash, uid),
    ]);
    if (res[1].meta.changes === 1) trial.claimed = true; else trial.reason = 'device_already_used';
    u = await db.prepare('SELECT * FROM users WHERE uid=?').bind(uid).first();
  }
  return { user: u, trial };
}
