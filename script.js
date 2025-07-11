const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

// Global store
let eventData = [];

// Load Fighters with modal bios
async function loadFighters() {
  const res = await fetch(fighterURL);
  const fighters = await res.json();
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";

  // Preload event data for earnings and history
  const eventRes = await fetch(eventURL);
  eventData = await eventRes.json();

  fighters.forEach(fighter => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${fighter.Fighter}</h2>
      <p>Wins: ${fighter.Wins}</p>
      <p>Losses: ${fighter.Losses}</p>
      <p>Draws: ${fighter.Draws}</p>
      <p>Earnings (Tracker): $${fighter.Earnings}</p>
      <button onclick="openModal('${fighter.Fighter}')">View Bio</button>`;
    container.appendChild(card);
  });
}

// Modal logic
function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  const history = eventData.filter(e =>
    e["Fighter A"] === fighterName || e["Fighter B"] === fighterName
  );

  let total = 0;
  let wins = 0;
  let bonuses = 0;

  const fightList = history.map(match => {
    const rating = parseInt(match["Match Rating"].replace("%", "")) || 0;
    const purse = rating * 100;
    const isWinner = match.Winner === fighterName;
    const bonusTypes = ["KO of the Night", "Submission of the Night", "Fight of the Night"];
    const hasBonus = bonusTypes.includes((match.Bonus || "").trim());
    const bonus = hasBonus ? 5000 : 0;
    const earnings = isWinner ? purse + bonus : purse * 0.5 + bonus;

    total += earnings;
    if (isWinner) wins++;
    if (hasBonus) bonuses++;

    return `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - 
      <strong>Winner:</strong> ${match.Winner} | 
      <strong>Rating:</strong> ${match["Match Rating"]} | 
      <strong>Bonus:</strong> ${match.Bonus || "—"} | 
      <strong>Earnings:</strong> $${earnings.toLocaleString()}</li>`;
  }).join("");

  content.innerHTML = `
    <h2>${fighterName}</h2>
    <p><strong>Total Dynamic Earnings:</strong> $${total.toLocaleString()}</p>
    <p><strong>Total Wins:</strong> ${wins} | <strong>Bonuses Earned:</strong> ${bonuses}</p>
    <h3>Fight History:</h3>
    <ul>${fightList}</ul>
    <button onclick="closeModal()">Close</button>
  `;
  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

async function loadEvents() {
  const res = await fetch(eventURL);
  const data = await res.json();
  const container = document.getElementById("events-container");
  container.innerHTML = "";
  let grouped = {};
  data.forEach(row => {
    if (!grouped[row.Event]) grouped[row.Event] = [];
    grouped[row.Event].push(row);
  });
  Object.keys(grouped).forEach(eventName => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.innerHTML = `<h2 class="event-title">🔥 ${eventName}</h2>`;
    grouped[eventName].forEach(match => {
      const ratingText = match["Match Rating"] || "0%";
      const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
      const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
      const totalPayout = ratingValue * 100;
      const winner = match.Winner;
      const fighterA = match["Fighter A"];
      const fighterB = match["Fighter B"];
      const bonus = match.Bonus || "—";
      const bonusTypes = ["KO of the Night", "Submission of the Night", "Fight of the Night"];
      const aBonus = bonusTypes.includes(bonus.trim()) ? 5000 : 0;
      const bBonus = aBonus;

      let fighterAEarnings = 0;
      let fighterBEarnings = 0;
      if (winner === fighterA) {
        fighterAEarnings = totalPayout + aBonus;
        fighterBEarnings = totalPayout / 2 + bBonus;
      } else if (winner === fighterB) {
        fighterBEarnings = totalPayout + bBonus;
        fighterAEarnings = totalPayout / 2 + aBonus;
      }

      card.innerHTML += `
        <div class="match">
          <p><strong>${fighterA} vs ${fighterB}</strong></p>
          <p>🏆 Winner: <span class="winner">${winner}</span></p>
          <p>⭐ Rating: <span class="rating">${stars}</span> (${ratingText})</p>
          <p>🎁 Bonus: ${bonus}</p>
          <p>💵 ${fighterA}: $${fighterAEarnings.toLocaleString()} | ${fighterB}: $${fighterBEarnings.toLocaleString()}</p>
        </div>`;
    });
    container.appendChild(card);
  });
}

if (document.getElementById("fighters-container")) loadFighters();
if (document.getElementById("events-container")) loadEvents();
