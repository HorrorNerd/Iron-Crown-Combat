// --- START OF FILE script.js ---

const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

const BONUS_VALUE = 5000;

let eventData = [];
let fightersData = [];

function calculateFighterStats(fighterName, allEvents) {
    const history = allEvents.filter(e => e["Fighter A"] === fighterName || e["Fighter B"] === fighterName);
    let totalEarnings = 0, wins = 0, bonusCount = 0;

    history.forEach(match => {
        const rating = parseInt(match["Match Rating"]?.replace("%", "")) || 0;
        const purse = rating * 100;
        const isWinner = match.Winner === fighterName;
        const bonusType = (match["Bonus Type"] || "").trim();
        let currentBonus = 0;
        if (bonusType === "Fight of the Night" || bonusType === "Match of the Night") {
            currentBonus = BONUS_VALUE;
        } else if (isWinner && (bonusType === "KO of the Night" || bonusType === "Submission of the Night")) {
            currentBonus = BONUS_VALUE;
        }
        const earnings = (isWinner || match.Winner === "Draw") ? (purse + currentBonus) : (purse / 2 + currentBonus);
        totalEarnings += earnings;
        if (isWinner) wins++;
        if (currentBonus > 0) bonusCount++;
    });
    return { totalEarnings, wins, bonusCount, history };
}

async function loadFighters() {
    const container = document.getElementById("fighters-container");
    try {
        const [fighterRes, eventRes] = await Promise.all([fetch(fighterURL), fetch(eventURL)]);
        if (!fighterRes.ok || !eventRes.ok) throw new Error(`HTTP error!`);
        fightersData = await fighterRes.json();
        eventData = await eventRes.json();
        container.innerHTML = "";
        fightersData.forEach(fighter => {
            if (!fighter.Fighter) return;
            const stats = calculateFighterStats(fighter.Fighter, eventData);
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <h2>${fighter.Fighter}</h2>
                <p>Record: ${fighter.Wins} W - ${fighter.Losses} L - ${fighter.Draws} D</p>
                <p><strong>Total Calculated Earnings: $${stats.totalEarnings.toLocaleString()}</strong></p>
                <button onclick="openModal('${fighter.Fighter}')">View Bio & Fight History</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error loading fighter data. Check sheet permissions and column names.</p>`;
        console.error("Fighter load error:", error);
    }
}

async function loadEvents() {
    const container = document.getElementById("events-container");
    try {
        const res = await fetch(eventURL);
        if (!res.ok) throw new Error(`HTTP error!`);
        const data = await res.json();
        // *** DEBUGGING: Let's see the raw data from the sheet ***
        console.log("Fetched Event Data:", data); 
        container.innerHTML = "";
        const groupedByEvent = data.reduce((acc, row) => {
            if (row.Event) {
                if (!acc[row.Event]) acc[row.Event] = [];
                acc[row.Event].push(row);
            }
            return acc;
        }, {});
        Object.keys(groupedByEvent).forEach(eventName => {
            const eventCard = document.createElement("div");
            eventCard.className = "event-card";
            const title = document.createElement("h2");
            title.className = "event-title";
            title.innerHTML = `🔥 ${eventName}`;
            const matchesContainer = document.createElement("div");
            matchesContainer.className = "matches-container";
            groupedByEvent[eventName].forEach(match => {
                const ratingText = match["Match Rating"] || "0%";
                const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
                const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
                const winner = match.Winner;
                const fighterA = match["Fighter A"];
                const fighterB = match["Fighter B"];
                const bonusType = (match["Bonus Type"] || "").trim();
                // *** DEBUGGING: Check what bonus type is being found for each match ***
                if(bonusType) console.log(`Match: ${fighterA} vs ${fighterB}, Found Bonus Type: '${bonusType}'`);
                const purse = ratingValue * 100;
                let fighterAEarnings = (winner === fighterA || winner === "Draw") ? purse : purse / 2;
                let fighterBEarnings = (winner === fighterB || winner === "Draw") ? purse : purse / 2;
                if (bonusType === "Fight of the Night" || bonusType === "Match of the Night") {
                    fighterAEarnings += BONUS_VALUE;
                    fighterBEarnings += BONUS_VALUE;
                } else if (bonusType === "KO of the Night" || bonusType === "Submission of the Night") {
                    if (winner === fighterA) fighterAEarnings += BONUS_VALUE;
                    if (winner === fighterB) fighterBEarnings += BONUS_VALUE;
                }
                matchesContainer.innerHTML += `
                    <div class="match">
                        <p><strong>${fighterA} vs ${fighterB}</strong></p>
                        <p>🏆 Winner: <span class="winner">${winner}</span></p>
                        <p>⭐ Rating: <span class="rating">${stars}</span> (${ratingText})</p>
                        <p>🎁 Bonus: <span class="winner">${bonusType || "—"} ${bonusType ? '($' + BONUS_VALUE.toLocaleString() + ')' : ''}</span></p>
                        <p>💵 ${fighterA}: $${fighterAEarnings.toLocaleString()} | ${fighterB}: $${fighterBEarnings.toLocaleString()}</p>
                    </div>`;
            });
            title.addEventListener('click', () => {
                matchesContainer.style.display = matchesContainer.style.display === 'block' ? 'none' : 'block';
            });
            eventCard.appendChild(title);
            eventCard.appendChild(matchesContainer);
            container.appendChild(eventCard);
        });
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error loading event data. Check sheet permissions and column names.</p>`;
        console.error("Event load error:", error);
    }
}

function openModal(fighterName) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modal-content");
    content.innerHTML = `<h2>${fighterName}</h2><p>Loading fight history...</p>`;
    modal.style.display = "block";
    const { totalEarnings, wins, bonusCount, history } = calculateFighterStats(fighterName, eventData);
    const fightListHTML = history.map(match => `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - <strong>Winner:</strong> ${match.Winner}</li>`).join("");
    content.innerHTML = `
        <h2>${fighterName}</h2>
        <p><strong>Total Earnings:</strong> $${totalEarnings.toLocaleString()}</p>
        <p><strong>Total Wins:</strong> ${wins} | <strong>Bonuses Earned:</strong> ${bonusCount}</p>
        <h3>Fight History:</h3>
        <ul>${fightListHTML || "<li>No fight history found.</li>"}</ul>
        <button onclick="closeModal()">Close</button>`;
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("fighters-container")) {
        loadFighters();
    }
    if (document.getElementById("events-container")) {
        loadEvents();
    }
});
