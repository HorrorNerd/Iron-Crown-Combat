const sheetID = "1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU";
const fighterSheet = "Fighter Tracker";
const eventSheet = "Event Results";

const fighterURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(fighterSheet)}`;
const eventURL = `https://opensheet.vercel.app/${sheetID}/${encodeURIComponent(eventSheet)}`;

async function fetchData() {
  try {
    const [fighterRes, eventRes] = await Promise.all([
      fetch(fighterURL),
      fetch(eventURL)
    ]);
    const fighters = await fighterRes.json();
    const events = await eventRes.json();

    window.allFighters = fighters;
    window.allEvents = events;

    renderFighters(fighters);
    renderEvents(events);
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}

function renderFighters(fighters) {
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";

  fighters.forEach(fighter => {
    const earnings = Number(fighter.Earnings) || 0;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${fighter.Fighter}</h2>
      <p>Wins: ${fighter.Wins}</p>
      <p>Losses: ${fighter.Losses}</p>
      <p>Draws: ${fighter.Draws}</p>
      <p>Earnings: $${earnings.toLocaleString()}</p>
      <button onclick="openModal('${fighter.Fighter}')">View Bio</button>
    `;
    container.appendChild(card);
  });
}

function renderEvents(events) {
  const container = document.getElementById("events-container");
  container.innerHTML = "";

  const groupedEvents = {};
  events.forEach(match => {
    if (!groupedEvents[match.Event]) groupedEvents[match.Event] = [];
    groupedEvents[match.Event].push(match);
  });

  Object.entries(groupedEvents).forEach(([eventName, matches]) => {
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";

    const title = document.createElement("h3");
    title.className = "event-title";
    title.textContent = eventName;
    title.style.cursor = "pointer";
    title.tabIndex = 0;
    title.setAttribute("role", "button");
    title.setAttribute("aria-expanded", "false");

    const content = document.createElement("div");
    content.className = "collapsible-content";

    title.onclick = () => {
      const isShown = content.classList.toggle("show");
      title.setAttribute("aria-expanded", isShown);
    };
    title.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        title.click();
      }
    };

    matches.forEach(match => {
      const ratingPercent = parseInt(match["Match Rating"].replace("%", "")) || 0;
      const totalPurse = ratingPercent * 100;

      const winner = match.Winner.trim();
      const fighterA = match["Fighter A"].trim();
      const fighterB = match["Fighter B"].trim();

      let payoutA = 0;
      let payoutB = 0;

      if (winner.toLowerCase() === "draw") {
        payoutA = totalPurse / 2;
        payoutB = totalPurse / 2;
      } else if (winner === fighterA) {
        payoutA = totalPurse;
        payoutB = totalPurse / 2;
      } else {
        payoutB = totalPurse;
        payoutA = totalPurse / 2;
      }

      let bonusAmount = 0;
      if (match.Bonus) {
        bonusAmount = Number(match.Bonus.toString().replace(/[^0-9.-]+/g, "")) || 0;
      }
      const bonusType = match["Bonus Type"] || "";

      if (winner === fighterA) {
        payoutA += bonusAmount;
      } else if (winner === fighterB) {
        payoutB += bonusAmount;
      } else {
        payoutA += bonusAmount / 2;
        payoutB += bonusAmount / 2;
      }

      const matchDiv = document.createElement("div");
      matchDiv.className = "match";
      matchDiv.innerHTML = `
        <p><strong>${fighterA}</strong> vs <strong>${fighterB}</strong></p>
        <p>🏆 Winner: <span class="winner">${winner}</span></p>
        <p>⭐ Match Rating: ${match["Match Rating"]} (${totalPurse.toLocaleString()} total purse)</p>
        <p>💰 ${fighterA}: $${Math.round(payoutA).toLocaleString()} | ${fighterB}: $${Math.round(payoutB).toLocaleString()}</p>
        ${bonusType ? `<p class="award-line">🎖️ ${bonusType} — $${bonusAmount.toLocaleString()}</p>` : ""}
      `;
      content.appendChild(matchDiv);
    });

    eventCard.appendChild(title);
    eventCard.appendChild(content);
    container.appendChild(eventCard);
  });
}

function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const fighter = window.allFighters.find(f => f.Fighter === fighterName);

  if (!fighter) {
    modalContent.innerHTML = "<p>Fighter data not found.</p>";
    modal.classList.remove("hidden-section");
    return;
  }

  const pastFights = window.allEvents.filter(e =>
    e["Fighter A"] === fighterName || e["Fighter B"] === fighterName
  );

  modalContent.innerHTML = `
    <h2>${fighter.Fighter}</h2>
    <p class="bio">${fighter.Bio || "Bio coming soon."}</p>
    <h3>Past Fights:</h3>
    <ul>
      ${pastFights.map(e => {
        const opponent = e["Fighter A"] === fighterName ? e["Fighter B"] : e["Fighter A"];
        return `<li>${fighterName} vs ${opponent} – ${e.Winner === "Draw" ? "Draw" : `Winner: ${e.Winner}`}, Rating: ${e["Match Rating"]}</li>`;
      }).join("")}
    </ul>
    <button onclick="document.getElementById('modal').classList.add('hidden-section')">Close</button>
  `;
  modal.classList.remove("hidden-section");
}

// Show/hide sections
document.getElementById("show-fighters-btn").onclick = () => {
  document.getElementById("fighters-section").classList.add("active-section");
  document.getElementById("fighters-section").classList.remove("hidden-section");
  document.getElementById("events-section").classList.add("hidden-section");
  document.getElementById("events-section").classList.remove("active-section");
};

document.getElementById("show-events-btn").onclick = () => {
  document.getElementById("events-section").classList.add("active-section");
  document.getElementById("events-section").classList.remove("hidden-section");
  document.getElementById("fighters-section").classList.add("hidden-section");
  document.getElementById("fighters-section").classList.remove("active-section");
};

fetchData();
