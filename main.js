// --- START OF FILE script.js ---

const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

// Construct the URLs for fetching data via opensheet.vercel.app
const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

// Global store to hold event data so we don't have to re-fetch it constantly
let eventData = [];
let fightersData = [];

// --- Fighter Page Logic ---
async function loadFighters() {
    const container = document.getElementById("fighters-container");
    try {
        // Fetch both sets of data at the same time for efficiency
        const [fighterRes, eventRes] = await Promise.all([
            fetch(fighterURL),
            fetch(eventURL)
        ]);

        if (!fighterRes.ok || !eventRes.ok) {
            throw new Error(`Failed to load sheet data. Check Sheet ID and names.`);
        }

        fightersData = await fighterRes.json();
        eventData = await eventRes.json();
        container.innerHTML = ""; // Clear "Loading..." message

        fightersData.forEach(fighter => {
            if (!fighter.Fighter) return; // Skip empty rows

            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <h2>${fighter.Fighter}</h2>
                <p>Record: ${fighter.Wins} W - ${fighter.Losses} L - ${fighter.Draws} D</p>
                <p>Static Earnings (from sheet): $${parseInt(fighter.Earnings || 0).toLocaleString()}</p>
                <button onclick="openModal('${fighter.Fighter}')">View Bio & Fight History</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error loading fighter data. Please check the sheet permissions (must be 'Anyone with the link can view') and ensure sheet names are correct.</p><p><small>${error.message}</small></p>`;
        console.error("Error in loadFighters:", error);
    }
}

// --- Event Page Logic ---
async function loadEvents() {
    const container = document.getElementById("events-container");
    try {
        const res = await fetch(eventURL);
        if (!res.ok) {
            throw new Error(`Failed to load event data. Check Sheet ID and name.`);
        }
        const data = await res.json();
        container.innerHTML = ""; // Clear "Loading..." message

        // Group matches by event name
        const groupedByEvent = data.reduce((acc, row) => {
            if (!row.Event) return acc;
            if (!acc[row.Event]) acc[row.Event] = [];
            acc[row.Event].push(row);
            return acc;
        }, {});

        Object.keys(groupedByEvent).forEach(eventName => {
            const card = document.createElement("div");
            card.className = "event-card";
            card.innerHTML = `<h2 class="event-title">🔥 ${eventName}</h2>`;

            groupedByEvent[eventName].forEach(match => {
                const ratingText = match["Match Rating"] || "0%";
                const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
                const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
                
                const winner = match.Winner;
                const fighterA = match["Fighter A"];
                const fighterB = match["Fighter B"];
                const bonusType = (match.Bonus || "").trim();
                const purse = ratingValue * 100;

                // Improved earnings calculation
                let fighterAEarnings = (winner === fighterA || winner === "Draw") ? purse : purse / 2;
                let fighterBEarnings = (winner === fighterB || winner === "Draw") ? purse : purse / 2;

                if (bonusType === "Fight of the Night") {
                    fighterAEarnings += 5000;
                    fighterBEarnings += 5000;
                } else if (bonusType === "KO of the Night" || bonusType === "Submission of the Night") {
                    if (winner === fighterA) fighterAEarnings += 5000;
                    if (winner === fighterB) fighterBEarnings += 5000;
                }

                card.innerHTML += `
                    <div class="match">
                        <p><strong>${fighterA} vs ${fighterB}</strong></p>
                        <p>🏆 Winner: <span class="winner">${winner}</span></p>
                        <p>⭐ Rating: <span class="rating">${stars}</span> (${ratingText})</p>
                        <p>🎁 Bonus: ${bonusType || "—"}</p>
                        <p>💵 ${fighterA}: $${fighterAEarnings.toLocaleString()} | ${fighterB}: $${fighterBEarnings.toLocaleString()}</p>
                    </div>`;
            });
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error loading event data. Please check the sheet permissions (must be 'Anyone with the link can view') and ensure the event sheet name is correct.</p><p><small>${error.message}</small></p>`;
        console.error("Error in loadEvents:", error);
    }
}

// --- Modal Logic (for Fighter Bios) ---
function openModal(fighterName) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modal-content");
    
    // Show a loading state immediately
    content.innerHTML = `<h2>${fighterName}</h2><p>Calculating fight history...</p><button onclick="closeModal()">Close</button>`;
    modal.style.display = "block";

    // Filter through the globally stored event data to find this fighter's matches
    const history = eventData.filter(e =>
        e["Fighter A"] === fighterName || e["Fighter B"] === fighterName
    );

    let totalEarnings = 0;
    let wins = 0;
    let bonuses = 0;

    const fightListHTML = history.map(match => {
        const rating = parseInt(match["Match Rating"].replace("%", "")) || 0;
        const purse = rating * 100;
        const isWinner = match.Winner === fighterName;
        const bonusType = (match.Bonus || "").trim();
        let currentBonus = 0;

        if (bonusType === "Fight of the Night" || (isWinner && (bonusType === "KO of the Night" || bonusType === "Submission of the Night"))) {
            currentBonus = 5000;
        }

        const earnings = (isWinner || match.Winner === "Draw") ? (purse + currentBonus) : (purse / 2 + currentBonus);

        totalEarnings += earnings;
        if (isWinner) wins++;
        if (currentBonus > 0) bonuses++;

        return `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - 
            <strong>Winner:</strong> ${match.Winner} | 
            <strong>Earnings:</strong> $${earnings.toLocaleString()}
            ${bonusType ? `(Bonus: ${bonusType})` : ''}
          </li>`;
    }).join("");

    // Update the modal with the calculated data
    content.innerHTML = `
        <h2>${fighterName}</h2>
        <p><strong>Total Calculated Earnings:</strong> $${totalEarnings.toLocaleString()}</p>
        <p><strong>Total Wins:</strong> ${wins} | <strong>Bonuses Earned:</strong> ${bonuses}</p>
        <h3>Fight History:</h3>
        <ul>${fightListHTML || "<li>No fight history found.</li>"}</ul>
        <button onclick="closeModal()">Close</button>
    `;
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// --- Initializer ---
// This runs when the page loads. It checks which page we're on and calls the correct function.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("fighters-container")) {
        loadFighters();
    }
    if (document.getElementById("events-container")) {
        loadEvents();
    }
});
