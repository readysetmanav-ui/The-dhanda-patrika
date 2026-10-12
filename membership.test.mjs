import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { membership, ensureUserAndTrial, verifyIdToken, sha256 } from "./logic.js";
const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync("./schema.sql", "utf8"));
const db = {
  prepare(q) { const st = sql.prepare(q); let args = [];
    const o = { bind(...a) { args = a; return o; },
      async run() { const r = st.run(...args); return { meta: { changes: Number(r.changes) } }; },
      async first() { return st.get(...args) ?? null; } };
    return o; },
  async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
};
const DAY = 86400000, t0 = Date.UTC(2026, 9, 12);
const A = { sub: "uidA", email: "A@gmail.com", name: "A" }, B = { sub: "uidB", email: "b@gmail.com", name: "B" };
const dev1 = await sha256("device1"), dev2 = await sha256("device2");
let r = await ensureUserAndTrial(db, A, dev1, t0, 30);
assert.equal(r.trial.claimed, true);
assert.equal(membership(r.user, t0 + 29 * DAY).status, "trial");
assert.equal(membership(r.user, t0 + 31 * DAY).status, "trial_expired");
let r2 = await ensureUserAndTrial(db, A, dev1, t0 + 5 * DAY, 30);
assert.equal(r2.trial.claimed, false); assert.equal(r2.user.trial_end, r.user.trial_end);
r = await ensureUserAndTrial(db, B, dev1, t0 + DAY, 30);
assert.equal(r.trial.reason, "device_already_used");
r = await ensureUserAndTrial(db, B, dev2, t0 + 2 * DAY, 30);
assert.equal(r.trial.claimed, true);
assert.equal(membership({ trial_end: t0 - 1, paid_until: t0 + DAY, free_access: "none" }, t0).status, "paid");
assert.equal(membership({ trial_end: t0 - 1, free_access: "approved" }, t0).status, "free_approved");
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1" };
const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
async function mk(c, kid = "k1") { const h = enc({ alg: "RS256", kid }), p = enc(c);
  const s = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(h + "." + p))).toString("base64url"); return h + "." + p + "." + s; }
const now = 1800000000, P = "the-dhanda-patrika";
const good = { aud: P, iss: "https://securetoken.google.com/" + P, sub: "u", email: "x@gmail.com", email_verified: true, iat: now - 10, exp: now + 3000 };
assert.equal((await verifyIdToken(await mk(good), P, now, [jwk])).sub, "u");
for (const bad of [{ aud: "o" }, { iss: "x" }, { exp: now - 1 }, { email_verified: false }, { iat: now + 999 }])
  await assert.rejects(verifyIdToken(await mk({ ...good, ...bad }), P, now, [jwk]));
console.log("All tests passed");
