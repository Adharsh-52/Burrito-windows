const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("burritoApp", {
  optimizeImages: (payload) => ipcRenderer.invoke("optimize-images", payload),
  pickImages: () => ipcRenderer.invoke("pick-images")
});
