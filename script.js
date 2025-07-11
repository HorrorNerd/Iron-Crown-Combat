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

    renderFighters(fighters, events);
    renderEvents(events);
  } catch (error) {
    console.error("Failed to load data:", error);
  }
}

function renderFighters(fighters, events) {
  const container = document.getElementById("fighters-container");
  container.innerHTML = "";

  fighters.forEach(fighter => {
    // Parse earnings safely, fallback to 0
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

function renderEvents(data) {
  const eventsContainer = document.getElementById("events-container");
  eventsContainer.innerHTML = "";

  // Group events by event name
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
    title.tabIndex = 0;
    title.setAttribute("role", "button");
    title.setAttribute("aria-expanded", "false");
    title.style.outline = "none";

    const content = document.createElement("div");
    content.className = "collapsible-content";

    // Toggle collapse
    title.onclick = () => {
      const isShown = content.classList.toggle("show");
      title.setAttribute("aria-expanded", isShown);
    };
    // Also toggle collapse on keyboard Enter or Space for accessibility
    title.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        title.click();
      }
    };

    matches.forEach(match => {
      const matchDiv = document.createElement("div");
      matchDiv.className = "match";

      // Parse match rating and calculate purse (assuming 10000 * rating%)
      let ratingPercent = parseInt(match["Match Rating"].replace("%", "")) || 0;
      const totalPurse = ratingPercent * 100; // 85% => $8,500 approx

      const winner = match.Winner.trim();
      const fighterA = match["Fighter A"].trim();
      const fighterB = match["Fighter B"].trim();

      let aPay = 0, bPay = 0;

      // Determine payout split
      if (winner.toLowerCase() === "draw") {
        // Each gets half total payout (so half winner's full payout + half loser's half)
        aPay = totalPurse / 2 + totalPurse / 4; 
        bPay = totalPurse / 2 + totalPurse / 4;
      } else if (winner === fighterA) {
        aPay = totalPurse;
        bPay = totalPurse / 2;
      } else {
        bPay = totalPurse;
        aPay = totalPurse / 2;
      }

      // Add bonus money if present
      let bonusAmount = 0;
      if (match.Bonus) {
        bonusAmount = Number(match.Bonus.toString().replace(/[^0-9.-]+/g,"")) || 0;
      }
      const bonusType = match["Bonus Type"] || "";

      if (winner === fighterA) {
        aPay += bonusAmount;
      } else if (winner === fighterB) {
        bPay += bonusAmount;
      } else {
        // For draw, split bonus evenly
        aPay += bonusAmount / 2;
        bPay += bonusAmount / 2;
      }

      matchDiv.innerHTML = `
        <p><strong>${fighterA}</strong> vs <strong>${fighterB}</strong></p>
        <p>🏆 Winner: <span class="winner">${winner}</span></p>
        <p>⭐ Match Rating: ${match["Match Rating"]} (${totalPurse.toLocaleString()} total purse)</p>
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
  if (!fighter) {
    modalContent.innerHTML = "<p>Fighter data not found.</p>";
    modal.classList.remove("hidden-section");
    return;
  }
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

// Start the app
fetchData();
