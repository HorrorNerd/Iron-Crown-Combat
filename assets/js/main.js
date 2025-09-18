(function () {
  // ===== THEME / NAV =====
  const root = document.documentElement;
  const saved = localStorage.getItem("icc:theme");
  if (saved === "light") root.classList.add("light");

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    root.classList.toggle("light");
    localStorage.setItem(
      "icc:theme",
      root.classList.contains("light") ? "light" : "dark"
    );
  });

  const drawerBtn = document.querySelector("[data-drawer]");
  const drawer = document.querySelector("#drawer");
  if (drawerBtn && drawer) {
    drawerBtn.addEventListener("click", () => {
      drawer.hidden = !drawer.hidden;
    });
  }

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav] a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.setAttribute("aria-current", "page");
  });

  // ===== YOUR GOOGLE SHEET CONFIG =====
  const SHEET_ID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
  const GID_RESULTS  = "676906080";   // Event Results tab
  const GID_FIGHTERS = "1277877160";  // Fighter Tracker tab
  const GID_NEWS     = "1273524900";  // News tab

  // ===== CSV helpers =====
  const csvUrl = (gid) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;

  async function fetchCSV(gid) {
    const res = await fetch(csvUrl(gid), { cache: "no-store" });
    const text = await res.text();
    return parseCSV(text);
  }

  function parseCSV(csv) {
    const lines = csv.replace(/\r/g, "").split("\n").filter(Boolean);
    const rows = lines.map((line) => {
      const out = [];
      let cur = "",
        inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i],
          n = line[i + 1];
        if (c === '"' && n === '"') {
          cur += '"';
          i++;
          continue;
        }
        if (c === '"') {
          inQ = !inQ;
          continue;
        }
        if (c === "," && !inQ) {
          out.push(cur);
          cur = "";
          continue;
        }
        cur += c;
      }
      out.push(cur);
      return out;
    });
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (r[i] || "").trim()));
      return obj;
    });
  }

  // ===== UTIL =====
  const toNumber = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/[\$,]/g, "").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // ===== RANKINGS: Champion + Most Money + Most Wins =====
  async function loadRankings() {
    const champBox  = document.getElementById("champion-box");
    const moneyBody = document.getElementById("earnings-body");
    const winsBody  = document.getElementById("wins-body");
    if (!champBox && !moneyBody && !winsBody) return;

    try {
      // Fighter Tracker columns: Fighter, Wins, Losses, Draws, Total Fights, Gender, Earnings, Bio, Image, Gym, Win %
      const rows = await fetchCSV(GID_FIGHTERS);

      // Champion: if your sheet later adds a "Champion" column (Yes/True), we'll use it.
      const champCol = rows.length && Object.keys(rows[0]).find(k => /^champ/i.test(k));
      let champion = champCol
        ? rows.find(r => /^(yes|true|1|champ|current)$/i.test(String(r[champCol] || "")))
        : null;

      // Fallback: pick top earner if no explicit champion column exists
      if (!champion) {
        champion = [...rows].sort((a, b) => toNumber(b["Earnings"]) - toNumber(a["Earnings"]))[0];
      }

      if (champBox) {
        const name = champion?.["Fighter"] || "—";
        const gym  = champion?.["Gym"] || "";
        champBox.innerHTML = `
          <div class="card" style="display:flex;align-items:center;gap:1rem;justify-content:space-between;">
            <div>
              <div class="chip gold">Current Champion</div>
              <h2 style="margin:.4rem 0 0;">${name}</h2>
              ${gym ? `<div class="meta" style="margin-top:.3rem;"><span class="chip">${gym}</span></div>` : ""}
            </div>
          </div>`;
      }

      if (moneyBody) {
        const byMoney = [...rows].sort((a, b) => toNumber(b["Earnings"]) - toNumber(a["Earnings"]));
        moneyBody.innerHTML = byMoney
          .map(
            (r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r["Fighter"] || ""}</td>
              <td>${r["Gym"] || ""}</td>
              <td>$${toNumber(r["Earnings"]).toLocaleString()}</td>
            </tr>`
          )
          .join("");
      }

      if (winsBody) {
        const byWins = [...rows].sort((a, b) => toNumber(b["Wins"]) - toNumber(a["Wins"]));
        winsBody.innerHTML = byWins
          .map(
            (r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r["Fighter"] || ""}</td>
              <td>${r["Gym"] || ""}</td>
              <td>${toNumber(r["Wins"])}</td>
            </tr>`
          )
          .join("");
      }
    } catch (e) {
      if (moneyBody) moneyBody.innerHTML = `<tr><td colspan="4">Failed to load earnings.</td></tr>`;
      if (winsBody) winsBody.innerHTML = `<tr><td colspan="4">Failed to load wins.</td></tr>`;
      console.error(e);
    }
  }

  // ===== FIGHTERS (roster cards from Fighter Tracker) =====
  async function loadFighters() {
    const grid = document.getElementById("fighters-grid");
    if (!grid) return;
    try {
      const rows = await fetchCSV(GID_FIGHTERS);
      grid.innerHTML = rows
        .map((r) => {
          const name    = r["Fighter"] || "Unknown";
          const style   = r["Style"] || "";            // optional if you add later
          const country = r["Country"] || "";          // optional if you add later
          const weight  = r["Weight"] || "";           // optional if you add later
          const gym     = r["Gym"] || "";
          const bio     = r["Bio"] || "";
          const image   = r["Image"] || "assets/img/favicon.png"; // supports full URLs or local paths
          return `
            <article class="card fighter">
              <img src="${image}" alt="${name}" />
              <div>
                <h3>${name}</h3>
                <div class="meta">
                  ${style ? `<span class="chip">${style}</span>` : ""}
                  ${country ? `<span class="chip">${country}</span>` : ""}
                  ${weight ? `<span class="chip">${weight}</span>` : ""}
                  ${gym ? `<span class="chip">${gym}</span>` : ""}
                </div>
                ${bio ? `<p class="prose">${bio}</p>` : ""}
              </div>
            </article>`;
        })
        .join("");
    } catch (e) {
      grid.innerHTML = `<div class="card">Failed to load fighters.</div>`;
      console.error(e);
    }
  }

  // ===== EVENTS (from Event Results tab) =====
  async function loadEvents() {
    const list = document.getElementById("events-list");
    if (!list) return;
    try {
      // Columns: Tournament, Event, Fighter A, Fighter B, Winner, Match Rating, bonus type
      const rows = await fetchCSV(GID_RESULTS);

      // Group results by Tournament + Event for nice blocks
      const key = (r) => `${r["Tournament"] || ""} :: ${r["Event"] || ""}`.trim();
      const groups = {};
      for (const r of rows) {
        const k = key(r);
        (groups[k] = groups[k] || []).push(r);
      }

      list.innerHTML = Object.entries(groups)
        .map(([k, items]) => {
          const [tournament, eventName] = k.split("::").map((s) => s.trim());
          const header = [tournament, eventName].filter(Boolean).join(" — ");
          const fights = items
            .map((r) => {
              const a = r["Fighter A"] || "";
              const b = r["Fighter B"] || "";
              const w = r["Winner"] || "";
              const mr = r["Match Rating"] ? ` · Rating: ${r["Match Rating"]}` : "";
              const bt = r["bonus type"] ? ` · Bonus: ${r["bonus type"]}` : "";
              return `<li><strong>${a}</strong> vs <strong>${b}</strong> — Winner: <strong>${w}</strong>${mr}${bt}</li>`;
            })
            .join("");
          return `
            <article class="card">
              <h3>${header || "Event Results"}</h3>
              <ul class="prose" style="margin-left:1rem">${fights}</ul>
            </article>`;
        })
        .join("");
    } catch (e) {
      list.innerHTML = `<div class="card">Failed to load events.</div>`;
      console.error(e);
    }
  }

  // ===== NEWS (from News tab) =====
  async function loadNews() {
    const list = document.getElementById("news-list");
    if (!list) return;
    try {
      // Columns: Date, Title, Article
      const rows = await fetchCSV(GID_NEWS);
      list.innerHTML = rows
        .map((r) => {
          const date = r["Date"] || "";
          const title = r["Title"] || "Update";
          const body = r["Article"] || "";
          return `
            <article class="card">
              <h3>${title}${date ? ` — <small>${date}</small>` : ""}</h3>
              ${body ? `<p class="prose">${body}</p>` : ""}
            </article>`;
        })
        .join("");
    } catch (e) {
      list.innerHTML = `<div class="card">Failed to load news.</div>`;
      console.error(e);
    }
  }

  // Boot per page
  loadRankings();
  loadFighters();
  loadEvents();
  loadNews();
})();
