# Burrito Windows

A Windows-friendly desktop version of the Burrito image optimizer.

## What it does

- Drag and drop images onto `PNG` or `WebP`
- Creates optimized copies in an `Optimized Files` folder next to the originals
- Stores separate PNG and WebP quality settings locally
- Supports batch processing

## Run locally

```bash
npm install
npm start
```

## Build a Windows installer

On a Windows machine:

```bash
npm install
npm run dist:win
```

The generated installer will be written to the `release` folder.

## Notes

This version is built with Electron and `sharp` so it can be adapted for Windows, unlike the original macOS-only SwiftUI app.

For the most reliable `.exe` build, use Windows directly or GitHub Actions with a Windows runner.
