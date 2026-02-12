// game-worker.js
const intervalMs = 1000 / 60; // Target ~60 FPS
setInterval(() => {
    self.postMessage('tick');
}, intervalMs);
