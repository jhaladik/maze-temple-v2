// Maze Generator Class (Wrapper)
// Generates mazes using various algorithms and places elements strategically

import { ELEMENTS, DIFFICULTY_CONFIGS } from '../config/constants.js';
import { MazeFactory } from './maze-generators/MazeFactory.js';
import { ElementPlacement } from '../strategies/ElementPlacement.js';

export class MazeGenerator {
    static generate(size, level, mazeType = 'classic', complexity = 'medium') {
        // Generate base maze using selected algorithm
        const generator = MazeFactory.createGenerator(mazeType, size, level, complexity);
        const maze = generator.generate();
        const metadata = generator.metadata;

        // Place start position
        maze[1][1] = ELEMENTS.empty;

        // Place elements strategically
        const placement = new ElementPlacement(maze, size, level, metadata);
        placement.placeAll();

        return maze;
    }

    // Legacy method for backward compatibility
    static generateLegacy(size, level) {
        const maze = Array(size).fill().map(() => Array(size).fill(ELEMENTS.wall));

        // Generate maze using recursive backtracking
        this.recursiveBacktrack(maze, 1, 1, size);

        // Place player at start
        maze[1][1] = ELEMENTS.empty;

        // Place exit (far from start)
        const exitPos = this.findFarthestPoint(maze, 1, 1, size);
        maze[exitPos.y][exitPos.x] = ELEMENTS.exit;

        // Get difficulty config
        const config = DIFFICULTY_CONFIGS[Math.min(level, 10)] || DIFFICULTY_CONFIGS[1];

        // Place keys first (in accessible areas from start)
        if (config.keys > 0) {
            const accessibleCells = this.getAccessibleCells(maze, 1, 1, size);
            this.placeElementsInAccessibleArea(maze, ELEMENTS.key, config.keys, accessibleCells);
            // Now place doors strategically (not blocking all paths)
            this.placeDoorsStrategically(maze, config.doors, size);
        }

        // Place collectibles (can be anywhere, even behind doors if player has keys)
        this.placeRandomElements(maze, ELEMENTS.gem, config.gems, size);
        this.placeRandomElements(maze, ELEMENTS.bonus, config.bonus, size);
        this.placeRandomElements(maze, ELEMENTS.trap, config.traps, size);

        if (level >= 5) {
            this.placeRandomElements(maze, ELEMENTS.shield, 1, size);
            this.placeRandomElements(maze, ELEMENTS.speed, 1, size);
        }

        return maze;
    }

    static recursiveBacktrack(maze, x, y, size) {
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];

        // Shuffle directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        maze[y][x] = ELEMENTS.empty;

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            const wallX = x + dx / 2;
            const wallY = y + dy / 2;

            if (newX > 0 && newX < size - 1 && newY > 0 && newY < size - 1 &&
                maze[newY][newX] === ELEMENTS.wall) {
                maze[wallY][wallX] = ELEMENTS.empty;
                this.recursiveBacktrack(maze, newX, newY, size);
            }
        }
    }

    static findFarthestPoint(maze, startX, startY, size) {
        let maxDist = 0;
        let farthest = { x: size - 2, y: size - 2 };

        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (maze[y][x] === ELEMENTS.empty) {
                    const dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist > maxDist) {
                        maxDist = dist;
                        farthest = { x, y };
                    }
                }
            }
        }

        return farthest;
    }

    static placeRandomElements(maze, element, count, size) {
        let placed = 0;
        let attempts = 0;
        const maxAttempts = count * 10;

        while (placed < count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (size - 2)) + 1;
            const y = Math.floor(Math.random() * (size - 2)) + 1;

            if (maze[y][x] === ELEMENTS.empty) {
                maze[y][x] = element;
                placed++;
            }
            attempts++;
        }
    }

    static getAccessibleCells(maze, startX, startY, size) {
        // BFS to find all cells reachable from start without doors
        const accessible = [];
        const visited = Array(size).fill().map(() => Array(size).fill(false));
        const queue = [[startX, startY]];
        visited[startY][startX] = true;

        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            accessible.push({ x, y });

            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < size && ny >= 0 && ny < size &&
                    !visited[ny][nx] &&
                    maze[ny][nx] === ELEMENTS.empty) {
                    visited[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }

        return accessible;
    }

    static placeElementsInAccessibleArea(maze, element, count, accessibleCells) {
        // Place elements only in accessible cells
        const shuffled = [...accessibleCells].sort(() => Math.random() - 0.5);
        let placed = 0;

        for (const cell of shuffled) {
            if (placed >= count) break;
            if (maze[cell.y][cell.x] === ELEMENTS.empty) {
                maze[cell.y][cell.x] = element;
                placed++;
            }
        }
    }

    static placeDoorsStrategically(maze, count, size) {
        // Place doors in corridors (cells with exactly 2 open neighbors)
        // This prevents blocking all paths to keys
        const corridors = [];

        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (maze[y][x] === ELEMENTS.empty) {
                    // Count open neighbors
                    const openNeighbors = [
                        [0, -1], [1, 0], [0, 1], [-1, 0]
                    ].filter(([dx, dy]) => {
                        const nx = x + dx;
                        const ny = y + dy;
                        return maze[ny][nx] === ELEMENTS.empty ||
                               maze[ny][nx] === ELEMENTS.exit;
                    }).length;

                    // Corridors typically have 2 open neighbors
                    if (openNeighbors === 2) {
                        corridors.push({ x, y });
                    }
                }
            }
        }

        // Shuffle and place doors
        const shuffled = corridors.sort(() => Math.random() - 0.5);
        let placed = 0;

        for (const cell of shuffled) {
            if (placed >= count) break;
            if (maze[cell.y][cell.x] === ELEMENTS.empty) {
                maze[cell.y][cell.x] = ELEMENTS.door;
                placed++;
            }
        }
    }
}
