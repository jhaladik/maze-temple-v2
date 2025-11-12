// Element Placement Strategy
// Intelligently places gems, traps, keys, doors, and power-ups based on maze analysis

import { ELEMENTS, DIFFICULTY_CONFIGS } from '../config/constants.js';

export class ElementPlacement {
    constructor(maze, size, level, metadata = {}) {
        this.maze = maze;
        this.size = size;
        this.level = level;
        this.metadata = metadata;
        this.config = DIFFICULTY_CONFIGS[Math.min(level, 10)] || DIFFICULTY_CONFIGS[1];
    }

    placeAll() {
        // Place in strategic order
        this.placeExit();
        this.placeKeys();
        this.placeDoors();
        this.placeGemsStrategically();
        this.placeBonuses();
        this.placeTraps();

        if (this.level >= 5) {
            this.placePowerUps();
        }
    }

    placeExit() {
        // Find farthest point from start (1,1) THAT IS REACHABLE
        // Only search within accessible cells to ensure exit is reachable
        const accessibleCells = this.getAccessibleCells(1, 1);

        let maxDist = 0;
        let bestPos = { x: this.size - 2, y: this.size - 2 };

        for (const cell of accessibleCells) {
            const dist = Math.abs(cell.x - 1) + Math.abs(cell.y - 1);
            if (dist > maxDist && this.maze[cell.y][cell.x] === ELEMENTS.empty) {
                maxDist = dist;
                bestPos = cell;
            }
        }

        this.maze[bestPos.y][bestPos.x] = ELEMENTS.exit;
    }

    placeKeys() {
        if (this.config.keys === 0) return;

        // Place keys in accessible areas from start
        const accessibleCells = this.getAccessibleCells(1, 1);
        this.placeInCells(accessibleCells, ELEMENTS.key, this.config.keys);
    }

    placeDoors() {
        if (this.config.doors === 0) return;

        // Place doors in corridors (2 open neighbors)
        const corridors = [];

        for (let y = 1; y < this.size - 1; y++) {
            for (let x = 1; x < this.size - 1; x++) {
                if (this.maze[y][x] === ELEMENTS.empty) {
                    const openNeighbors = this.countOpenNeighbors(x, y);
                    if (openNeighbors === 2) {
                        corridors.push({ x, y });
                    }
                }
            }
        }

        this.placeInCells(corridors, ELEMENTS.door, this.config.doors);
    }

    placeGemsStrategically() {
        // Use metadata if available
        if (this.metadata.deadEnds && this.metadata.deadEnds.length > 0) {
            // Place gems in dead ends to reward exploration
            const deadEndGems = Math.min(this.config.gems, this.metadata.deadEnds.length);
            this.placeInCells(this.metadata.deadEnds, ELEMENTS.gem, deadEndGems);

            const remaining = this.config.gems - deadEndGems;
            if (remaining > 0) {
                this.placeRandomly(ELEMENTS.gem, remaining);
            }
        } else {
            this.placeRandomly(ELEMENTS.gem, this.config.gems);
        }
    }

    placeBonuses() {
        // Place bonuses in hard-to-reach areas or decision points
        if (this.metadata.decisionPoints && this.metadata.decisionPoints.length > 0) {
            this.placeInCells(this.metadata.decisionPoints, ELEMENTS.bonus, this.config.bonus);
        } else {
            this.placeRandomly(ELEMENTS.bonus, this.config.bonus);
        }
    }

    placeTraps() {
        // Place traps along main paths
        this.placeRandomly(ELEMENTS.trap, this.config.traps);
    }

    placePowerUps() {
        this.placeRandomly(ELEMENTS.shield, 1);
        this.placeRandomly(ELEMENTS.speed, 1);
    }

    // Helper methods
    getAccessibleCells(startX, startY) {
        const accessible = [];
        const visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
        const queue = [[startX, startY]];
        visited[startY][startX] = true;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            accessible.push({ x, y });

            const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx > 0 && nx < this.size - 1 && ny > 0 && ny < this.size - 1 &&
                    !visited[ny][nx] && this.maze[ny][nx] !== ELEMENTS.wall) {  // Allow all non-wall cells
                    visited[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }

        return accessible;
    }

    countOpenNeighbors(x, y) {
        let count = 0;
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx > 0 && nx < this.size - 1 && ny > 0 && ny < this.size - 1 &&
                (this.maze[ny][nx] === ELEMENTS.empty || this.maze[ny][nx] === ELEMENTS.exit)) {
                count++;
            }
        }

        return count;
    }

    placeInCells(cells, element, count) {
        const shuffled = [...cells].sort(() => Math.random() - 0.5);
        let placed = 0;

        for (const cell of shuffled) {
            if (placed >= count) break;
            // Never place elements at starting position (1,1)
            if (cell.x === 1 && cell.y === 1) continue;
            if (this.maze[cell.y][cell.x] === ELEMENTS.empty) {
                this.maze[cell.y][cell.x] = element;
                placed++;
            }
        }
    }

    placeRandomly(element, count) {
        let placed = 0;
        let attempts = 0;
        const maxAttempts = count * 10;

        while (placed < count && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * (this.size - 2)) + 1;
            const y = Math.floor(Math.random() * (this.size - 2)) + 1;

            // Never place elements at starting position (1,1)
            if (x === 1 && y === 1) continue;

            if (this.maze[y][x] === ELEMENTS.empty) {
                this.maze[y][x] = element;
                placed++;
            }
        }
    }
}
