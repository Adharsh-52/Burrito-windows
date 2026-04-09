const path = require("path");
const fs = require("fs/promises");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const sharp = require("sharp");

function createWindow() {
  const window = new BrowserWindow({
    width: 460,
    height: 560,
    minWidth: 420,
    minHeight: 520,
    backgroundColor: "#050505",
    title: "Burrito Windows",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.removeMenu();
  window.loadFile(path.join(__dirname, "index.html"));
}

async function ensureOutputDirectory(sourcePath) {
  const parentDirectory = path.dirname(sourcePath);
  const outputDirectory = path.join(parentDirectory, "Optimized Files");
  await fs.mkdir(outputDirectory, { recursive: true });
  return outputDirectory;
}

async function processImage(sourcePath, format, settings) {
  const outputDirectory = await ensureOutputDirectory(sourcePath);
  const parsedPath = path.parse(sourcePath);
  const outputPath = path.join(outputDirectory, `${parsedPath.name}.${format}`);

  const image = sharp(sourcePath, { animated: true }).rotate();

  if (format === "png") {
    await image
      .png({
        quality: settings.pngQuality,
        compressionLevel: 9,
        effort: 10,
        palette: true
      })
      .toFile(outputPath);
  } else {
    await image
      .webp({
        quality: settings.webpQuality,
        effort: 6
      })
      .toFile(outputPath);
  }

  return outputPath;
}

ipcMain.handle("optimize-images", async (_event, payload) => {
  const { filePaths, format, settings } = payload;

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error("No files provided.");
  }

  const outputs = [];
  for (const filePath of filePaths) {
    outputs.push(await processImage(filePath, format, settings));
  }

  return outputs;
});

ipcMain.handle("pick-images", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff", "bmp", "avif"]
      }
    ]
  });

  return result.canceled ? [] : result.filePaths;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
