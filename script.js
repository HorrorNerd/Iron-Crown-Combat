const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Tracker";

// Convert to usable JSON via opensheet.vercel.app
const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

async function loadFighters() {
  const res = await fetch(fighterURL);
  const data = await res.json();
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";
  data.forEach(fighter => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${fighter.Fighter}</h2>
      <p>Wins: ${fighter.Wins}</p>
      <p>Losses: ${fighter.Losses}</p>
      <p>Draws: ${fighter.Draws}</p>
      <p>Earnings: $${fighter.Earnings}</p>`;
    container.appendChild(card);
  });
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
    card.className = "card";
    card.innerHTML = `<h2>${eventName}</h2>`;
    grouped[eventName].forEach(match => {
      card.innerHTML += `<p><strong>${match["Fighter A"]} vs ${match["Fighter B"]}</strong> — Winner: ${match.Winner} | Rating: ${match["Match Rating"]} | Bonus: ${match.Bonus}</p>`;
    });
    container.appendChild(card);
  });
}

if (document.getElementById("fighters-container")) loadFighters();
if (document.getElementById("events-container")) loadEvents();
