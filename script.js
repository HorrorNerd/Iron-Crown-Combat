const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";
const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL   = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;
const BONUS_VALUE = 5000;
const WINNER_BONUSES = ['ko of the night', 'submission of the night'];
const SHARED_BONUSES = ['fight of the night', 'match of the night'];
let fightersData = [];
let eventData = [];

function extractFighterName(row) {
  return row.Fighter || row.Name || row["Fighter Name"] || row["name"] || "";
}

function calculateFighterStats(fighterName, allEvents) {
  const trimmed = fighterName.trim();
  const history = allEvents.filter(e =>
    (e["Fighter A"]?.trim() === trimmed) || (e["Fighter B"]?.trim() === trimmed)
  );
  let totalEarnings = 0, wins = 0, bonusCount = 0;
  history.forEach(match => {
    const rating = parseInt(match["Match Rating"]?.replace("%", "")) || 0;
    const purse = rating * 100;
    const winner = match.Winner?.trim();
    const isWinner = winner === trimmed;
    const bonusType = (match["bonus type"] || "").trim().toLowerCase();
    let currentBonus = 0;
    if (SHARED_BONUSES.includes(bonusType)) currentBonus = BONUS_VALUE;
    else if (isWinner && WINNER_BONUSES.includes(bonusType)) currentBonus = BONUS_VALUE;
    const earnings = (isWinner || winner === "Draw")
      ? (purse + currentBonus)
      : (purse / 2 + currentBonus);
    totalEarnings += earnings;
    if (isWinner) wins++;
    if (currentBonus > 0) bonusCount++;
  });
  return { totalEarnings, wins, bonusCount, history };
}

function getChampionshipBadgeHtml() {
  return `
    <div class="champ-belt-badge" title="King Of The Crown">
      <svg viewBox="0 0 360 120" class="belt-svg" aria-label="Championship Belt">
        <rect x="10" y="48" width="75" height="24" rx="12" fill="#23272a" stroke="#b8b8b8" stroke-width="3"/>
        <rect x="275" y="48" width="75" height="24" rx="12" fill="#23272a" stroke="#b8b8b8" stroke-width="3"/>
        <ellipse cx="180" cy="60" rx="85" ry="44" fill="url(#plateGrad)" stroke="#ffd700" stroke-width="5"/>
        <g>
          <ellipse cx="180" cy="60" rx="38" ry="16" fill="#565e64" stroke="#b8b8b8" stroke-width="2"/>
          <polygon points="152,60 158,32 166,58" fill="#a3a8ab" stroke="#181a1b" stroke-width="2"/>
          <polygon points="166,58 176,22 180,58" fill="#a3a8ab" stroke="#181a1b" stroke-width="2"/>
          <polygon points="180,58 184,22 194,58" fill="#a3a8ab" stroke="#181a1b" stroke-width="2"/>
          <polygon points="194,58 202,32 208,60" fill="#a3a8ab" stroke="#181a1b" stroke-width="2"/>
          <ellipse cx="180" cy="56" rx="33" ry="7" fill="#7e848b" opacity="0.9"/>
        </g>
        <text x="180" y="96" font-size="18" text-anchor="middle" fill="#ffd700" font-family="'Oswald','Impact',Arial,sans-serif" letter-spacing="2" font-weight="bold">KING OF THE CROWN</text>
        <defs>
          <linearGradient id="plateGrad" x1="95" y1="16" x2="265" y2="104" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ffc600"/>
            <stop offset="0.35" stop-color="#ffe38b"/>
            <stop offset="0.45" stop-color="#ffd700"/>
            <stop offset="0.85" stop-color="#ae8800"/>
            <stop offset="1" stop-color="#ffc600"/>
          </linearGradient>
        </defs>
      </svg>
      <span class="belt-holder-label">Cole Maddox</span>
    </div>
  `;
}

// Load fighters and render cards
async function loadFighters() {
  const container = document.getElementById("fighters-container");
  try {
    const [fighterRes, eventRes] = await Promise.all([fetch(fighterURL), fetch(eventURL)]);
    if (!fighterRes.ok || !eventRes.ok) throw new Error("Failed to fetch spreadsheet data.");
    fightersData = await fighterRes.json();
    eventData = await eventRes.json();
    container.innerHTML = "";
    let cards = 0;
    fightersData.forEach(fighter => {
      const fighterName = extractFighterName(fighter);
      if (!fighterName) return;
      const stats = calculateFighterStats(fighterName, eventData);
      const winsVal = fighter.Wins ?? stats.wins;
      const lossVal = fighter.Losses ?? 0;
      const drawVal = fighter.Draws ?? 0;
      const imageUrl = fighter["Image URL"] || fighter["image url"] || fighter.Image || "https://i.imgur.com/sNo2MNm.png";
      const isKing = fighterName === "Cole Maddox";
      const badgeHtml = isKing ? getChampionshipBadgeHtml() : '';
      const card = document.createElement("div");
      card.className = "fighter-card";
      card.innerHTML = `
        ${badgeHtml}
        <img src="${imageUrl}" alt="Photo of ${fighterName}" class="fighter-image">
        <h2>${fighterName}</h2>
        <p>${winsVal} W - ${lossVal} L - ${drawVal} D</p>
        <p><strong>Earnings:</strong> $${stats.totalEarnings.toLocaleString()}</p>
        <button onclick="openModal('${fighterName.replace(/'/g,"\\'")}')">View Bio & History</button>
      `;
      container.appendChild(card);
      cards++;
    });
    addImageClickHandlers();
    if (cards === 0) {
      container.innerHTML = `<p style="color: #e56915;">No fighters found. Check your sheet tab and column headers.</p>`;
    }
    const params = new URLSearchParams(window.location.search);
    const fighterToOpen = params.get('fighter');
    if (fighterToOpen) {
      setTimeout(() => { window.openModal(decodeURIComponent(fighterToOpen)); }, 200);
    }
  } catch (error) {
    container.innerHTML = `<p style="color: red;">Error loading fighter data.</p>`;
    console.error(error);
  }
}

