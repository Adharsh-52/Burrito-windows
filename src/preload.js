const { contextBridge, ipcRenderer } = require("electron");
const { pathToFileURL } = require("url");

contextBridge.exposeInMainWorld("burritoApp", {
  optimizeImages: (data) => ipcRenderer.invoke("optimize-images", data),
  pickImages: () => ipcRenderer.invoke("pick-images"),
  onProgress: (cb) => ipcRenderer.on("optimize-progress", (_, d) => cb(d)),

  // 👇 REQUIRED FIX
  toFileURL: (p) => pathToFileURL(p).href
});