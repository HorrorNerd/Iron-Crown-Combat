// script.js (Final Version with Collapsible Events & Formatting Fix)

// --- CONFIGURATION ---
const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

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


// --- DATA FETCHING ---
async function loadAllData() {
  if (dataLoaded) return;
  const [fighterRes, eventRes] = await Promise.all([
    fetch(fighterURL),
    fetch(eventURL)
  ]);
  fightersData = await fighterRes.json();
  eventData = await eventRes.json();
  dataLoaded = true;
  console.log("All data loaded.");
}

// --- PAGE-SPECIFIC LOGIC ---

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

// --- UPDATED displayEvents Function ---
async function displayEvents() {
  await loadAllData();
  const container = document.getElementById("events-container");
  if (!container) return;
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
      
      // **FIX:** Removed extra dollar sign before template literal
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
    
    // **NEW:** Create the collapsible structure
    eventCard.innerHTML = `
        <h2 class="event-title">🔥 ${eventName}</h2>
        <div class="matches-container">${matchesHTML}</div>
    `;
    container.appendChild(eventCard);
  }

  // **NEW:** Add event listeners for the collapsible behavior
  container.querySelectorAll('.event-title').forEach(title => {
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('active');
    });
  });
}

// --- MODAL LOGIC (with formatting fix) ---
function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  
  const fightHistory = eventData.filter(e => e["Fighter A"] === fighterName || e["Fighter B"] === fighterName);

  let totalEarnings = 0;
  let wins = 0;
  let bonuses = 0;

  const fightListHTML = fightHistory.map(match => {
    const earnings = calculateMatchEarnings(match, fighterName);
    const isWinner = match.Winner === fighterName;
    const hasBonus = ["KO of the Night", "Submission of the Night", "Fight of the Night"].includes((match.Bonus || "").trim());
    
    totalEarnings += earnings;
    if (isWinner) wins++;
    if (hasBonus) bonuses++;
    
    // **FIX:** Removed extra dollar sign
    return `
      <li>${match["Fighter A"]} vs ${match["Fighter B"]} - 
        <strong>Winner:</strong> ${match.Winner} | 
        <strong>Earnings:</strong> $${earnings.toLocaleString()}
      </li>
    `;
  }).join("");

  // **FIX:** Removed extra dollar sign
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
  // A single run point prevents trying to load data twice.
  if (document.getElementById("fighters-container")) {
    displayFighters();
  } else if (document.getElementById("events-container")) {
    displayEvents();
  }
});