// Open modal with fighter info, including awards
window.openModal = function(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  const fighter = fightersData.find(f =>
    extractFighterName(f) === fighterName);
  if (!fighter) {
    content.innerHTML = `<h2>${fighterName}</h2><p>Fighter not found.</p><button onclick="closeModal()">Close</button>`;
    modal.style.display = "flex";
    return;
  }
  const stats = calculateFighterStats(fighterName, eventData);
  const imageUrl = fighter["Image URL"] || fighter["image url"] || fighter.Image || "https://i.imgur.com/sNo2MNm.png";
  const isKing = fighterName === "Cole Maddox";
  const badgeHtml = isKing ? getChampionshipBadgeHtml() : "";

  // Generate Awards & Bonuses list
  const awardsSet = new Set();
  eventData.forEach(match => {
    const fighterA = match["Fighter A"]?.trim();
    const fighterB = match["Fighter B"]?.trim();
    const bonusType = (match["bonus type"] || "").trim();
    if (!bonusType) return;
    if (fighterA === fighterName || fighterB === fighterName) {
      awardsSet.add(bonusType);
    }
  });
  const awardsArray = Array.from(awardsSet);
  let awardsHtml = '<h3>Awards & Bonuses</h3>';
  if (awardsArray.length > 0) {
    awardsHtml += '<ul>';
    awardsArray.forEach(award => {
      awardsHtml += `<li>${award}</li>`;
    });
    awardsHtml += '</ul>';
  } else {
    awardsHtml += '<p>No awards or bonuses recorded.</p>';
  }

  const bioDetailsHtml = `
    <div class="bio-details">
      <div class="detail-item">
          <strong>Record</strong>
          <span>${fighter.Wins ?? stats.wins} W - ${fighter.Losses ?? 0} L - ${fighter.Draws ?? 0} D</span>
      </div>
      <div class="detail-item">
          <strong>Earnings</strong>
          <span>$${stats.totalEarnings.toLocaleString()}</span>
      </div>
      <div class="detail-item">
          <strong>Height</strong>
          <span>${fighter.Height || 'N/A'}</span>
      </div>
      <div class="detail-item">
          <strong>Weight</strong>
          <span>${fighter.Weight || 'N/A'}</span>
      </div>
      <div class="detail-item">
          <strong>Nationality</strong>
          <span>${fighter.Nationality || 'N/A'}</span>
      </div>
      <div class="detail-item">
          <strong>Fighting Style</strong>
          <span>${fighter['Fighting Style'] || fighter.Style || 'N/A'}</span>
      </div>
    </div>
  `;

  let historyHtml = '<h3>Fight History</h3>';
  if (stats.history.length > 0) {
    historyHtml += '<ul>';
    stats.history.forEach(match => {
      const opponent =
        match["Fighter A"]?.trim() === fighterName
          ? match["Fighter B"]
          : match["Fighter A"];
      let result = 'Loss';
      if (match.Winner === fighterName) result = 'Win';
      if (match.Winner === 'Draw') result = 'Draw';
      historyHtml += `<li>vs ${opponent} <span style="color:${result === 'Win' ? '#ffd700' : result === 'Draw' ? '#b8b8b8' : '#e56915'}; font-weight:700;">(${result})</span> <em style="color:#b8b8b8;">at ${match.Event}</em></li>`;
    });
    historyHtml += '</ul>';
  } else {
    historyHtml += '<p>No fight history recorded.</p>';
  }

  content.innerHTML = `
    <span id="close-modal" onclick="closeModal()">×</span>
    ${badgeHtml}
    <div class="modal-fighter-photo-wrap">
      <img src="${imageUrl}" alt="Photo of ${fighterName}" class="modal-fighter-photo" onclick="openImageViewer('${imageUrl}', 'Photo of ${fighterName}')">
    </div>
    <h2>${fighterName}</h2>
    ${bioDetailsHtml}
    ${awardsHtml}
    <h3>Biography</h3>
    <p>${fighter.Bio ?? fighter.Biography ?? "This fighter's biography has not yet been written."}</p>
    ${historyHtml}
  `;
  modal.style.display = "flex";
};

window.closeModal = function() {
  document.getElementById("modal").style.display = "none";
};

// Fullscreen image viewer functions
function openImageViewer(src, alt) {
  const overlay = document.getElementById('image-viewer-overlay');
  const img = document.getElementById('fullsize-image');
  img.src = src;
  img.alt = alt || 'Full size fighter photo';
  overlay.style.display = 'flex';
}

function closeImageViewer() {
  const overlay = document.getElementById('image-viewer-overlay');
  overlay.style.display = 'none';
  const img = document.getElementById('fullsize-image');
  img.src = '';
}

// Add click handlers for fighter images for fullscreen view
function addImageClickHandlers() {
  const images = document.querySelectorAll('.fighter-image');
  images.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.onclick = () => openImageViewer(img.src, img.alt);
  });
}

document.addEventListener('keydown', e => {
  if (e.key === "Escape") {
    closeModal();
    closeImageViewer();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById("fighters-container")) {
    loadFighters();
  }
});
