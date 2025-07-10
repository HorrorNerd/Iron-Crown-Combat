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

function openModal(fighterName) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");

  const bios = {
    "Master Bo Quin": "A 65-year-old Wing Chun master known for ruthless counters and the mythical Five Point Exploding Heart Palm Strike.",
    "Ayame Kurogane": "A fiery New Yorker with a sharp wit and a sharper striking game, Ayame blends modern MMA with street toughness.",
    "Reiko Draven": "Silent but savage, Reiko carves her legacy with cold precision and crushing submissions. The mat is her kingdom.",
    "Jakob Rivera": "A tactical wrestler with quick grappling skills and a rising star in the league.",
    "Johnny Decade": "A veteran brawler known for his resilience and knockout power.",
    "Ind V": "Part of a dynamic tag team, known for high-energy offense and teamwork.",
    "Harlem Hustle": "Tag team specialists with a flair for showmanship and ruthless tactics.",
    "Darius Max": "A dominant tag division fighter, relying on power and ring intelligence.",
  };

  const history = eventData.filter(e =>
    e["Fighter A"] === fighterName || e["Fighter B"] === fighterName
  );

  let total = 0;
  let wins = 0;
  let bonuses = 0;

  const fightList = history.map(match => {
    const rating = parseInt(match["Match Rating"].replace("%", "")) || 0;
    const payout = rating * 100;
    const winner = match.Winner;
    const isDraw = winner === "Draw";
    const bonusType = match.Bonus?.trim();
    const hasBonus = ["KO of the Night", "Submission of the Night", "Fight of the Night"].includes(bonusType);
    const bonusAmount = hasBonus ? 5000 : 0;

    let earnings = 0;

    if (isDraw) {
      earnings = (payout / 2) + (bonusAmount / 2);
    } else if (winner === fighterName) {
      earnings = payout + bonusAmount;
      wins++;
    } else {
      earnings = (payout / 2) + bonusAmount;
    }

    if (hasBonus) bonuses++;

    total += earnings;

    return `<li>${match["Fighter A"]} vs ${match["Fighter B"]} - 
      <strong>Winner:</strong> ${match.Winner} | 
      <strong>Rating:</strong> ${match["Match Rating"]} | 
      <strong>Award:</strong> ${hasBonus ? bonusType + " ($5,000)" : "— ($0)"} | 
      <strong>Earnings:</strong> $${earnings.toLocaleString()}</li>`;
  }).join("");

  const bio = bios[fighterName] || "This fighter’s story is still being written.";

  content.innerHTML = `
    <h2>${fighterName}</h2>
    <p class="bio">${bio}</p>
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

    const header = document.createElement("h2");
    header.className = "event-title collapsible";
    header.textContent = `🔥 ${eventName}`;
    header.style.cursor = "pointer";

    const contentDiv = document.createElement("div");
    contentDiv.className = "collapsible-content hidden";

    grouped[eventName].forEach(match => {
      const ratingText = match["Match Rating"] || "0%";
      const ratingValue = parseInt(ratingText.replace("%", "")) || 0;
      const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(ratingValue / 20), 10 - Math.round(ratingValue / 20));
      const payout = ratingValue * 100;
      const fighterA = match["Fighter A"];
      const fighterB = match["Fighter B"];
      const winner = match.Winner;
      const bonusType = match.Bonus?.trim();
      const hasBonus = ["KO of the Night", "Submission of the Night", "Fight of the Night"].includes(bonusType);
      const bonusAmount = hasBonus ? 5000 : 0;

      let fighterAEarnings = 0;
      let fighterBEarnings = 0;

      if (winner === "Draw") {
        fighterAEarnings = (payout / 2) + (bonusAmount / 2);
        fighterBEarnings = (payout / 2) + (bonusAmount / 2);
      } else if (winner === fighterA) {
        fighterAEarnings = payout + bonusAmount;
        fighterBEarnings = (payout / 2) + bonusAmount;
      } else if (winner === fighterB) {
        fighterBEarnings = payout + bonusAmount;
        fighterAEarnings = (payout / 2) + bonusAmount;
      }

      const matchDiv = document.createElement("div");
      matchDiv.className = "match";
      matchDiv.innerHTML = `
        <p><strong>${fighterA} vs ${fighterB}</strong></p>
        <p>🏆 Winner: <span class="winner">${winner}</span></p>
        <p>⭐ Rating: <span class="rating">${stars}</span> (${ratingText})</p>
        <p>🎁 Award: ${hasBonus ? bonusType + " ($5,000)" : "— ($0)"}</p>
        <p>💵 ${fighterA}: $${fighterAEarnings.toLocaleString()} | ${fighterB}: $${fighterBEarnings.toLocaleString()}</p>
      `;
      contentDiv.appendChild(matchDiv);
    });

    card.appendChild(header);
    card.appendChild(contentDiv);
    container.appendChild(card);

    header.addEventListener("click", () => {
      contentDiv.classList.toggle("hidden");
    });
  });
}

if (document.getElementById("fighters-container")) loadFighters();
if (document.getElementById("events-container")) loadEvents();
