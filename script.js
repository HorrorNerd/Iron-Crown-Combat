const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

async function fetchData() {
  const [fighterRes, eventRes] = await Promise.all([
    fetch(fighterURL),
    fetch(eventURL)
  ]);
  const fighters = await fighterRes.json();
  const events = await eventRes.json();
  renderFighters(fighters, events);
  renderEvents(events);
}

function renderFighters(fighters, events) {
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";

  fighters.forEach(fighter => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${fighter.Fighter}</h2>
      <p>Wins: ${fighter.Wins}</p>
      <p>Losses: ${fighter.Losses}</p>
      <p>Draws: ${fighter.Draws}</p>
      <p>Earnings: $${Number(fighter.Earnings).toLocaleString()}</p>
      <button onclick="openModal('${fighter.Fighter}')">View Bio</button>
    `;
    container.appendChild(card);
  });

  window.allFighters = fighters;
  window.allEvents = events;
}

function renderEvents(data) {
  const eventsContainer = document.getElementById("events-container");
  eventsContainer.innerHTML = "";

  const grouped = {};
  data.forEach(entry => {
    if (!grouped[entry.Event]) grouped[entry.Event] = [];
    grouped[entry.Event].push(entry);
  });

  Object.entries(grouped).forEach(([eventName, matches]) => {
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";

    const title = document.createElement("h3");
    title.textContent = eventName;
    title.className = "event-title";
    title.onclick = () => {
      content.classList.toggle("hidden");
    };

    const content = document.createElement("div");
    content.className = "collapsible-content hidden";

    matches.forEach(match => {
      const matchDiv = document.createElement("div");
      matchDiv.className = "match";

      const rating = parseInt(match["Match Rating"]) || 0;
      const payout = rating * 100;
      const winner = match.Winner.trim();
      const fighterA = match["Fighter A"].trim();
      const fighterB = match["Fighter B"].trim();

      let aPay = 0, bPay = 0;
      if (winner === "Draw") {
        aPay = bPay = payout; // each gets half the total
      } else if (winner === fighterA) {
        aPay = payout;
        bPay = payout / 2;
      } else {
        bPay = payout;
        aPay = payout / 2;
      }

      // Add bonus if present
      const bonusAmount = match["Bonus"] ? parseInt(match["Bonus"].replace(/[^0-9]/g, '')) : 0;
      const bonusType = match["Bonus Type"] || "";
      if (winner === fighterA) aPay += bonusAmount;
      else if (winner === fighterB) bPay += bonusAmount;
      else {
        aPay += bonusAmount / 2;
        bPay += bonusAmount / 2;
      }

      matchDiv.innerHTML = `
        <p><strong>${fighterA}</strong> vs <strong>${fighterB}</strong></p>
        <p>🏆 Winner: <span class="winner">${winner}</span></p>
        <p>⭐ Rating: ${match["Match Rating"]} (${payout.toLocaleString()} total purse)</p>
        <p>💰 ${fighterA}: $${Math.round(aPay).toLocaleString()} | ${fighterB}: $${Math.round(bPay).toLocaleString()}</p>
        ${bonusType ? `<p class="award-line">🎖️ ${bonusType} — $${bonusAmount.toLocaleString()}</p>` : ""}
      `;
      content.appendChild(matchDiv);
    });

    eventCard.appendChild(title);
    eventCard.appendChild(content);
    eventsContainer.appendChild(eventCard);
  });
}

function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const fighter = window.allFighters.find(f => f.Fighter === fighterName);
  const events = window.allEvents.filter(e =>
    e["Fighter A"] === fighterName || e["Fighter B"] === fighterName
  );

  modalContent.innerHTML = `
    <h2>${fighter.Fighter}</h2>
    <p class="bio">${fighter.Bio || "Bio coming soon."}</p>
    <h3>Past Fights:</h3>
    <ul>
      ${events.map(e => {
        const opponent = e["Fighter A"] === fighterName ? e["Fighter B"] : e["Fighter A"];
        return `<li>${fighterName} vs ${opponent} – ${e.Winner === "Draw" ? "Draw" : `Winner: ${e.Winner}`}, Rating: ${e["Match Rating"]}</li>`;
      }).join("")}
    </ul>
    <button onclick="document.getElementById('modal').classList.add('hidden-section')">Close</button>
  `;
  modal.classList.remove("hidden-section");
}

fetchData();// TODO: Add JavaScript logic for loading fighters and events
