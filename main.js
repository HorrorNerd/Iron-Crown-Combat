// main.js (Final Version with Spreadsheet Logic)

// --- CONFIGURATION ---
const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const spreadsheetURL = `https://opensheet.vercel.app/${sheetID}`;

// --- GLOBAL DATA STORE ---
let eventData = [];
let fightersData = [];
let dataLoaded = false;

// --- CORE LOGIC: Replicating the Spreadsheet Formula ---
// This new function precisely follows your rules for purse, splits, and bonuses.
function calculateMatchEarnings(match) {
    // 1. Calculate the base purse from the match rating.
    // "95%" -> 95 -> 0.95. If rating is missing, default to 0.
    const ratingDecimal = (parseFloat(match["Match Rating"]) || 0) / 100;
    const basePurse = ratingDecimal * 10000;

    // 2. Determine fighter earnings based on the outcome.
    const winner = match.Winner;
    const fighterA = match["Fighter A"];
    const fighterB = match["Fighter B"];
    let purseA = 0;
    let purseB = 0;

    if (winner === "Draw") {
        // Rule 3: Both fighters split the purse in a draw.
        purseA = basePurse * 0.5;
        purseB = basePurse * 0.5;
    } else if (winner === fighterA) {
        // Rule 2: Winner gets 100%, loser gets 50%.
        purseA = basePurse;
        purseB = basePurse * 0.5;
    } else if (winner === fighterB) {
        // Rule 2: Winner gets 100%, loser gets 50%.
        purseB = basePurse;
        purseA = basePurse * 0.5;
    }

    // 3. Calculate bonuses.
    const award = (match.Bonus || "").trim();
    let bonusA = 0;
    let bonusB = 0;
    if (award === "Fight of the Night") {
        // Special case: Both fighters get the bonus.
        bonusA = 5000;
        bonusB = 5000;
    } else if (award === "KO of the Night" || award === "Submission of the Night") {
        // Only the winner gets the bonus.
        if (winner === fighterA) bonusA = 5000;
        if (winner === fighterB) bonusB = 5000;
    }

    // 4. Return the total earnings for each fighter.
    return {
        earningsA: purseA + bonusA,
        earningsB: purseB + bonusB
    };
}


// --- DATA FETCHING ---
async function loadAllData() {
    if (dataLoaded) return;
    try {
        const response = await fetch(spreadsheetURL);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const allSheets = await response.json();
        
        fightersData = allSheets['Fighter Tracker'];
        eventData = allSheets['Event Results'];

        if (!fightersData || !eventData) {
            console.error("Could not find 'Fighter Tracker' or 'Event Results' sheets.", allSheets);
            return;
        }
        dataLoaded = true;
    } catch (error) {
        console.error("Failed to load spreadsheet data:", error);
    }
}


// --- PAGE-SPECIFIC RENDER FUNCTIONS ---

async function displayEvents() {
    await loadAllData();
    const container = document.getElementById("events-container");
    if (!container || !eventData) return;
    container.innerHTML = "";

    const groupedByEvent = eventData.reduce((acc, match) => {
        const eventName = match.Event;
        if (!acc[eventName]) acc[eventName] = [];
        acc[eventName].push(match);
        return acc;
    }, {});

    for (const eventName in groupedByEvent) {
        const eventCard = document.createElement("div");
        eventCard.className = "event-card";
        
        let matchesHTML = '';
        groupedByEvent[eventName].forEach(match => {
            // Use the new, accurate calculation function
            const { earningsA, earningsB } = calculateMatchEarnings(match);
            
            const ratingValue = parseInt((match["Match Rating"] || "0%").replace("%", ""));
            const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
            
            // **FIX:** Display the specific award, or nothing if there's no award.
            const awardHTML = match.Bonus ? `<p>🎁 Award: ${match.Bonus}</p>` : '';

            matchesHTML += `
                <div class="match">
                    <p><strong>${match["Fighter A"]} vs ${match["Fighter B"]}</strong></p>
                    <p>🏆 Winner: <span class="winner">${match.Winner || "Draw/NC"}</span></p>
                    <p>⭐ Rating: <span class="rating">${stars}</span> (${match["Match Rating"] || "N/A"})</p>
                    ${awardHTML}
                    <p>💵 ${match["Fighter A"]}: $${earningsA.toLocaleString()} | ${match["Fighter B"]}: $${earningsB.toLocaleString()}</p>
                </div>
            `;
        });
        
        eventCard.innerHTML = `
            <h2 class="event-title">🔥 ${eventName}</h2>
            <div class="matches-container">${matchesHTML}</div>
        `;
        container.appendChild(eventCard);
    }

    container.querySelectorAll('.event-title').forEach(title => {
        title.addEventListener('click', () => title.parentElement.classList.toggle('active'));
    });
}

async function displayFighters() {
    await loadAllData();
    const container = document.getElementById("fighters-container");
    if (!container) return;
    container.innerHTML = "";

    fightersData.forEach(fighter => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h2>${fighter.Fighter}</h2>
            <p>Wins: ${fighter.Wins}</p>
            <p>Losses: ${fighter.Losses}</p>
            <p>Draws: ${fighter.Draws}</p>
            <button class="view-bio-btn" data-fighter-name="${fighter.Fighter}">View Bio</button>
        `;
        container.appendChild(card);
    });
  
    document.querySelectorAll('.view-bio-btn').forEach(button => {
        button.addEventListener('click', (event) => openModal(event.target.dataset.fighterName));
    });
}


// --- MODAL LOGIC ---
function openModal(fighterName) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modal-content");
  
    const fightHistory = eventData.filter(e => e["Fighter A"] === fighterName || e["Fighter B"] === fighterName);
    
    let totalEarnings = 0, wins = 0, bonuses = 0;

    const fightListHTML = fightHistory.map(match => {
        const { earningsA, earningsB } = calculateMatchEarnings(match);
        let myEarnings = 0;

        // Determine if the fighter was A or B to grab their specific earnings for this match.
        if (match["Fighter A"] === fighterName) {
            myEarnings = earningsA;
        } else if (match["Fighter B"] === fighterName) {
            myEarnings = earningsB;
        }

        totalEarnings += myEarnings;
        
        if (match.Winner === fighterName) wins++;
        
        const award = (match.Bonus || "").trim();
        if (award === "Fight of the Night" || (award && match.Winner === fighterName)) {
            bonuses++;
        }

        return `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - <strong>Earnings:</strong> $${myEarnings.toLocaleString()}</li>`;
    }).join("");

    content.innerHTML = `
        <button id="close-modal-btn">×</button>
        <h2>${fighterName}</h2>
        <p><strong>Total Calculated Earnings:</strong> $${totalEarnings.toLocaleString()}</p>
        <p><strong>Total Wins:</strong> ${wins} | <strong>Bonuses Earned:</strong> ${bonuses}</p>
        <h3>Fight History:</h3>
        <ul>${fightListHTML}</ul>
    `;
  
    modal.style.display = "block";
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("fighters-container")) {
        displayFighters();
    } else if (document.getElementById("events-container")) {
        displayEvents();
    }
});
