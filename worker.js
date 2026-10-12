import { verifyIdToken, membership, sha256, ensureUserAndTrial } from './logic.js';

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });

function cookieValue(header, name) {
  for (const part of (header || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

function newDeviceId() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (url.pathname === '/api/me' && request.method === 'GET') {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
      const now = Date.now();
      let claims;
      try { claims = await verifyIdToken(token, env.FIREBASE_PROJECT_ID, Math.floor(now / 1000)); }
      catch (e) { return json({ error: 'unauthorized' }, 401); }

      // Random device code kept in a first-party cookie. Only a hash of it is stored.
      let dev = cookieValue(request.headers.get('Cookie'), 'dp_dev');
      if (!/^[A-Za-z0-9_-]{30,64}$/.test(dev)) dev = newDeviceId();
      const cookie = `dp_dev=${dev}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`;

      const days = parseInt(env.TRIAL_DAYS || '30', 10);
      const { user, trial } = await ensureUserAndTrial(env.DB, claims, await sha256(dev), now, days);
      const m = membership(user, now);
      return json({
        user: { name: user.name || '', email: user.email },
        membership: { status: m.status, premium: m.premium, until: m.until, trialEnd: m.trialEnd },
        trial,
      }, 200, { 'Set-Cookie': cookie });
    }
    return json({ error: 'not found' }, 404);
  },
};
