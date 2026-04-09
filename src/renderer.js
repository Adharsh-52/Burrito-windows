const state = {
  pendingFiles: [],
  settings: loadSettings()
};

const supportedExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
  ".bmp",
  ".avif"
]);

const dropZones = [...document.querySelectorAll(".drop-zone")];
const browseButton = document.getElementById("browseButton");
const previewStrip = document.getElementById("previewStrip");
const processingCard = document.getElementById("processingCard");
const statusLabel = document.getElementById("statusLabel");
const statusTitle = document.getElementById("statusTitle");
const statusMessage = document.getElementById("statusMessage");
const settingsButton = document.getElementById("settingsButton");
const settingsDialog = document.getElementById("settingsDialog");
const pngQualityInput = document.getElementById("pngQuality");
const webpQualityInput = document.getElementById("webpQuality");
const pngValue = document.getElementById("pngValue");
const webpValue = document.getElementById("webpValue");

applySettingsToInputs();
renderPreview();

dropZones.forEach((zone) => {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-targeted");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("is-targeted");
  });

  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("is-targeted");
    const files = collectDroppedFiles(event.dataTransfer.files);
    if (files.length === 0) {
      showError("Drop one or more supported image files.");
      return;
    }

    state.pendingFiles = files;
    renderPreview();
    await optimizeFiles(zone.dataset.format, files);
  });

  zone.addEventListener("click", async () => {
    const picked = await window.burritoApp.pickImages();
    const files = normalizePaths(picked);
    if (files.length === 0) {
      return;
    }

    state.pendingFiles = files;
    renderPreview();
    await optimizeFiles(zone.dataset.format, files);
  });
});

browseButton.addEventListener("click", async () => {
  const picked = await window.burritoApp.pickImages();
  const files = normalizePaths(picked);
  if (files.length === 0) {
    return;
  }

  state.pendingFiles = files;
  renderPreview();
  showInfo("Files ready", `${files.length} image${files.length === 1 ? "" : "s"} selected. Drop them on PNG or WebP.`);
});

settingsButton.addEventListener("click", () => {
  settingsDialog.showModal();
});

pngQualityInput.addEventListener("input", () => {
  state.settings.pngQuality = Number(pngQualityInput.value);
  pngValue.textContent = pngQualityInput.value;
  persistSettings();
});

webpQualityInput.addEventListener("input", () => {
  state.settings.webpQuality = Number(webpQualityInput.value);
  webpValue.textContent = webpQualityInput.value;
  persistSettings();
});

function loadSettings() {
  const stored = window.localStorage.getItem("burrito-settings");
  if (!stored) {
    return { pngQuality: 80, webpQuality: 80 };
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      pngQuality: clamp(parsed.pngQuality ?? 80, 40, 100),
      webpQuality: clamp(parsed.webpQuality ?? 80, 40, 100)
    };
  } catch (_error) {
    return { pngQuality: 80, webpQuality: 80 };
  }
}

function persistSettings() {
  window.localStorage.setItem("burrito-settings", JSON.stringify(state.settings));
}

function applySettingsToInputs() {
  pngQualityInput.value = String(state.settings.pngQuality);
  webpQualityInput.value = String(state.settings.webpQuality);
  pngValue.textContent = String(state.settings.pngQuality);
  webpValue.textContent = String(state.settings.webpQuality);
}

function collectDroppedFiles(fileList) {
  const files = [...fileList]
    .map((file) => ({
      path: file.path,
      name: file.name
    }))
    .filter((file) => isSupported(file.path));

  return dedupeFiles(files);
}

function normalizePaths(paths) {
  return dedupeFiles(
    paths
      .filter((filePath) => isSupported(filePath))
      .map((filePath) => ({
        path: filePath,
        name: filePath.split(/[/\\]/).pop()
      }))
  );
}

function isSupported(filePath) {
  const lower = filePath.toLowerCase();
  const match = lower.match(/\.[^.]+$/);
  return Boolean(match && supportedExtensions.has(match[0]));
}

function dedupeFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.path)) {
      return false;
    }
    seen.add(file.path);
    return true;
  });
}

async function optimizeFiles(format, files) {
  setBusyState(true, `Processing ${format.toUpperCase()}`, `Optimizing ${files.length} image${files.length === 1 ? "" : "s"}...`);

  try {
    const outputPaths = await window.burritoApp.optimizeImages({
      filePaths: files.map((file) => file.path),
      format,
      settings: state.settings
    });

    showSuccess(
      "Success",
      `${outputPaths.length} optimized file${outputPaths.length === 1 ? "" : "s"} created in Optimized Files.`
    );
  } catch (error) {
    showError(error.message || "Image processing failed.");
  }
}

function setBusyState(isBusy, title, message) {
  processingCard.classList.remove("hidden", "is-success", "is-error");
  processingCard.classList.toggle("is-busy", isBusy);
  statusLabel.textContent = isBusy ? "Processing" : statusLabel.textContent;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

function showInfo(title, message) {
  processingCard.classList.remove("hidden", "is-success", "is-error", "is-busy");
  statusLabel.textContent = "Ready";
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

function showSuccess(title, message) {
  processingCard.classList.remove("hidden", "is-error", "is-busy");
  processingCard.classList.add("is-success");
  statusLabel.textContent = "Complete";
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

function showError(message) {
  processingCard.classList.remove("hidden", "is-success", "is-busy");
  processingCard.classList.add("is-error");
  statusLabel.textContent = "Issue";
  statusTitle.textContent = "Could not finish";
  statusMessage.textContent = message;
}

function renderPreview() {
  previewStrip.replaceChildren();

  if (state.pendingFiles.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-placeholder";
    placeholder.textContent = "No files selected yet";
    previewStrip.appendChild(placeholder);
    return;
  }

  state.pendingFiles.slice(0, 3).forEach((file) => {
    const item = document.createElement("div");
    item.className = "preview-chip";

    const image = document.createElement("img");
    image.alt = file.name;
    image.src = `file://${encodeURI(file.path)}`;

    const label = document.createElement("span");
    label.textContent = file.name;

    item.append(image, label);
    previewStrip.appendChild(item);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}
