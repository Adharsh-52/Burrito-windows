const { parentPort, workerData } = require("worker_threads");
const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");

async function run() {
  const { filePath, format, settings } = workerData;

  const outputDir = path.join(path.dirname(filePath), "Optimized Files");
  await fs.mkdir(outputDir, { recursive: true });

  const parsed = path.parse(filePath);
  const outputPath = path.join(outputDir, `${parsed.name}.${format}`);

  const inputStat = await fs.stat(filePath);

  let quality = 80;
  const mb = inputStat.size / (1024 * 1024);
  if (mb > 5) quality = 60;
  else if (mb > 2) quality = 70;
  else if (mb > 1) quality = 80;
  else quality = 90;

  let image = sharp(filePath).rotate().resize({
    width: 1920,
    withoutEnlargement: true
  });

  if (format === "png") {
    await image.png({
      quality: settings.pngQuality,
      compressionLevel: 9,
      palette: true
    }).toFile(outputPath);
  } else {
    await image.webp({
      quality,
      effort: 6
    }).toFile(outputPath);
  }

  const outputStat = await fs.stat(outputPath);

  parentPort.postMessage({
    input: filePath,
    output: outputPath,
    before: inputStat.size,
    after: outputStat.size
  });
}

run();