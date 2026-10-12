// The Dhanda Patrika: subscription pop-up, Google sign-in, profile bar and the Proprietor's admin desk.
// Runs ONLY on the Cloudflare address (workers.dev). index.html is not touched.
if (location.hostname.endsWith(".workers.dev")) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  /* ================= SETTINGS: the only part you may ever need to change ================= */
  const PRICE = { monthlyWas: 149, monthlyNow: 49, yearlyNow: 499 }; // rupees
  const PAY_EMAIL = ""; // put the email readers should write to in order to pay, e.g. "me@gmail.com". Empty = "payments open soon".
  /* ====================================================================================== */

  const yearlyWas = PRICE.monthlyWas * 12;                                              // 1788
  const pctM = Math.round((1 - PRICE.monthlyNow / PRICE.monthlyWas) * 100);              // 67
  const pctY = Math.round((1 - PRICE.yearlyNow / yearlyWas) * 100);                      // 72
  const permonth = Math.round(PRICE.yearlyNow / 12);                                     // 42
  const rs = (n) => "₹" + n.toLocaleString("en-IN");

  const EN = {
    kick: "HEAR YE! HEAR YE!",
    newT: "Thy First Month Is On The House",
    newS: "Read the whole Patrika free for 30 days. No card. No payment. No catch (we checked twice).",
    endT: "Thy Free Month Hath Ended",
    endS: "Thank thee for reading! Subscribe to keep the Patrika coming to thee.",
    devT: "Free Month Already Taken Here",
    devS: "This device has already used its free month. Subscribe to keep reading.",
    plansT: "Our Humble Prices",
    plansS: "Thy free month keeps running. Subscribe whenever thou wishest.",
    monthly: "Monthly", yearly: "Yearly", perM: "/ month", perY: "/ year",
    offM: pctM + "% off for new readers",
    offY: pctY + "% off, only " + rs(permonth) + " a month",
    best: "BEST BARGAIN",
    sums: "The sums: " + rs(PRICE.monthlyWas) + " − " + rs(PRICE.monthlyWas - PRICE.monthlyNow) + " = " + rs(PRICE.monthlyNow) + " (" + pctM + "% off). 12 × " + rs(PRICE.monthlyWas) + " = " + rs(yearlyWas) + ", now " + rs(PRICE.yearlyNow) + " (" + pctY + "% off).",
    cta: "Sign in with Google to start thy free month",
    fine: "After the free month: " + rs(PRICE.monthlyNow) + " a month or " + rs(PRICE.yearlyNow) + " a year. Nothing is charged by itself, and thou shalt be told well before.",
    peek: "Not now, let me peek",
    payWrite: "Write to the Proprietor to subscribe",
    paySoon: "Payments open very soon. Thou shalt be told.",
    hook: "First month free ✦",
    signIn: "Sign in", signOut: "Sign out", plans: "See prices",
    checking: "Checking…", err: "Could not check. Refresh to try again.", signed: "Signed in",
    trial: (d) => "Free trial: " + d + (d === 1 ? " day left" : " days left"),
    member: "Member", memberFree: "Member (free access)", ended: "Trial ended", used: "Trial used on this device",
    opening: "Opening Google…", cancel: "Sign-in was cancelled. Please try again.", fail: "Sign-in did not work. Please try again.",
    close: "Close", admin: "Proprietor's desk",
  };
  const HI = {
    kick: "सुनिए, सुनिए!",
    newT: "पहला महीना हमारी तरफ़ से",
    newS: "30 दिन पूरी पत्रिका मुफ़्त पढ़िए। न कार्ड, न भुगतान, न कोई शर्त (हमने दो बार जाँचा)।",
    endT: "आपका मुफ़्त महीना पूरा हुआ",
    endS: "पढ़ने के लिए धन्यवाद! पत्रिका आपके पास आती रहे, इसके लिए सदस्यता लीजिए।",
    devT: "इस उपकरण पर मुफ़्त महीना लिया जा चुका",
    devS: "इस उपकरण पर मुफ़्त महीना पहले इस्तेमाल हो चुका है। पढ़ते रहने के लिए सदस्यता लीजिए।",
    plansT: "हमारे विनम्र दाम",
    plansS: "आपका मुफ़्त महीना चल रहा है। जब चाहें सदस्यता लीजिए।",
    monthly: "मासिक", yearly: "सालाना", perM: "/ महीना", perY: "/ साल",
    offM: "नए पाठकों के लिए " + pctM + "% छूट",
    offY: pctY + "% छूट, सिर्फ़ " + rs(permonth) + " महीना",
    best: "सबसे बढ़िया सौदा",
    sums: "हिसाब: " + rs(PRICE.monthlyWas) + " − " + rs(PRICE.monthlyWas - PRICE.monthlyNow) + " = " + rs(PRICE.monthlyNow) + " (" + pctM + "% छूट)। 12 × " + rs(PRICE.monthlyWas) + " = " + rs(yearlyWas) + ", अब " + rs(PRICE.yearlyNow) + " (" + pctY + "% छूट)।",
    cta: "मुफ़्त महीना शुरू करने के लिए Google से साइन इन करें",
    fine: "मुफ़्त महीने के बाद: " + rs(PRICE.monthlyNow) + " महीना या " + rs(PRICE.yearlyNow) + " साल। अपने आप कुछ नहीं कटता, और बदलाव से काफ़ी पहले बताया जाएगा।",
    peek: "अभी नहीं, बस झाँकने दीजिए",
    payWrite: "सदस्यता के लिए संचालक को लिखिए",
    paySoon: "भुगतान जल्द खुलेंगे। आपको बताया जाएगा।",
    hook: "पहला महीना मुफ़्त ✦",
    signIn: "साइन इन", signOut: "साइन आउट", plans: "दाम देखें",
    checking: "जाँच हो रही है…", err: "जाँच नहीं हो सकी। पेज रीफ़्रेश कीजिए।", signed: "साइन इन है",
    trial: (d) => "मुफ़्त परीक्षण: " + d + " दिन बाक़ी",
    member: "सदस्य", memberFree: "सदस्य (मुफ़्त पहुँच)", ended: "परीक्षण समाप्त", used: "इस उपकरण पर परीक्षण हो चुका",
    opening: "Google खुल रहा है…", cancel: "साइन इन रद्द हुआ। कृपया फिर कोशिश करें।", fail: "साइन इन नहीं हो सका। कृपया फिर कोशिश करें।",
    close: "बंद करें", admin: "संचालक की मेज़",
  };
  const T = () => (document.documentElement.lang === "hi" ? HI : EN);

  /* ---------- tiny helpers ---------- */
  const $ = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e[k] = v;
      else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c != null && e.append(c));
    return e;
  };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const days = (ms) => Math.max(1, Math.ceil((ms - Date.now()) / 86400000));
  const dateOf = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  /* ---------- styles (use the page's own colours, so day/lamp mode just works) ---------- */
  document.head.append($("style", { text: `
#notice{display:none!important}
#dpbar{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:880px;margin:0 auto 8px;padding:2px 2px 8px;border-bottom:1px solid var(--ink);position:sticky;top:env(safe-area-inset-top,0px);z-index:8;background:var(--paper);font-size:14px}
#dpbar .dpst{font-style:italic;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.dpwrap{position:relative;flex:none}
.dpchip{display:flex;align-items:center;gap:7px;font-size:14px;padding:4px 10px 4px 5px;max-width:52vw;background:var(--card);color:var(--ink);box-shadow:2px 2px 0 var(--ink)}
.dpchip.plain{padding:5px 12px;background:var(--red);color:var(--card)}
.dpav{width:24px;height:24px;border-radius:50%;background:var(--red);color:var(--card);display:grid;place-items:center;font:900 13px "Playfair Display",serif;flex:none}
.dpnm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#dpmenu{position:absolute;right:0;top:calc(100% + 6px);width:min(260px,86vw);background:var(--card);color:var(--ink);border:3px double var(--ink);box-shadow:4px 4px 0 var(--ink);padding:10px 12px;z-index:12;text-align:left}
#dpmenu b{display:block;font:900 16px "Playfair Display",serif;overflow-wrap:anywhere}
#dpmenu small{display:block;color:var(--mut);overflow-wrap:anywhere}
#dpmenu .dpsts{font-style:italic;margin:6px 0 8px;color:var(--blue)}
#dpmenu button{display:block;width:100%;margin-top:6px;font-size:14px;padding:7px 10px;text-align:center}
#dpmod{position:fixed;inset:0;z-index:50;background:rgba(20,12,4,.62);display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(12px,env(safe-area-inset-bottom,0px));overflow:auto}
.dpcard{position:relative;width:min(100%,560px);max-height:100%;overflow:auto;background:var(--paper);color:var(--ink);border:5px double var(--ink);box-shadow:8px 8px 0 var(--ink);padding:24px 18px 16px;text-align:center;animation:dppop .5s cubic-bezier(.3,1.4,.5,1)}
.dpcard.wide{width:min(100%,680px);text-align:left}
@keyframes dppop{from{transform:scale(.88) rotate(-1.5deg);opacity:0}}
@keyframes dpbl{50%{opacity:.35}}
.dpx{position:absolute;top:6px;right:8px;background:none;border:0;box-shadow:none;color:var(--ink);font:900 22px/1 "Playfair Display",serif;padding:6px 10px}
.dpx:active{transform:none;box-shadow:none}
.dpk{font:900 13px "Playfair Display",serif;letter-spacing:4px;color:var(--red);animation:dpbl 1.4s steps(2) infinite}
.dpt{font:900 clamp(25px,6.5vw,36px)/1.1 "Playfair Display",Georgia,serif;margin:6px 0 8px}
.dps{font-style:italic;margin:0 0 14px;font-size:17px;line-height:1.45}
.dpplans{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:8px 0 8px}
.dpplan{position:relative;border:2px solid var(--ink);outline:1px solid var(--ink);outline-offset:3px;background:var(--card);padding:16px 10px 12px;margin:4px}
.dpplan.best{border-color:var(--red);outline-color:var(--red)}
.dpplan h3{font:900 16px "Playfair Display",serif;font-variant:small-caps;letter-spacing:1px;color:var(--red);margin:0 0 2px}
.dpwas{display:block;text-decoration:line-through;text-decoration-color:var(--red);text-decoration-thickness:2px;color:var(--mut);font-size:20px}
.dpnow{font:900 clamp(34px,9vw,46px)/1.05 "Playfair Display",serif}
.dpnow small{font:italic 400 15px "IM Fell English",Georgia,serif;color:var(--mut)}
.dptag{display:block;font-size:15px;font-style:italic;margin-top:6px;color:var(--blue)}
.dpribbon{position:absolute;top:-13px;right:-6px;transform:rotate(5deg);background:var(--red);color:var(--card);font:900 11px "Playfair Display",serif;letter-spacing:1px;padding:3px 8px;border:2px solid var(--ink)}
.dpsum{font-size:13.5px;font-style:italic;color:var(--mut);margin:8px 0 14px;line-height:1.4}
.dpcta{font-size:18px;padding:13px 16px;width:100%;box-shadow:5px 5px 0 var(--ink);line-height:1.25}
.dpcta[disabled]{opacity:.6}
.dppay{border:2px dashed var(--red);padding:10px;font-style:italic}
.dpfine{font-size:13px;color:var(--mut);font-style:italic;margin:10px 0 0;line-height:1.4}
.dpmsg{min-height:1.3em;color:var(--red);font-style:italic;margin:8px 0 0;font-size:15px}
.dppeek{background:none;border:0;box-shadow:none;color:var(--mut);text-decoration:underline;font:italic 400 15px "IM Fell English",Georgia,serif;margin-top:4px;padding:8px}
.dppeek:active{transform:none;box-shadow:none}
.dpadd{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.dpadd input{flex:1 1 200px;min-width:0;font:400 16px "IM Fell English",Georgia,serif;padding:9px 10px;border:2px solid var(--ink);background:var(--paper);color:var(--ink)}
.dpper{border-bottom:1px dotted var(--ink);padding:9px 0}
.dpper b{font:900 16px "Playfair Display",serif;overflow-wrap:anywhere}
.dpper small{display:block;color:var(--mut);overflow-wrap:anywhere}
.dpper i{display:block;color:var(--blue);margin:2px 0 6px}
.dpbtns{display:flex;flex-wrap:wrap;gap:6px}
.dpbtns button{font-size:13px;padding:4px 9px;box-shadow:2px 2px 0 var(--ink)}
.dplegend{font-size:14px;font-style:italic;color:var(--mut);line-height:1.4}
html[lang="hi"] #dpbar *,html[lang="hi"] #dpmod *,html[lang="hi"] #dpmenu *{font-family:"Tiro Devanagari Hindi","Noto Serif Devanagari","Nirmala UI",serif;font-style:normal!important;letter-spacing:0!important}
` }));

  /* ---------- state ---------- */
  const auth = getAuth(initializeApp(window.DP_FIREBASE_CONFIG));
  let user = null, info = null, checking = false, mode = null, timer = null, menuOpen = false;
  const premium = () => !!(info && info.membership && info.membership.premium);

  const statusLabel = () => {
    const t = T();
    if (checking) return t.checking;
    if (!info) return t.err;
    const m = info.membership;
    if (m.status === "trial") return t.trial(days(m.until));
    if (m.status === "paid") return t.member;
    if (m.status === "free_approved") return t.memberFree;
    if (info.trial && info.trial.reason === "device_already_used") return t.used;
    if (m.status === "trial_expired") return t.ended;
    return t.signed;
  };

  /* ---------- top bar with the profile ---------- */
  const bar = $("div", { id: "dpbar" });
  const app = document.getElementById("app");
  app.parentNode.insertBefore(bar, app);

  function renderBar() {
    const t = T();
    bar.replaceChildren();
    const left = $("span", { class: "dpst", text: user ? statusLabel() : t.hook });
    const wrap = $("div", { class: "dpwrap" });
    if (!user) {
      wrap.append($("button", { class: "dpchip plain", text: t.signIn, onclick: () => openModal("new") }));
    } else {
      const name = (info && info.user && info.user.name) || user.displayName || (user.email || "").split("@")[0] || "Reader";
      const first = name.trim().split(/\s+/)[0];
      wrap.append($("button", { class: "dpchip", "aria-haspopup": "true", "aria-expanded": String(menuOpen),
        onclick: (e) => { e.stopPropagation(); menuOpen = !menuOpen; renderBar(); } },
        $("span", { class: "dpav", text: first.charAt(0).toUpperCase() }), $("span", { class: "dpnm", text: first })));
      if (menuOpen) {
        const menu = $("div", { id: "dpmenu", onclick: (e) => e.stopPropagation() },
          $("b", { text: name }), $("small", { text: (info && info.user && info.user.email) || user.email || "" }),
          $("div", { class: "dpsts", text: statusLabel() }));
        if (info && info.isAdmin) menu.append($("button", { text: t.admin, onclick: () => { menuOpen = false; renderBar(); openAdmin(); } }));
        if (info && !premium()) menu.append($("button", { text: t.plans, onclick: () => { menuOpen = false; renderBar(); openModal("ended"); } }));
        else if (info && info.membership.status === "trial") menu.append($("button", { text: t.plans, onclick: () => { menuOpen = false; renderBar(); openModal("plans"); } }));
        menu.append($("button", { text: t.signOut, onclick: () => { menuOpen = false; signOut(auth); } }));
        wrap.append(menu);
      }
    }
    bar.append(left, wrap);
  }
  document.addEventListener("click", () => { if (menuOpen) { menuOpen = false; renderBar(); } });

  /* ---------- the pop-up shell ---------- */
  let modEl = null;
  function closeModal() {
    if (modEl) { modEl.remove(); modEl = null; }
    mode = null;
    document.body.style.overflow = "";
  }
  function dismiss() { ss.set("dp-dismissed", "1"); closeModal(); }
  function showShell(label, wide, kids) {
    closeModal();
    const t = T();
    const card = $("div", { class: "dpcard" + (wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": label },
      $("button", { class: "dpx", "aria-label": t.close, text: "✕", onclick: dismiss }), kids);
    modEl = $("div", { id: "dpmod", onclick: (e) => { if (e.target === modEl) dismiss(); } }, card);
    document.body.append(modEl);
    document.body.style.overflow = "hidden";
    return card;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modEl) dismiss(); });

  /* ---------- Google sign-in ---------- */
  async function doSignIn(btn, msg) {
    const t = T();
    btn.disabled = true; msg.textContent = t.opening;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      msg.textContent = "";
    } catch (e) {
      const c = e && e.code;
      if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") {
        try { await signInWithRedirect(auth, new GoogleAuthProvider()); return; } catch (_) {}
      }
      msg.textContent = c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request" ? t.cancel : t.fail;
    }
    btn.disabled = false;
  }

  /* ---------- subscription pop-up ---------- */
  function openModal(which) {
    const t = T();
    const titles = { new: [t.newT, t.newS], ended: [t.endT, t.endS], device: [t.devT, t.devS], plans: [t.plansT, t.plansS] };
    const [title, sub] = titles[which];
    const plans = $("div", { class: "dpplans" },
      $("div", { class: "dpplan" },
        $("h3", { text: t.monthly }), $("span", { class: "dpwas", text: rs(PRICE.monthlyWas) }),
        $("div", { class: "dpnow" }, rs(PRICE.monthlyNow) + " ", $("small", { text: t.perM })),
        $("span", { class: "dptag", text: t.offM })),
      $("div", { class: "dpplan best" },
        $("span", { class: "dpribbon", text: t.best }),
        $("h3", { text: t.yearly }), $("span", { class: "dpwas", text: rs(yearlyWas) }),
        $("div", { class: "dpnow" }, rs(PRICE.yearlyNow) + " ", $("small", { text: t.perY })),
        $("span", { class: "dptag", text: t.offY })));
    const msg = $("p", { class: "dpmsg", role: "status" });
    let action;
    if (which === "new") {
      action = $("button", { class: "dpcta", text: t.cta });
      action.onclick = () => doSignIn(action, msg);
    } else if (PAY_EMAIL) {
      action = $("a", { class: "dpcta", href: "mailto:" + PAY_EMAIL + "?subject=Dhanda%20Patrika%20subscription",
        style: "display:block;text-align:center;text-decoration:none;font:700 18px 'Playfair Display',serif;background:var(--red);color:var(--card);border:2px solid var(--ink);padding:13px 16px;box-shadow:5px 5px 0 var(--ink)",
        text: t.payWrite });
    } else {
      action = $("div", { class: "dppay", text: t.paySoon });
    }
    const card = showShell(title, false, [
      $("div", { class: "dpk", text: t.kick }),
      $("h2", { class: "dpt", text: title }),
      $("p", { class: "dps", text: sub }),
      plans,
      $("p", { class: "dpsum", text: t.sums }),
      action, msg,
      which === "new" ? $("p", { class: "dpfine", text: t.fine }) : null,
      which !== "plans" ? $("button", { class: "dppeek", text: t.peek, onclick: dismiss }) : null,
    ]);
    mode = which;
    const first = card.querySelector(".dpcta");
    if (first && first.focus) first.focus({ preventScroll: true });
  }

  /* ---------- the Proprietor's admin desk (only for the admin email) ---------- */
  async function adminCall(path, body) {
    const tok = await auth.currentUser.getIdToken();
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer " + tok, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
  }
  const personStatus = (p) => {
    let s;
    if (!p.signedUp) s = p.allow === "approved" ? "Approved, waiting for them to sign in" : "Marked denied, not signed in yet";
    else if (p.status === "free_approved") s = "Free forever (approved)";
    else if (p.status === "paid") s = "Paid until " + dateOf(p.until);
    else if (p.status === "trial") s = "Free trial until " + dateOf(p.until);
    else if (p.status === "trial_expired") s = "Trial ended, not paid";
    else s = "No trial started";
    if (p.signedUp && p.allow === "denied") s += " · marked denied";
    return s;
  };
  function openAdmin() {
    const list = $("div", {});
    const msg = $("p", { class: "dpmsg", role: "status" });
    const email = $("input", { type: "email", placeholder: "family@gmail.com", "aria-label": "Email to approve" });
    const say = (s) => { msg.textContent = s; };
    async function act(addr, action) {
      say("Working…");
      const r = await adminCall("/api/admin/set", { email: addr, action });
      if (r.ok) { say("Done."); await load(); }
      else say(r.data.error === "not_signed_up" ? "That person must sign in once before you can mark them paid."
             : r.data.error === "bad_email" ? "That email looks wrong." : "Something went wrong. Try again.");
    }
    async function load() {
      const r = await adminCall("/api/admin/list");
      if (!r.ok) { say("Could not load the list. Refresh and try again."); return; }
      list.replaceChildren();
      const people = r.data.people || [];
      if (!people.length) list.append($("p", { class: "dplegend", text: "No one yet. People appear here after they sign in." }));
      people.forEach((p) => {
        const btn = (label, action) => $("button", { text: label, onclick: () => act(p.email, action) });
        list.append($("div", { class: "dpper" },
          $("b", { text: p.name || p.email }), p.name ? $("small", { text: p.email }) : null,
          $("i", { text: personStatus(p) }),
          $("div", { class: "dpbtns" }, btn("Approve free", "approve"), btn("Deny", "deny"), btn("Reset", "reset"),
            btn("Paid 30 days", "paid30"), btn("Paid 1 year", "paid365"), btn("Unpaid", "unpaid"))));
      });
    }
    showShell(T().admin, true, [
      $("h2", { class: "dpt", text: "The Proprietor's Desk" }),
      $("p", { class: "dplegend", text: "Approve free = free forever (family and friends). Deny or Reset = normal rules (trial, then pay). Paid 30 days or Paid 1 year = mark someone who has paid." }),
      $("div", { class: "dpadd" }, email, $("button", { text: "Approve free", onclick: () => { const v = email.value.trim(); if (v) { act(v, "approve"); email.value = ""; } } })),
      msg, list,
    ]);
    mode = "admin";
    load();
  }

  /* ---------- when to show the pop-up on its own ---------- */
  const dismissed = () => ss.get("dp-dismissed") === "1";
  function autoPopup() {
    if (!info || premium() || dismissed()) return;
    openModal(info.trial && info.trial.reason === "device_already_used" ? "device" : "ended");
  }

  getRedirectResult(auth).catch(() => {});
  onAuthStateChanged(auth, async (u) => {
    user = u; info = null; window.dpMembership = null; clearTimeout(timer); menuOpen = false;
    if (!u) {
      checking = false; renderBar();
      if (mode && mode !== "new") closeModal();
      timer = setTimeout(() => { if (!user && !dismissed() && !mode) openModal("new"); }, 1800); // after the masthead settles
      return;
    }
    checking = true; renderBar();
    if (mode === "new") closeModal();
    try {
      const r = await fetch("/api/me", { headers: { Authorization: "Bearer " + (await u.getIdToken()) } });
      if (!r.ok) throw new Error();
      info = await r.json();
      window.dpMembership = info;
      document.dispatchEvent(new CustomEvent("dp-membership", { detail: info }));
    } catch (e) { info = null; }
    checking = false; renderBar();
    autoPopup();
  });

  // Hindi / English toggle on the page also switches the bar and the pop-up
  new MutationObserver(() => { renderBar(); if (mode && mode !== "admin") openModal(mode); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}
