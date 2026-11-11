(function () {
  "use strict";

  const RATES = window.VISA_RATES;
  const REQ = window.VISA_REQUIREMENTS;
  const DESTS = ["au", "nz", "uk"];
  const COLORS = { au: "var(--au)", nz: "var(--nz)", uk: "var(--uk)" };
  const SMALL = 50; // fewer decisions than this: treat the rate with caution

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (x) => (x == null ? "–" : (x * 100).toFixed(x > 0.995 && x < 1 ? 1 : 0) + "%");
  const fmt = (n) => n.toLocaleString("en");

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  // ---- lookups -----------------------------------------------------------
  const lookup = new Map();
  Object.keys(RATES.countries).forEach((c) => lookup.set(c.toLowerCase(), c));
  Object.entries(RATES.aliases).forEach(([c, words]) => words.forEach((w) => {
    if (!lookup.has(w.toLowerCase())) lookup.set(w.toLowerCase(), c);
  }));

  const options = new Set(Object.keys(RATES.countries));
  Object.values(RATES.aliases).forEach((ws) => ws.forEach((w) => options.add(w)));
  $("country-list").innerHTML = [...options].sort((a, b) => a.localeCompare(b))
    .map((o) => `<option value="${esc(o)}"></option>`).join("");

  function sum(yearMap, years) {
    let a = 0, r = 0;
    (years || RATES.years).forEach((y) => { const v = yearMap && yearMap[y]; if (v) { a += v[0]; r += v[1]; } });
    return { a, r, n: a + r, rate: a + r ? a / (a + r) : null };
  }

  // Destination-wide average across every nationality, for comparison.
  const destAvg = {};
  DESTS.forEach((d) => {
    let a = 0, r = 0;
    Object.values(RATES.countries).forEach((c) => { const s = sum(c[d]); a += s.a; r += s.r; });
    destAvg[d] = a / (a + r);
  });

  // ---- step 2: rate cards -------------------------------------------------
  function renderCards(country) {
    const data = RATES.countries[country];
    $("rates-country").textContent = country;
    $("cards").innerHTML = DESTS.map((d) => {
      const s = sum(data[d]);
      const head = `<h3>${esc(REQ[d].name)}</h3><p class="sub">${esc(REQ[d].visa)}</p>`;
      if (!s.n) {
        return `<div class="card" style="--c:${COLORS[d]}">${head}<p class="none">No published decisions for this nationality.</p></div>`;
      }
      const diff = s.rate - destAvg[d];
      const vs = Math.abs(diff) < 0.01
        ? `About the same as the ${pct(destAvg[d])} average for all nationalities`
        : `<span class="${diff > 0 ? "up" : "down"}">${diff > 0 ? "▲" : "▼"} ${Math.abs(diff * 100).toFixed(0)} points</span> vs the ${pct(destAvg[d])} average for all nationalities`;
      const years = RATES.years.map((y) => {
        const v = sum(data[d], [y]);
        if (!v.n) return `<div class="yr"><span>${y}</span><span class="none">no data</span><span></span></div>`;
        return `<div class="yr" title="${fmt(v.a)} approved, ${fmt(v.r)} refused"><span>${y}</span><span class="bar"><i style="width:${(v.rate * 100).toFixed(1)}%"></i></span><span class="pct">${pct(v.rate)}</span></div>`;
      }).join("");
      const flag = s.n < SMALL ? `<p class="flag">Only ${fmt(s.n)} decisions in total, so this rate can swing a lot.</p>` : "";
      return `<div class="card" style="--c:${COLORS[d]}">${head}
        <p class="big">${pct(s.rate)}</p>
        <p class="sub">${fmt(s.a)} approved · ${fmt(s.r)} refused</p>
        <p class="vs">${vs}</p>${flag}
        <div class="years">${years}</div>
        <p class="sub" style="margin-top:10px">${esc(REQ[d].dataNote)}</p></div>`;
    }).join("");
  }

  // ---- step 3: checklist --------------------------------------------------
  let activeTab = store.get("vdh-tab") || "au";

  function readiness(d) {
    const ticked = store.get("vdh-check-" + d) || {};
    const items = REQ[d].items;
    const crit = items.filter((i) => i.critical);
    const critDone = crit.filter((i) => ticked[i.id]).length;
    const done = items.filter((i) => ticked[i.id]).length;
    let label, cls;
    if (critDone < crit.length) { label = `Not ready: ${crit.length - critDone} essential${crit.length - critDone > 1 ? "s" : ""} missing`; cls = "bad"; }
    else if (done < items.length) { label = "Essentials done: check the rest if they apply"; cls = "warn"; }
    else { label = "Ready to apply"; cls = "good"; }
    return { ticked, done, total: items.length, critDone, critTotal: crit.length, label, cls };
  }

  function renderTabs() {
    $("tabs").innerHTML = DESTS.map((d) =>
      `<button role="tab" aria-selected="${d === activeTab}" data-d="${d}">${esc(REQ[d].name)}</button>`).join("");
  }

  function renderChecklist() {
    const d = activeTab, req = REQ[d], r = readiness(d);
    $("checklist").innerHTML = `
      <div class="ready">
        <span class="badge ${r.cls}">${esc(r.label)}</span>
        <span class="meter" aria-hidden="true"><i style="width:${(r.done / r.total) * 100}%"></i></span>
        <span class="muted">${r.done} of ${r.total} done</span>
      </div>
      <ul class="items">${req.items.map((i) => `
        <li><label>
          <input type="checkbox" data-id="${i.id}" ${r.ticked[i.id] ? "checked" : ""}>
          <span><span class="t">${esc(i.text)}</span>${i.critical ? '<span class="req">essential</span>' : ""}
          ${i.detail ? `<span class="d">${esc(i.detail)}</span>` : ""}</span>
        </label></li>`).join("")}
      </ul>
      <p class="official">Summary last checked ${esc(req.checked)}. Confirm every amount and rule on the official page:
      <a href="${req.official}" target="_blank" rel="noopener">${esc(req.name)}: ${esc(req.visa)}</a></p>`;
  }

  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-d]");
    if (!b) return;
    activeTab = b.dataset.d;
    store.set("vdh-tab", activeTab);
    renderTabs();
    renderChecklist();
  });

  $("checklist").addEventListener("change", (e) => {
    const box = e.target.closest("input[data-id]");
    if (!box) return;
    const key = "vdh-check-" + activeTab;
    const ticked = store.get(key) || {};
    ticked[box.dataset.id] = box.checked;
    store.set(key, ticked);
    renderChecklist();
    renderCompare();
  });

  // ---- step 4: comparison table -------------------------------------------
  let currentCountry = null;

  function renderCompare() {
    if (!currentCountry) return;
    const data = RATES.countries[currentCountry];
    const first = RATES.years[0], last = RATES.years[RATES.years.length - 1];
    const rows = [
      ["Approval rate " + first + "–" + last, (d) => pct(sum(data[d]).rate)],
      ["Approval rate " + last, (d) => pct(sum(data[d], [last]).rate)],
      ["Change since " + first, (d) => {
        const a = sum(data[d], [first]).rate, b = sum(data[d], [last]).rate;
        if (a == null || b == null) return "–";
        const ch = (b - a) * 100;
        return Math.abs(ch) < 1 ? "steady" : `<span class="${ch > 0 ? "up" : "down"}">${ch > 0 ? "+" : "−"}${Math.abs(ch).toFixed(0)} points</span>`;
      }],
      ["Decisions counted", (d) => fmt(sum(data[d]).n)],
      ["Your checklist", (d) => { const r = readiness(d); return `<span class="badge ${r.cls}">${r.critDone}/${r.critTotal} essentials</span>`; }],
    ];
    $("compare-table").innerHTML =
      `<thead><tr><th></th>${DESTS.map((d) => `<th>${esc(REQ[d].name)}</th>`).join("")}</tr></thead>
       <tbody>${rows.map(([label, f]) => `<tr><th scope="row">${esc(label)}</th>${DESTS.map((d) => `<td>${f(d)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  }

  // ---- country selection ---------------------------------------------------
  function choose(raw) {
    const country = lookup.get(raw.trim().toLowerCase());
    const msg = $("country-msg");
    if (!country) {
      msg.textContent = raw.trim() ? "Pick a nationality from the list." : "";
      return;
    }
    currentCountry = country;
    msg.textContent = country.toLowerCase() !== raw.trim().toLowerCase() ? `Showing data for “${country}”.` : "";
    store.set("vdh-country", country);
    ["rates", "check", "compare"].forEach((id) => { $(id).hidden = false; });
    renderCards(country);
    renderTabs();
    renderChecklist();
    renderCompare();
  }

  $("country").addEventListener("input", (e) => choose(e.target.value));
  $("country").addEventListener("change", (e) => choose(e.target.value));

  const saved = store.get("vdh-country");
  if (saved && RATES.countries[saved]) { $("country").value = saved; choose(saved); }
})();
