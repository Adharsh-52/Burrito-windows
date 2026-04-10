const grid = document.getElementById("grid");
const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");

let totalSaved = 0;

// 🔥 LIVE PROGRESS
window.burritoApp.onProgress((data) => {
  const percent = Math.round((data.current / data.total) * 100);
  progressBar.style.width = percent + "%";

  const saved = ((data.before - data.after) / data.before * 100).toFixed(1);
  totalSaved += (data.before - data.after);

  status.textContent =
    `${data.current}/${data.total} • ${data.file} ↓${saved}%`;

});

// ================= CORE =================

async function pickFiles() {
  const paths = await window.burritoApp.pickImages();
  if (!paths.length) return;

  status.textContent = "Processing...";

  const files = paths.map(p => ({
    path: p,
    name: p.split(/[/\\]/).pop()
  }));

  const results = await window.burritoApp.optimizeImages({
    filePaths: files.map(f => f.path),
    format: "webp",
    settings: { pngQuality: 80, webpQuality: 80 }
  });

  renderResults(results);

  const mb = (totalSaved / (1024 * 1024)).toFixed(2);
  status.innerHTML = `<span class="success">Done</span> • Saved ${mb} MB`;
}

// ================= UI =================

function renderResults(results) {
  grid.innerHTML = "";

  results.forEach(r => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = window.burritoApp.toFileURL(r.output);

    const meta = document.createElement("div");
    const saved = ((r.before - r.after) / r.before * 100).toFixed(1);

    meta.className = "meta";
    meta.textContent = `↓ ${saved}%`;

    card.append(img, meta);
    grid.appendChild(card);
  });
}