// Sign-in button. Runs ONLY on the Cloudflare address, so the GitHub Pages site is never affected.
if (location.hostname.endsWith(".workers.dev")) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const auth = getAuth(initializeApp(window.DP_FIREBASE_CONFIG));
  const b = document.createElement("button");
  b.id = "dpauth";
  b.style.cssText = "position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));font-size:13px;padding:6px 10px;z-index:9;max-width:70vw";
  document.body.appendChild(b);

  const days = (ms) => Math.max(1, Math.ceil((ms - Date.now()) / 86400000));
  const label = (d) => {
    const m = d.membership;
    if (m.status === "trial") return "Free trial: " + days(m.until) + " days left";
    if (m.status === "paid") return "Member";
    if (m.status === "free_approved") return "Member (free access)";
    if (m.status === "trial_expired") return "Trial ended";
    if (d.trial && d.trial.reason === "device_already_used") return "Trial already used on this device";
    return "Signed in";
  };

  onAuthStateChanged(auth, async (u) => {
    window.dpMembership = null;
    if (!u) {
      b.textContent = "Sign in with Google";
      b.onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {});
      return;
    }
    b.textContent = "Checking…";
    b.onclick = () => signOut(auth);
    try {
      const r = await fetch("/api/me", { headers: { Authorization: "Bearer " + (await u.getIdToken()) } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      window.dpMembership = d;
      document.dispatchEvent(new CustomEvent("dp-membership", { detail: d }));
      b.textContent = label(d) + " · Sign out";
    } catch (e) { b.textContent = "Could not check · Sign out"; }
  });
}
