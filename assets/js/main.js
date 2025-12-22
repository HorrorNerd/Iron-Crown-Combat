(function(){
  // ===== THEME / NAV =====
  const root = document.documentElement;
  const saved = localStorage.getItem('icc:theme');
  if (saved === 'light') root.classList.add('light');

  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    root.classList.toggle('light');
    localStorage.setItem('icc:theme', root.classList.contains('light') ? 'light' : 'dark');
  });

  const drawerBtn = document.querySelector('[data-drawer]');
  const drawer = document.querySelector('#drawer');
  if (drawerBtn && drawer){ drawerBtn.addEventListener('click', ()=>{ drawer.hidden = !drawer.hidden; }); }

  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav] a').forEach(a=>{
    const href = a.getAttribute('href');
    if (href === path) a.setAttribute('aria-current','page');
  });

  // ===== GOOGLE SHEETS CONFIG (yours) =====
  const SHEET_ID     = '1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU';
  const GID_RESULTS  = '676906080';   // Event Results
  const GID_FIGHTERS = '1277877160';  // Fighter Tracker
  const GID_NEWS     = '1273524900';  // News

  // ===== CSV helpers =====
  const csvUrl = gid => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  async function fetchCSV(gid){ const res = await fetch(csvUrl(gid), { cache:'no-store' }); const text = await res.text(); return parseCSV(text); }
  function parseCSV(csv){
    const lines = csv.replace(/\r/g,'').split('\n').filter(Boolean);
    const rows = lines.map(line => {
      const out = []; let cur = '', inQ = false;
      for (let i=0;i<line.length;i++){
        const c=line[i], n=line[i+1];
        if (c === '"' && n === '"'){ cur+='"'; i++; continue; }
        if (c === '"'){ inQ = !inQ; continue; }
        if (c === ',' && !inQ){ out.push(cur); cur=''; continue; }
        cur += c;
      }
      out.push(cur); return out;
    });
    const headers = rows[0].map(h=>h.trim());
    return rows.slice(1).map(r=>{ const o={}; headers.forEach((h,i)=>o[h]=(r[i]||'').trim()); return o; });
  }

  const toNumber = v => { if (v==null) return 0; const n = Number(String(v).replace(/[\$,]/g,'').trim()); return Number.isFinite(n) ? n : 0; };

  // ===== RANKINGS: Champion + Most Money + Most Wins =====
  async function loadRankings(){
    const champBox   = document.getElementById('champion-box');
    const moneyBody  = document.getElementById('earnings-body');
    const recordBody = document.getElementById('record-body');
    if (!champBox && !moneyBody && !recordBody) return;

    try {
      // Fighter Tracker columns: Fighter, Wins, Losses, Draws, Total Fights, Gender, Earnings, Bio, Image, Gym, Win %
      const rows = await fetchCSV(GID_FIGHTERS);

      const champion = [...rows].sort((a,b)=> toNumber(b['Earnings']) - toNumber(a['Earnings']))[0];

      if (champBox){
        const name = champion?.['Fighter'] || '—';
        const gym  = champion?.['Gym'] || '';
        champBox.innerHTML = `
          <div class="card" style="display:flex;align-items:center;gap:1rem;justify-content:space-between;">
            <div>
              <div class="chip gold">Current Champion</div>
              <h2 style="margin:.4rem 0 0;">${name}</h2>
              ${gym ? `<div class="meta" style="margin-top:.3rem;"><span class="chip">${gym}</span></div>` : ''}
            </div>
          </div>`;
      }

      if (moneyBody){
        const byMoney = [...rows]
          .sort((a,b)=> toNumber(b['Earnings']) - toNumber(a['Earnings']))
          .slice(0, 10);
        moneyBody.innerHTML = byMoney.map((r,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${r['Fighter']||''}</td>
            <td>${r['Gym']||''}</td>
            <td>$${toNumber(r['Earnings']).toLocaleString()}</td>
          </tr>`).join('');
      }

      if (recordBody){
        const withRecord = rows.map(r=>{
          const wins = toNumber(r['Wins']);
          const losses = toNumber(r['Losses']);
          const total = wins + losses;
          const pct = total ? (wins / total) * 100 : 0;
          return { ...r, wins, losses, pct };
        });
        const byRecord = withRecord
          .sort((a,b)=> b.pct !== a.pct ? b.pct - a.pct : b.wins - a.wins)
          .slice(0, 10);
        recordBody.innerHTML = byRecord.map((r,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${r['Fighter']||''}</td>
            <td>${r['Gym']||''}</td>
            <td>${r.wins}–${r.losses}</td>
            <td>${r.pct.toFixed(1)}%</td>
          </tr>`).join('');
      }
    } catch (e){
      if (moneyBody) moneyBody.innerHTML = `<tr><td colspan="4">Failed to load earnings.</td></tr>`;
      if (recordBody)  recordBody.innerHTML  = `<tr><td colspan="5">Failed to load records.</td></tr>`;
      console.error(e);
    }
  }

  // ===== FIGHTERS =====
  async function loadFighters(){
    const grid = document.getElementById('fighters-grid');
    if (!grid) return;
    try{
      const rows = await fetchCSV(GID_FIGHTERS);
      grid.innerHTML = rows.map(r=>{
        const name    = r['Fighter'] || 'Unknown';
        const style   = r['Style'] || '';
        const country = r['Country'] || '';
        const weight  = r['Weight'] || '';
        const gym     = r['Gym'] || '';
        const bio     = r['Bio'] || '';
        const image   = r['Image'] || 'assets/img/favicon.png';
        return `
          <article class="card fighter">
            <img src="${image}" alt="${name}" />
            <div>
              <h3>${name}</h3>
              <div class="meta">
                ${style ? `<span class="chip">${style}</span>` : ''}
                ${country ? `<span class="chip">${country}</span>` : ''}
                ${weight ? `<span class="chip">${weight}</span>` : ''}
                ${gym ? `<span class="chip">${gym}</span>` : ''}
              </div>
              ${bio ? `<p class="prose">${bio}</p>` : ''}
            </div>
          </article>`;
      }).join('');
    } catch (e){
      grid.innerHTML = `<div class="card">Failed to load fighters.</div>`;
      console.error(e);
    }
  }

  // ===== EVENTS =====
  async function loadEvents(){
    const list = document.getElementById('events-list');
    if (!list) return;
    try{
      const rows = await fetchCSV(GID_RESULTS);
      const groups = {};
      for (const r of rows){
        const k = `${r['Tournament']||''} :: ${r['Event']||''}`.trim();
        (groups[k] = groups[k] || []).push(r);
      }
      list.innerHTML = Object.entries(groups).map(([k,items])=>{
        const [tournament, eventName] = k.split('::').map(s=>s.trim());
        const header = [tournament, eventName].filter(Boolean).join(' — ');
        const fights = items.map(r=>{
          const a = r['Fighter A'] || '';
          const b = r['Fighter B'] || '';
          const w = r['Winner'] || '';
          const mr = r['Match Rating'] ? ` · Rating: ${r['Match Rating']}` : '';
          const bt = r['bonus type'] ? ` · Bonus: ${r['bonus type']}` : '';
          return `<li><strong>${a}</strong> vs <strong>${b}</strong> — Winner: <strong>${w}</strong>${mr}${bt}</li>`;
        }).join('');
        return `
          <article class="card">
            <h3>${header || 'Event Results'}</h3>
            <ul class="prose" style="margin-left:1rem">${fights}</ul>
          </article>`;
      }).join('');
    } catch (e){
      list.innerHTML = `<div class="card">Failed to load events.</div>`;
      console.error(e);
    }
  }

  // ===== NEWS with modal =====
  let NEWS_CACHE = [];
  const newsDateFmt = new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric' });
  const normalizeDate = v => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  function formatArticle(text){
    if (!text) return '';
    // Split on blank lines to paragraphs; keep single newlines as breaks
    const parts = String(text).split(/\n\s*\n/);
    return parts.map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  }
  function openNewsModal(idx){
    const m = document.getElementById('news-modal');
    const t = document.getElementById('news-modal-title');
    const d = document.getElementById('news-modal-date');
    const b = document.getElementById('news-modal-body');
    const row = NEWS_CACHE[idx];
    if (!row) return;
    const rawDate = row.date || row.Date || '';
    const parsed = normalizeDate(rawDate);
    t.textContent = row.title || row.Title || 'Update';
    d.textContent = parsed ? newsDateFmt.format(parsed) : rawDate;
    b.innerHTML   = formatArticle(row.body || row.Article || '');
    m.classList.add('show');
    m.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeNewsModal(){
    const m = document.getElementById('news-modal');
    if (!m) return;
    m.classList.remove('show');
    m.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  document.addEventListener('click',(e)=>{
    if (e.target.closest('[data-modal-close]')) { closeNewsModal(); }
    const mb = e.target.closest('#news-modal');
    if (mb && e.target === mb) { closeNewsModal(); }
    const n = e.target.closest('[data-news-idx]');
    if (n) { openNewsModal(Number(n.getAttribute('data-news-idx'))); }
  });
  document.addEventListener('keydown',(e)=>{ if (e.key === 'Escape') closeNewsModal(); });

  async function loadNews(){
    const list = document.getElementById('news-list');
    if (!list) return;
    try{
      const res  = await fetch('assets/data/news.json', { cache:'no-store' });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.news || []);
      NEWS_CACHE = rows;
      list.innerHTML = rows
        .map((r,i)=>{
          const rawDate = r.date || r.Date || '';
          const parsed = normalizeDate(rawDate);
          const pretty = parsed ? newsDateFmt.format(parsed) : rawDate;
          const title = r.title || r.Title || 'Update';
        return `
          <article class="card">
            <h3 style="margin-bottom:.2rem">
              <button class="btn" style="padding:.35rem .7rem;border-radius:10px" data-news-idx="${i}" aria-haspopup="dialog">${title}</button>
            </h3>
            ${pretty ? `<div class="meta">${pretty}</div>` : ''}
          </article>`;
      }).join('');
    } catch (e){
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
