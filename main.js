// main.js (Final Corrected Version - More Robust)

// --- CONFIGURATION ---
const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const spreadsheetURL = `https://opensheet.vercel.app/${sheetID}`;

// --- GLOBAL DATA STORE ---
let eventData = [];
let fightersData = [];

// --- CORE LOGIC: Replicating the Spreadsheet Formula ---
function calculateMatchEarnings(match) {
    const ratingDecimal = (parseFloat(match["Match Rating"]) || 0) / 100;
    const basePurse = ratingDecimal * 10000;

    const winner = match.Winner;
    const fighterA = match["Fighter A"];
    const fighterB = match["Fighter B"];
    let purseA = 0, purseB = 0;

    if (winner === "Draw") {
        purseA = basePurse * 0.5;
        purseB = basePurse * 0.5;
    } else if (winner === fighterA) {
        purseA = basePurse;
        purseB = basePurse * 0.5;
    } else if (winner === fighterB) {
        purseB = basePurse;
        purseA = basePurse * 0.5;
    }

    const award = (match.Bonus || "").trim();
    let bonusA = 0, bonusB = 0;
    if (award === "Fight of the Night") {
        bonusA = 5000;
        bonusB = 5000;
    } else if (award === "KO of the Night" || award === "Submission of the Night") {
        if (winner === fighterA) bonusA = 5000;
        if (winner === fighterB) bonusB = 5000;
    }
    
    return {
        earningsA: purseA + bonusA,
        earningsB: purseB + bonusB
    };
}


// --- DATA FETCHING (Corrected and Robust) ---
async function loadAllData() {
    // If data is already loaded, we don't need to do anything.
    if (fightersData.length > 0 && eventData.length > 0) {
        return true;
    }

    try {
        const response = await fetch(spreadsheetURL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const allSheets = await response.json();

        // **THE FIX:** Check if the expected sheet names exist as keys in the response.
        if (allSheets && allSheets['Fighter Tracker'] && allSheets['Event Results']) {
            fightersData = allSheets['Fighter Tracker'];
            eventData = allSheets['Event Results'];
            console.log("Data loaded successfully.");
            return true; // Indicate success
        } else {
            // Throw an error if the data structure is not what we expect.
            throw new Error("API response did not contain the expected sheet names.");
        }
    } catch (error) {
        console.error("Failed to load spreadsheet data:", error);
        // Display an error message to the user on the page.
        const container = document.getElementById("events-container") || document.getElementById("fighters-container");
        if(container) container.innerHTML = `<p style="color: red;">Error: Could not load data from the spreadsheet. Please try again later.</p>`;
        return false; // Indicate failure
    }
}


// --- PAGE-SPECIFIC RENDER FUNCTIONS ---

async function displayEvents() {
    const container = document.getElementById("events-container");
    if (!container) return;

    // Wait for data and check if loading was successful.
    const success = await loadAllData();
    if (!success) return; // Stop if data loading failed.

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
            const { earningsA, earningsB } = calculateMatchEarnings(match);
            const ratingValue = parseInt((match["Match Rating"] || "0%").replace("%", ""));
            const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
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
        
        eventCard.innerHTML = `<h2 class="event-title">🔥 ${eventName}</h2><div class="matches-container">${matchesHTML}</div>`;
        container.appendChild(eventCard);
    }

    container.querySelectorAll('.event-title').forEach(title => {
        title.addEventListener('click', () => title.parentElement.classList.toggle('active'));
    });
}

async function displayFighters() {
    const container = document.getElementById("fighters-container");
    if (!container) return;

    const success = await loadAllData();
    if (!success) return;

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
        let myEarnings = (match["Fighter A"] === fighterName) ? earningsA : earningsB;
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
    if (document.getElementById("events-container")) {
        displayEvents();
    } else if (document.getElementById("fighters-container")) {
        displayFighters();
    }
});
