// Main Game Initialization
// MAZE-TEMPLE v2 - AI Agent Training School

import { MazeGame } from './classes/MazeGame.js';

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new MazeGame();
});

// Export game instance globally for onclick handlers
window.game = null;
window.addEventListener('DOMContentLoaded', () => {
    window.game = new MazeGame();
});
