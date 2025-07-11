// main.js (Final Corrected Version)

// --- CONFIGURATION ---
const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
// We only need the main ID now, as we will fetch all sheets at once.
const spreadsheetURL = `https://opensheet.vercel.app/${sheetID}`;

// --- GLOBAL DATA STORE ---
let eventData = [];
let fightersData = [];
let dataLoaded = false;

// --- CORE LOGIC: Reusable Earnings Calculator ---
function calculateMatchEarnings(match, fighterName = null) {
  const ratingText = match["Match Rating"] || "0%";
  const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
  const purse = ratingValue * 100;
  
  const bonusTypes = ["KO of the Night", "Submission of the Night", "Fight of the Night"];
  const hasBonus = bonusTypes.includes((match.Bonus || "").trim());
  const bonusAmount = hasBonus ? 5000 : 0;
  
  const winner = match.Winner;
  const fighterA = match["Fighter A"];
  const fighterB = match["Fighter B"];
  
  let earnings = { a: 0, b: 0 };
  
  if (winner === fighterA) {
    earnings.a = purse + bonusAmount;
    earnings.b = purse / 2;
  } else if (winner === fighterB) {
    earnings.b = purse + bonusAmount;
    earnings.a = purse / 2;
  } else {
    earnings.a = purse / 2;
    earnings.b = purse / 2;
  }

  if (fighterName) {
    if (fighterName === fighterA) return earnings.a;
    if (fighterName === fighterB) return earnings.b;
  }
  
  return earnings;
}


// --- DATA FETCHING (Corrected) ---
async function loadAllData() {
  if (dataLoaded) return;
  try {
    // **FIX:** Fetch the entire spreadsheet just once.
    const response = await fetch(spreadsheetURL);
    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const allSheets = await response.json();

    // **FIX:** Assign the correct sheet data from the returned object.
    fightersData = allSheets['Fighter Tracker'];
    eventData = allSheets['Event Results'];

    if (!fightersData || !eventData) {
        console.error("Could not find 'Fighter Tracker' or 'Event Results' sheets in the data.", allSheets);
        return;
    }
    
    dataLoaded = true;
    console.log("All data loaded and assigned correctly.");
  } catch (error) {
    console.error("Failed to load or parse spreadsheet data:", error);
  }
}

// --- PAGE-SPECIFIC RENDER FUNCTIONS (No changes needed here) ---

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
    button.addEventListener('click', (event) => {
      openModal(event.target.dataset.fighterName);
    });
  });
}

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
      const { a: fighterAEarnings, b: fighterBEarnings } = calculateMatchEarnings(match);
      const ratingValue = parseInt((match["Match Rating"] || "0%").replace("%", ""));
      const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
      
      matchesHTML += `
        <div class="match">
          <p><strong>${match["Fighter A"]} vs ${match["Fighter B"]}</strong></p>
          <p>🏆 Winner: <span class="winner">${match.Winner || "Draw/NC"}</span></p>
          <p>⭐ Rating: <span class="rating">${stars}</span> (${match["Match Rating"] || "N/A"})</p>
          <p>🎁 Bonus: ${match.Bonus || "—"}</p>
          <p>💵 ${match["Fighter A"]}: $${fighterAEarnings.toLocaleString()} | ${match["Fighter B"]}: $${fighterBEarnings.toLocaleString()}</p>
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
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('active');
    });
  });
}

// --- MODAL LOGIC (No changes needed here) ---
function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  
  const fightHistory = eventData.filter(e => e["Fighter A"] === fighterName || e["Fighter B"] === fighterName);
  let totalEarnings = 0, wins = 0, bonuses = 0;

  const fightListHTML = fightHistory.map(match => {
    const earnings = calculateMatchEarnings(match, fighterName);
    if (match.Winner === fighterName) wins++;
    if (["KO of the Night", "Submission of the Night", "Fight of the Night"].includes((match.Bonus || "").trim())) bonuses++;
    totalEarnings += earnings;
    return `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - <strong>Earnings:</strong> $${earnings.toLocaleString()}</li>`;
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
