// script.js (Final Refactored Version)

// --- CONFIGURATION ---
const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

// --- GLOBAL DATA STORE ---
// We use a global variable to store event data so we don't have to re-fetch it.
let eventData = [];
let fightersData = [];
let dataLoaded = false;

// --- CORE LOGIC: Reusable Earnings Calculator ---
// This is the single source of truth for all earnings calculations.
// It fixes the logical error of having two different calculation methods.
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
  } else { // Handle draws or no-contests
    earnings.a = purse / 2;
    earnings.b = purse / 2;
  }

  // If we are calculating for a specific fighter, return their earnings.
  if (fighterName) {
    if (fighterName === fighterA) return earnings.a;
    if (fighterName === fighterB) return earnings.b;
  }
  
  // Otherwise, return earnings for both.
  return earnings;
}


// --- DATA FETCHING ---
async function loadAllData() {
  if (dataLoaded) return; // Don't load data if it's already here
  
  // Use Promise.all to fetch both sheets at the same time for speed
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

// Function to build and display the fighter cards
async function displayFighters() {
  await loadAllData();
  const container = document.getElementById("fighters-container");
  container.innerHTML = ""; // Clear "Loading..." text

  fightersData.forEach(fighter => {
    const card = document.createElement("div");
    card.className = "card";
    
    // We use data-attributes to safely pass the fighter's name
    card.innerHTML = `
      <h2>${fighter.Fighter}</h2>
      <p>Wins: ${fighter.Wins}</p>
      <p>Losses: ${fighter.Losses}</p>
      <p>Draws: ${fighter.Draws}</p>
      <button class="view-bio-btn" data-fighter-name="${fighter.Fighter}">View Bio</button>
    `;
    container.appendChild(card);
  });
  
  // Add event listeners to all bio buttons AFTER they are created
  document.querySelectorAll('.view-bio-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      openModal(event.target.dataset.fighterName);
    });
  });
}

// Function to build and display the event cards
async function displayEvents() {
  await loadAllData();
  const container = document.getElementById("events-container");
  container.innerHTML = ""; // Clear "Loading..." text

  // Group matches by event name
  const groupedByEvent = eventData.reduce((acc, match) => {
    const eventName = match.Event;
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(match);
    return acc;
  }, {});

  // Create a card for each event
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
    
    eventCard.innerHTML = `<h2 class="event-title">🔥 ${eventName}</h2>${matchesHTML}`;
    container.appendChild(eventCard);
  }
}

// --- MODAL LOGIC ---
function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  
  // Find all matches for the selected fighter
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
    
    return `
      <li>${match["Fighter A"]} vs ${match["Fighter B"]} - 
        <strong>Winner:</strong> ${match.Winner} | 
        <strong>Earnings:</strong> $${earnings.toLocaleString()}
      </li>
    `;
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
  
  // Add listener to the new close button
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// --- INITIALIZATION ---
// This checks which page we're on and calls the correct function.
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById("fighters-container")) {
    displayFighters();
  }
  if (document.getElementById("events-container")) {
    displayEvents();
  }
});
