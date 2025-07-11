const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

let eventData = [];

async function loadFighters() {
  const res = await fetch(fighterURL);
  const fighters = await res.json();
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";

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
