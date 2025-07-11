console.log("Script loaded");

async function fetchData() {
  console.log("Fetching data...");
  try {
    const response = await fetch("https://opensheet.vercel.app/1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU/Fighter Tracker");
    const data = await response.json();
    console.log("Fighter data:", data);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

fetchData();
