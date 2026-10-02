/* 18 Axes — Philosophical Orientation: quiz engine, scoring, matching, PNG */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const views = { landing: $("view-landing"), quiz: $("view-quiz"), results: $("view-results") };
  const LS_KEY = "phil18-progress", THEME_KEY = "phil18-theme";
  const N_AXES = AXES.length;

  // Presentation order: round-robin across axes (r-th question of each axis)
  const PER_AXIS = QUESTIONS.length / N_AXES;
  const ORDER = [];
  for (let r = 0; r < PER_AXIS; r++) for (let a = 0; a < N_AXES; a++) ORDER.push(a * PER_AXIS + r);

  const state = { pos: 0, answers: new Array(QUESTIONS.length).fill(null) };
  let lastScores = null;
  const activeSchools = new Set(["analytic", "post-analytic", "modern", "ancient", "medieval", "continental", "living"]);

  function show(name) {
    for (const k in views) views[k].classList.toggle("hidden", k !== name);
    window.scrollTo(0, 0);
  }

  // ---- theme ----
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    $("btn-theme").textContent = t === "light" ? "☾ Dark" : "☀ Light";
  }
  let theme = "dark";
  try { theme = localStorage.getItem(THEME_KEY) || "dark"; } catch (_) {}
  applyTheme(theme);
  $("btn-theme").addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));

  // ---- landing ----
  $("axis-preview").innerHTML = AXES.map(
    (a, i) => `<button class="axis-card" data-i="${i}" aria-expanded="false">
      <span class="ac-top"><span class="ac-poles">${a.left} ↔ ${a.right}</span><span class="ac-tag">${a.tag}</span></span>
      <span class="ac-desc">${a.desc}</span>
      <span class="ac-mini" aria-hidden="true"><i></i><i></i></span>
    </button>`
  ).join("");
  document.querySelectorAll("#axis-preview .axis-card").forEach((c) => {
    c.addEventListener("click", () => {
      const open = c.classList.toggle("open");
      c.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  $("quiz-meta").textContent = `${QUESTIONS.length} questions · ${N_AXES} axes · ${PHILOSOPHERS.length} thinkers`;
  const st = $("stat-thinkers");
  if (st) st.textContent = PHILOSOPHERS.length;

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ answers: state.answers, pos: state.pos })); } catch (_) {}
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY));
      if (d && Array.isArray(d.answers) && d.answers.length === QUESTIONS.length) return d;
    } catch (_) {}
    return null;
  }
  function clearSave() { try { localStorage.removeItem(LS_KEY); } catch (_) {} }
  function refreshResume() {
    const d = load();
    const has = d && d.pos > 0 && d.pos < ORDER.length;
    $("btn-resume").classList.toggle("hidden", !has);
    if (has) $("btn-resume").textContent = `Resume (Q ${d.pos + 1}/${ORDER.length})`;
  }
  refreshResume();

  $("btn-start").addEventListener("click", () => {
    state.pos = 0; state.answers = new Array(QUESTIONS.length).fill(null);
    clearSave(); history.replaceState(null, "", location.pathname);
    renderQ(); show("quiz");
  });
  $("btn-resume").addEventListener("click", () => {
    const d = load(); if (!d) return;
    state.answers = d.answers; state.pos = d.pos;
    renderQ(); show("quiz");
  });

  // ---- quiz ----
  $("btn-back").addEventListener("click", goBack);
  function goBack() { if (state.pos > 0) { state.pos--; save(); renderQ(); } }

  document.querySelectorAll(".axis-dot").forEach((btn) => {
    btn.addEventListener("click", () => answer(parseInt(btn.dataset.val, 10), btn));
  });
  document.addEventListener("keydown", (e) => {
    if (views.quiz.classList.contains("hidden")) return;
    if (e.key >= "1" && e.key <= "5") {
      const v = parseInt(e.key, 10) - 3; // 1→−2 (strongly disagree) … 5→+2 (strongly agree)
      const btn = document.querySelector(`.axis-dot[data-val="${v}"]`);
      answer(v, btn || undefined);
    }
    else if (e.key === "Backspace" || e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
  });
  let advanceTimer = null;
  function answer(val, btn) {
    if (advanceTimer) return; // ignore rapid double taps
    if (btn) btn.classList.add("picked");
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      state.answers[ORDER[state.pos]] = val;
      state.pos++;
      save();
      if (state.pos >= ORDER.length) { clearSave(); finish(); }
      else renderQ();
    }, 130);
  }

  function renderQ() {
    const q = QUESTIONS[ORDER[state.pos]];
    const ax = AXES[q.axis];
    document.querySelectorAll(".axis-dot.picked").forEach((b) => b.classList.remove("picked"));
    $("q-counter").textContent = `Question ${state.pos + 1}/${ORDER.length}`;
    const pct = Math.round((state.pos / ORDER.length) * 100);
    $("q-progress").style.width = `${pct}%`;
    const qp = $("q-pct");
    if (qp) qp.textContent = `${pct}%`;
    $("q-axis").textContent = `${ax.tag} · ${q.axis + 1}/${N_AXES}`;
    $("q-text").textContent = q.text;
    $("btn-back").style.visibility = state.pos === 0 ? "hidden" : "visible";
  }

  // ---- scoring ----
  function scoreAll(answers) {
    const sums = new Array(N_AXES).fill(0);
    const counts = new Array(N_AXES).fill(0);
    QUESTIONS.forEach((q, i) => {
      const a = answers[i];
      if (a === null || a === undefined) return;
      sums[q.axis] += a * q.polarity;
      counts[q.axis] += 1;
    });
    return sums.map((s, ax) => {
      const n = counts[ax] || PER_AXIS;
      return Math.round(((s + 2 * n) / (4 * n)) * 100);
    });
  }

  function finish() {
    lastScores = scoreAll(state.answers);
    history.replaceState(null, "", `${location.pathname}?v=3&s=${lastScores.join(",")}`);
    renderResults(lastScores);
    show("results");
  }

  // ---- results ----
  function labelFor(ax, leftPct) {
    if (leftPct >= 65) return ax.left;
    if (leftPct <= 35) return ax.right;
    return "Balanced";
  }

  function matchPhilosophers(scores, schools) {
    const pool = PHILOSOPHERS.filter((p) => !schools || schools.has(p.school));
    const maxDist = Math.sqrt(N_AXES * 100 * 100);
    return pool.map((p) => {
      const diffs = p.v.map((v, i) => ({ i, d: Math.abs(v - scores[i]), pv: v }));
      const d = Math.sqrt(diffs.reduce((acc, x) => acc + x.d * x.d, 0));
      const sorted = [...diffs].sort((a, b) => a.d - b.d);
      return { ...p, sim: Math.round((1 - d / maxDist) * 100),
               agree: sorted.slice(0, 3), disagree: sorted[sorted.length - 1] };
    }).sort((a, b) => b.sim - a.sim).slice(0, 5);
  }

  function renderResults(scores) {
    lastScores = scores;
    const arch = ARCHETYPES.find((a) => { try { return a.test(scores); } catch (_) { return false; } });
    const topEarly = matchPhilosophers(scores, null).slice(0, 2);
    $("archetype-card").innerHTML = `<div class="seal">❦</div><div><h3>${arch.name}</h3><p>${arch.desc}</p>
      <p class="arch-match">Closest overall: <strong>${topEarly[0].name} (${topEarly[0].sim}%)</strong> · runner-up ${topEarly[1].name} (${topEarly[1].sim}%)</p></div>`;

    const strong = scores.filter((s) => s >= 65 || s <= 35).length;
    const rs = $("results-summary");
    if (rs) rs.textContent = `${strong}/${N_AXES} axes with a firm lean · tap a card for its question`;

    $("bars").innerHTML = AXES.map((ax, i) => {
      const L = scores[i], R = 100 - L;
      const lean = labelFor(ax, L);
      const cls = lean === "Balanced" ? "" : (L > 50 ? "l" : "r");
      return `<button class="bar-card" data-i="${i}" aria-expanded="false">
        <span class="bc-head"><span class="bc-tag">${ax.tag}</span><span class="bc-lean ${cls}">${lean}</span></span>
        <span class="bc-poles"><span class="pct">${L}%</span> ${ax.left} · ${ax.right} <span class="pct">${R}%</span></span>
        <span class="bc-track" aria-hidden="true">
          <span class="bc-left" data-w="${L}" style="width:0%"></span>
          <span class="bc-right" data-w="${R}" style="width:0%"></span>
        </span>
        <span class="bc-ratio" aria-hidden="true"><span>${L}</span><span>${R}</span></span>
        <span class="bc-desc">${ax.desc}</span>
      </button>`;
    }).join("");
    document.querySelectorAll("#bars .bar-card").forEach((c) => {
      c.addEventListener("click", () => {
        c.classList.toggle("pinned");
        c.setAttribute("aria-expanded", c.classList.contains("pinned") ? "true" : "false");
      });
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll("#bars .bc-left, #bars .bc-right").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
    }));

    drawRadar(scores);
    renderChips();
    renderPhils();
    renderReadings(scores);
    $("copy-hint").textContent = "";
  }

  function renderChips() {
    const schools = [...new Set(PHILOSOPHERS.map((p) => p.school))];
    $("school-chips").innerHTML = schools.map((s) =>
      `<button class="chip${activeSchools.has(s) ? " on" : ""}" data-s="${s}">${s}</button>`).join("");
    document.querySelectorAll("#school-chips .chip").forEach((c) => {
      c.addEventListener("click", () => {
        const s = c.dataset.s;
        if (activeSchools.has(s)) { if (activeSchools.size > 1) activeSchools.delete(s); }
        else activeSchools.add(s);
        renderChips(); renderPhils();
      });
    });
  }

  function renderPhils() {
    if (!lastScores) return;
    const top = matchPhilosophers(lastScores, activeSchools);
    $("phils").innerHTML = top.map((p, rank) => {
      const ag = p.agree.map((x) => {
        const ax = AXES[x.i];
        const side = lastScores[x.i] >= 50 ? ax.left : ax.right;
        return `${ax.tag} (${side} · Δ${x.d})`;
      }).join(" · ");
      const dax = AXES[p.disagree.i];
      return `<div class="phil"><span class="phil-rank">#${rank + 1}</span><strong>${p.name} <span class="sim">${p.sim}%</span></strong>
        <span>${p.era} · ${p.school}</span>
        <span class="why">✓ ${ag}</span>
        <span class="why dim">✗ biggest gap: ${dax.tag} (you ${lastScores[p.disagree.i]} · them ${p.disagree.pv})</span>
      </div>`;
    }).join("");
  }

  function renderReadings(scores) {
    const extreme = scores.map((s, i) => ({ i, x: Math.abs(s - 50) }))
      .sort((a, b) => b.x - a.x).slice(0, 3);
    $("readings").innerHTML = "<h3>Your reading list</h3><p class=\"hint\">Entry points keyed to your most extreme axes.</p><div class=\"readings-grid\">" +
      extreme.map(({ i }) => {
        const ax = AXES[i];
        const lean = labelFor(ax, scores[i]);
        const items = READINGS[i].map((r) => `<li><em>${r.t}</em> — ${r.a} <span class="why">(${r.w})</span></li>`).join("");
        return `<div class="reading"><strong>${ax.tag}: you lean ${lean} (${scores[i]}%)</strong><ul>${items}</ul></div>`;
      }).join("") + "</div>";
  }

  // ---- radar ----
  function drawRadar(scores) {
    const cv = $("radar"), ctx = cv.getContext("2d");
    const box = cv.parentElement.getBoundingClientRect();
    const S = Math.max(240, Math.min(360, Math.floor(box.width) || 340));
    const dpr = window.devicePixelRatio || 1;
    cv.width = S * dpr; cv.height = S * dpr;
    cv.style.width = S + "px"; cv.style.height = S + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = S / 2, cy = S / 2, R = S / 2 - 34;
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const ink = css("--ink"), mut = css("--muted");
    ctx.clearRect(0, 0, S, S);
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      ctx.beginPath();
      for (let i = 0; i < N_AXES; i++) {
        const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
        const x = cx + Math.cos(a) * R * f, y = cy + Math.sin(a) * R * f;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = css("--line"); ctx.lineWidth = 1; ctx.stroke();
    });
    for (let i = 0; i < N_AXES; i++) {
      const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = css("--line"); ctx.stroke();
    }
    // axis tags around the ring
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.fillStyle = mut;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    AXES.forEach((ax, i) => {
      const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
      const lx = cx + Math.cos(a) * (R + 20), ly = cy + Math.sin(a) * (R + 20);
      ctx.fillText(ax.tag.toUpperCase().slice(0, 8), lx, ly);
    });
    // neutral ring marker
    ctx.beginPath();
    for (let i = 0; i < N_AXES; i++) {
      const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
      const x = cx + Math.cos(a) * R * 0.5, y = cy + Math.sin(a) * R * 0.5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = mut; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    // user polygon
    ctx.beginPath();
    scores.forEach((s, i) => {
      const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
      const x = cx + Math.cos(a) * R * (s / 100), y = cy + Math.sin(a) * R * (s / 100);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    const dark = document.documentElement.dataset.theme !== "light";
    ctx.fillStyle = dark ? "rgba(201,162,39,0.28)" : "rgba(138,109,28,0.22)"; ctx.fill();
    ctx.strokeStyle = css("--accent"); ctx.lineWidth = 2; ctx.stroke();
    // vertex dots
    ctx.fillStyle = ink;
    scores.forEach((s, i) => {
      const a = (Math.PI * 2 * i) / N_AXES - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * (s / 100), cy + Math.sin(a) * R * (s / 100), 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---- PNG export (offline canvas) ----
  $("btn-png").addEventListener("click", () => { if (lastScores) exportPNG(lastScores); });

  function exportPNG(scores) {
    const W = 1200, pad = 60;
    const arch = ARCHETYPES.find((a) => { try { return a.test(scores); } catch (_) { return false; } });
    const top = matchPhilosophers(scores, activeSchools).slice(0, 5);
    const dark = document.documentElement.dataset.theme !== "light";
    const bg = dark ? "#14100b" : "#f4ecd9", ink = dark ? "#ece0c8" : "#2a2118";
    const mut = dark ? "#a89a7c" : "#6b5f4c", gold = "#c9a227";
    const bl = dark ? "#4f7fb8" : "#2f5f8f", gr = dark ? "#5da271" : "#3d7a4e";

    const H = 340 + N_AXES * 92 + top.length * 78 + 150;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = ink; c.textBaseline = "top";
    let y = pad;
    c.font = "700 54px Georgia, serif";
    c.fillText("Philosophical Orientation", pad, y); y += 70;
    c.font = "28px Georgia, serif"; c.fillStyle = gold;
    c.fillText(arch.name, pad, y); y += 40;
    c.font = "22px Georgia, serif"; c.fillStyle = mut;
    y = wrap(c, arch.desc, pad, y, W - pad * 2, 30) + 26;

    c.font = "700 30px Georgia, serif"; c.fillStyle = ink;
    scores.forEach((L, i) => {
      const ax = AXES[i];
      y += 8;
      c.font = "24px Georgia, serif"; c.fillStyle = ink;
      c.fillText(`${L}% ${ax.left}`, pad, y);
      const rt = `${ax.right} ${100 - L}%`;
      c.fillText(rt, W - pad - c.measureText(rt).width, y);
      y += 32;
      const bw = W - pad * 2;
      c.fillStyle = dark ? "#2a241a" : "#ddd2b8"; c.fillRect(pad, y, bw, 24);
      c.fillStyle = bl; c.fillRect(pad, y, bw * L / 100, 24);
      c.fillStyle = gr; c.fillRect(pad + bw * L / 100, y, bw * (100 - L) / 100, 24);
      y += 30;
    });
    y += 20;
    c.font = "700 30px Georgia, serif"; c.fillStyle = ink;
    c.fillText("Closest philosophers", pad, y); y += 42;
    c.font = "24px Georgia, serif";
    top.forEach((p) => {
      c.fillStyle = gold; c.fillText(`${p.name} — ${p.sim}%`, pad, y);
      y += 32;
      c.fillStyle = mut; c.font = "20px Georgia, serif";
      y = wrap(c, `${p.era} · ${p.school}`, pad, y, W - pad * 2, 26) + 20;
      c.font = "24px Georgia, serif";
    });
    y += 10;
    c.fillStyle = mut; c.font = "20px Georgia, serif";
    c.fillText("18 axes · analytic philosophy · results encoded in the share URL", pad, y);
    c.fillText(location.href, pad, y + 28);
    cv.toBlob((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "philosophical-orientation.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      $("copy-hint").textContent = "PNG downloaded!";
    });
  }

  function wrap(c, text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "", yy = y;
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); yy += lh; line = w; }
      else line = t;
    }
    if (line) c.fillText(line, x, yy);
    return yy + lh;
  }

  $("btn-retake").addEventListener("click", () => {
    clearSave(); history.replaceState(null, "", location.pathname);
    refreshResume(); show("landing");
  });

  $("btn-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); $("copy-hint").textContent = "Link copied!"; }
    catch (_) { $("copy-hint").textContent = "Copy this URL: " + location.href; }
  });

  // ---- deep link: ?v=3&s=… (v1: 12 values → pad 6×50) ----
  (function init() {
    const m = new URLSearchParams(location.search).get("s");
    if (!m) return;
    let scores = m.split(",").map(Number);
    if (!scores.every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return;
    if (scores.length === 12) scores = scores.concat(new Array(N_AXES - 12).fill(50));
    if (scores.length !== N_AXES) return;
    renderResults(scores);
    show("results");
  })();

  window.__quiz = { scoreAll, matchPhilosophers, state, ORDER };
})();
