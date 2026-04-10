const path = require("path");
const fs = require("fs/promises");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const sharp = require("sharp");
const os = require("os");
const { Worker } = require("worker_threads");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      workerData: data
    });

    worker.on("message", resolve);
    worker.on("error", reject);
  });
}

function getOptimalFormat(filePath, format) {
  const ext = path.extname(filePath).toLowerCase();
  if ((ext === ".jpg" || ext === ".jpeg") && format === "png") {
    return "webp";
  }
  return format;
}

ipcMain.handle("optimize-images", async (event, payload) => {
  const { filePaths, format, settings } = payload;

  if (!filePaths?.length) {
    throw new Error("No files provided");
  }

  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    try {
      const outputDirectory = path.join(
        path.dirname(filePath),
        "Optimized Files"
      );

      await fs.mkdir(outputDirectory, { recursive: true });

      const parsed = path.parse(filePath);

      // ✅ FIX: prevent jpeg → png
      const ext = path.extname(filePath).toLowerCase();
      const finalFormat =
        (ext === ".jpg" || ext === ".jpeg") && format === "png"
          ? "webp"
          : format;

      const outputPath = path.join(
        outputDirectory,
        `${parsed.name}.${finalFormat}`
      );

      const inputStat = await fs.stat(filePath);

      let image = sharp(filePath).rotate();

      image = image.resize({
        width: 1920,
        withoutEnlargement: true
      });

      if (finalFormat === "png") {
        await image.png({
          quality: settings.pngQuality,
          compressionLevel: 9,
          palette: true
        }).toFile(outputPath);
      } else {
        await image.webp({
          quality: settings.webpQuality,
          effort: 6
        }).toFile(outputPath);
      }

      const outputStat = await fs.stat(outputPath);

      results.push({
        input: filePath,
        output: outputPath,
        before: inputStat.size,
        after: outputStat.size
      });

      // ✅ progress update
      event.sender.send("optimize-progress", {
        current: i + 1,
        total: filePaths.length,
        file: path.basename(filePath),
        before: inputStat.size,
        after: outputStat.size
      });

    } catch (err) {
      console.error("Error processing:", filePath, err);
    }
  }

  return results;
});

ipcMain.handle("pick-images", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections", "openDirectory"]
  });

  if (result.canceled) return [];

  const files = [];

  for (const p of result.filePaths) {
    const stat = await fs.stat(p);

    if (stat.isDirectory()) {
      const dirFiles = await fs.readdir(p);
      dirFiles.forEach(f => files.push(path.join(p, f)));
    } else {
      files.push(p);
    }
  }

  return files;
});

app.whenReady().then(createWindow);