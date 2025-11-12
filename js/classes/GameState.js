// Game State Class
// Manages the current game state, player position, score, and game logic

import { ELEMENTS, ACTIONS, TIME_LIMITS } from '../config/constants.js';

export class GameState {
    constructor(size = 15, level = 1) {
        this.size = size;
        this.level = level;
        this.maze = [];
        this.player = {
            x: 0,
            y: 0,
            score: 0,
            keys: 0,
            shields: 0,
            speed: 1,
            steps: 0,
            path: []
        };
        this.powerUps = {
            shieldActive: false,
            shieldEnd: 0,
            speedActive: false,
            speedEnd: 0
        };
        this.timeElapsed = 0;
        this.gameMode = 'human';
        this.gameOver = false;
        this.won = false;
        this.startTime = Date.now();
        this.totalGems = 0;
        this.gemsCollected = 0;
        this.timeLimit = TIME_LIMITS[level] || null;
        this.isTimedLevel = TIME_LIMITS.hasOwnProperty(level);

        // Performance tracking metrics
        this.visitedCells = new Set();
        this.backtrackCount = 0;
        this.trapsHit = 0;
        this.trapsAvoided = 0;
        this.powerUpsUsed = 0;
        this.decisionsMade = [];
        this.lastPosition = null;
    }

    getStateVector() {
        // Return flat array of features for neural network
        const localGrid = this.getLocalGrid(3);
        const distToExit = this.getDistanceToExit();
        const nearestGem = this.getNearestGemDirection();

        return [
            this.player.x / this.size,
            this.player.y / this.size,
            this.player.score / 100,
            ...localGrid,
            distToExit,
            ...nearestGem,
            this.powerUps.shieldActive ? 1 : 0,
            this.powerUps.speedActive ? 1 : 0
        ];
    }

    getLocalGrid(radius) {
        const grid = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = this.player.x + dx;
                const y = this.player.y + dy;
                if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
                    const cell = this.maze[y][x];
                    grid.push(this.cellToNumber(cell));
                } else {
                    grid.push(-1); // Out of bounds
                }
            }
        }
        return grid;
    }

    cellToNumber(cell) {
        const mapping = {
            [ELEMENTS.empty]: 0,
            [ELEMENTS.wall]: 1,
            [ELEMENTS.gem]: 2,
            [ELEMENTS.bonus]: 3,
            [ELEMENTS.trap]: 4,
            [ELEMENTS.key]: 5,
            [ELEMENTS.door]: 6,
            [ELEMENTS.exit]: 7,
            [ELEMENTS.shield]: 8,
            [ELEMENTS.speed]: 9
        };
        return mapping[cell] || 0;
    }

    getDistanceToExit() {
        // Find exit
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.exit) {
                    const dx = x - this.player.x;
                    const dy = y - this.player.y;
                    return Math.sqrt(dx * dx + dy * dy) / this.size;
                }
            }
        }
        return 1;
    }

    getNearestGemDirection() {
        let minDist = Infinity;
        let nearestX = 0;
        let nearestY = 0;

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.gem || this.maze[y][x] === ELEMENTS.bonus) {
                    const dist = Math.abs(x - this.player.x) + Math.abs(y - this.player.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestX = x;
                        nearestY = y;
                    }
                }
            }
        }

        const dx = nearestX - this.player.x;
        const dy = nearestY - this.player.y;
        return [dx / this.size, dy / this.size];
    }

    executeAction(action) {
        const directions = [
            [0, -1], // UP
            [1, 0],  // RIGHT
            [0, 1],  // DOWN
            [-1, 0]  // LEFT
        ];

        const [dx, dy] = directions[action];
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        let reward = -1; // Small penalty for each step
        let moved = false;

        // Check bounds
        if (newX >= 0 && newX < this.size && newY >= 0 && newY < this.size) {
            const targetCell = this.maze[newY][newX];

            // Check what's in the target cell
            if (targetCell !== ELEMENTS.wall) {
                if (targetCell === ELEMENTS.door) {
                    if (this.player.keys > 0) {
                        this.player.keys--;
                        this.maze[newY][newX] = ELEMENTS.empty;
                        moved = true;
                        reward = 5;
                    }
                } else {
                    // Handle collectibles
                    switch (targetCell) {
                        case ELEMENTS.gem:
                            this.player.score += 10;
                            this.gemsCollected++;
                            reward = 10;
                            break;
                        case ELEMENTS.bonus:
                            this.player.score += 50;
                            this.bonusCollected = true;
                            reward = 50;
                            break;
                        case ELEMENTS.trap:
                            if (!this.powerUps.shieldActive) {
                                this.player.score = Math.max(0, this.player.score - 20);
                                this.trapsHit++;
                                reward = -20;
                            } else {
                                this.trapsAvoided++;
                                reward = 0; // Shield protected
                            }
                            break;
                        case ELEMENTS.key:
                            this.player.keys++;
                            reward = 15;
                            break;
                        case ELEMENTS.shield:
                            this.activateShield();
                            this.powerUpsUsed++;
                            reward = 20;
                            break;
                        case ELEMENTS.speed:
                            this.activateSpeed();
                            this.powerUpsUsed++;
                            reward = 20;
                            break;
                        case ELEMENTS.exit:
                            this.won = true;
                            this.gameOver = true;
                            reward = 100;
                            break;
                    }

                    // Clear the cell if it's a collectible
                    if (targetCell !== ELEMENTS.empty && targetCell !== ELEMENTS.exit) {
                        this.maze[newY][newX] = ELEMENTS.empty;
                    }

                    moved = true;
                }
            }
        }

        if (moved) {
            // Track visited cells
            const cellKey = `${newX},${newY}`;
            const wasVisited = this.visitedCells.has(cellKey);

            if (wasVisited && this.lastPosition) {
                // Check if this is backtracking (returning to a previously visited cell)
                this.backtrackCount++;
            }

            this.visitedCells.add(cellKey);

            // Track decision points
            if (this.lastPosition) {
                const neighbors = this.countWalkableNeighbors(newX, newY);
                if (neighbors >= 3) {
                    this.decisionsMade.push({
                        position: { x: newX, y: newY },
                        action,
                        branches: neighbors,
                        step: this.player.steps
                    });
                }
            }

            this.lastPosition = { x: this.player.x, y: this.player.y };
            this.player.x = newX;
            this.player.y = newY;
            this.player.steps++;
            this.player.path.push({ x: newX, y: newY, action });
        }

        // Update power-ups
        const now = Date.now();
        if (this.powerUps.shieldActive && now > this.powerUps.shieldEnd) {
            this.powerUps.shieldActive = false;
        }
        if (this.powerUps.speedActive && now > this.powerUps.speedEnd) {
            this.powerUps.speedActive = false;
            this.player.speed = 1;
        }

        return [this.getStateVector(), reward, this.gameOver];
    }

    countWalkableNeighbors(x, y) {
        let count = 0;
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                if (this.maze[ny][nx] !== ELEMENTS.wall) {
                    count++;
                }
            }
        }

        return count;
    }

    activateShield() {
        this.powerUps.shieldActive = true;
        this.powerUps.shieldEnd = Date.now() + 5000;
    }

    activateSpeed() {
        this.powerUps.speedActive = true;
        this.powerUps.speedEnd = Date.now() + 5000;
        this.player.speed = 2;
    }
}
