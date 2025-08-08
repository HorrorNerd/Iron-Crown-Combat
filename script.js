// --- Iron Crown Combat Fighters & Events JS by Perplexity ---

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

// Helper: Flexible fighter name lookup
function extractFighterName(row) {
    return row.Fighter || row.Name || row["Fighter Name"] || row["name"] || "";
}

// Helper: Calculate stats for a fighter based on events
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

// -------- Fighters Page Logic --------
async function loadFighters() {
    const container = document.getElementById("fighters-container");
    try {
        const [fighterRes, eventRes] = await Promise.all([fetch(fighterURL), fetch(eventURL)]);
        if (!fighterRes.ok || !eventRes.ok) throw new Error("Failed to fetch spreadsheet data.");
        fightersData = await fighterRes.json();
        eventData = await eventRes.json();
        container.innerHTML = "";

        // Log for debugging
        console.log("fightersData", fightersData);

        let cards = 0;
        fightersData.forEach(fighter => {
            const fighterName = extractFighterName(fighter);
            if (!fighterName) return;

            const stats = calculateFighterStats(fighterName, eventData);

            // Use provided stats or fallback to calculated
            const recordWins   = fighter.Wins    ?? stats.wins;
            const recordLosses = fighter.Losses  ?? 0;
            const recordDraws  = fighter.Draws   ?? 0;
            const imageUrl     = fighter["Image URL"] || fighter["image url"] || fighter.Image || "https://i.imgur.com/sNo2MNm.png";

            const card = document.createElement("div");
            card.className = "fighter-card";
            card.innerHTML = `
                <img src="${imageUrl}" alt="Photo of ${fighterName}" class="fighter-image">
                <h2>${fighterName}</h2>
                <p>${recordWins} W - ${recordLosses} L - ${recordDraws} D</p>
                <p><strong>Earnings:</strong> $${stats.totalEarnings.toLocaleString()}</p>
                <button onclick="openModal('${fighterName.replace(/'/g,"\\'")}')">View Bio & History</button>
            `;
            container.appendChild(card);
            cards++;
        });

        if (cards === 0) {
            container.innerHTML = `<p style="color: #e56915;">No fighters found. Please check your sheet tab and column headers.</p>`;
        }

        // Open modal if ?fighter= param in URL
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

// -------- Event Page Logic --------
async function loadEvents() {
    const container = document.getElementById("events-container");
    try {
        const res = await fetch(eventURL);
        if (!res.ok) throw new Error("Failed to fetch event data.");
        const data = await res.json();
        container.innerHTML = "";

        const grouped = data.reduce((acc, row) => {
            if (row.Event) {
                if (!acc[row.Event]) acc[row.Event] = [];
                acc[row.Event].push(row);
            }
            return acc;
        }, {});

        Object.keys(grouped).forEach(eventName => {
            const eventCard = document.createElement("div");
            eventCard.className = "event-card";
            const title = document.createElement("h2");
            title.className = "event-title";
            title.innerHTML = `🔥 ${eventName}`;
            const matchesContainer = document.createElement("div");
            matchesContainer.className = "matches-container";

            grouped[eventName].forEach(match => {
                const ratingText = match["Match Rating"] || "0%";
                const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
                const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));

                const fighterA = match["Fighter A"]?.trim();
                const fighterB = match["Fighter B"]?.trim();
                const winner = match.Winner?.trim();
                const bonusType = (match["bonus type"] || "").trim().toLowerCase();
                const purse = ratingValue * 100;

                let fighterAEarnings = (winner === fighterA || winner === "Draw") ? purse : purse / 2;
                let fighterBEarnings = (winner === fighterB || winner === "Draw") ? purse : purse / 2;

                let isActualBonus = false;
                if (SHARED_BONUSES.includes(bonusType)) {
                    fighterAEarnings += BONUS_VALUE;
                    fighterBEarnings += BONUS_VALUE;
                    isActualBonus = true;
                } else if (WINNER_BONUSES.includes(bonusType)) {
                    if (winner === fighterA) fighterAEarnings += BONUS_VALUE;
                    if (winner === fighterB) fighterBEarnings += BONUS_VALUE;
                    isActualBonus = true;
                }

                const bonusDisplayType = (match["bonus type"] || "").trim() || "—";
                const bonusDisplayText = isActualBonus ? `${bonusDisplayType} ($${BONUS_VALUE.toLocaleString()})` : bonusDisplayType;

                matchesContainer.innerHTML += `
                    <div class="match">
                        <p><strong>${fighterA} vs ${fighterB}</strong></p>
                        <p>🏆 Winner: <span class="winner">${winner}</span></p>
                        <p>⭐ Rating: <span class="rating">${stars}</span> (${ratingText})</p>
                        <p>🎁 Bonus: <span class="winner">${bonusDisplayText}</span></p>
                        <p>💵 ${fighterA}: $${fighterAEarnings.toLocaleString()} | ${fighterB}: $${fighterBEarnings.toLocaleString()}</p>
                    </div>`;
            });

            // Collapse/expand matches on event title click
            title.addEventListener('click', () => {
                matchesContainer.style.display =
                    matchesContainer.style.display === 'block' ? 'none' : 'block';
            });
            eventCard.appendChild(title);
            eventCard.appendChild(matchesContainer);
            container.appendChild(eventCard);
        });
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error loading event data.</p>`;
        console.error(error);
    }
}

// -------- Modal Logic --------
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

    // Prepare bio details (flexibly gets all fields)
    const bioDetailsHtml = `
        <div class="bio-details">
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

    // Build fight history
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
        <h2>${fighterName}</h2>
        <p><strong>Official Record:</strong> ${fighter.Wins ?? stats.wins} W - ${fighter.Losses ?? 0} L - ${fighter.Draws ?? 0} D</p>
        ${bioDetailsHtml}
        <h3>Biography</h3>
        <p>${fighter.Bio ?? fighter.Biography ?? "This fighter's biography has not yet been written."}</p>
        ${historyHtml}
    `;
    modal.style.display = "flex";
};

window.closeModal = function() {
    document.getElementById("modal").style.display = "none";
};

// Close modal with Escape key
document.addEventListener('keydown', e => {
    if (e.key === "Escape") window.closeModal();
});

// -------- Main Loader --------
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("fighters-container")) {
        loadFighters();
    }
    if (document.getElementById("events-container")) {
        loadEvents();
    }
});
