// Kruskal's Algorithm Generator
// Creates multiple paths and loops - teaches exploration vs exploitation

import { ELEMENTS } from '../../config/constants.js';
import { BaseMazeGenerator } from './BaseMazeGenerator.js';

export class KruskalGenerator extends BaseMazeGenerator {
    generate() {
        this.maze = this.createEmptyMaze();

        // Create all cells and walls
        const cells = [];
        const walls = [];

        for (let y = 1; y < this.size - 1; y += 2) {
            for (let x = 1; x < this.size - 1; x += 2) {
                cells.push({ x, y });
                this.maze[y][x] = ELEMENTS.empty;
            }
        }

        // Collect all potential walls
        for (const cell of cells) {
            const neighbors = [
                { x: cell.x + 2, y: cell.y, wallX: cell.x + 1, wallY: cell.y },
                { x: cell.x, y: cell.y + 2, wallX: cell.x, wallY: cell.y + 1 }
            ];

            for (const neighbor of neighbors) {
                if (this.isValid(neighbor.x, neighbor.y)) {
                    walls.push({
                        cell1: cell,
                        cell2: { x: neighbor.x, y: neighbor.y },
                        wallX: neighbor.wallX,
                        wallY: neighbor.wallY
                    });
                }
            }
        }

        // Shuffle walls
        this.shuffle(walls);

        // Union-Find data structure
        const parent = new Map();
        const rank = new Map();

        for (const cell of cells) {
            const key = `${cell.x},${cell.y}`;
            parent.set(key, key);
            rank.set(key, 0);
        }

        const find = (cell) => {
            const key = `${cell.x},${cell.y}`;
            if (parent.get(key) !== key) {
                parent.set(key, find(this.parseKey(parent.get(key))));
            }
            return parent.get(key);
        };

        const union = (cell1, cell2) => {
            const root1 = find(cell1);
            const root2 = find(cell2);

            if (root1 !== root2) {
                if (rank.get(root1) < rank.get(root2)) {
                    parent.set(root1, root2);
                } else if (rank.get(root1) > rank.get(root2)) {
                    parent.set(root2, root1);
                } else {
                    parent.set(root2, root1);
                    rank.set(root1, rank.get(root1) + 1);
                }
                return true;
            }
            return false;
        };

        // Process walls
        let removedWalls = 0;
        const targetWalls = cells.length - 1; // Minimum spanning tree

        for (const wall of walls) {
            if (find(wall.cell1) !== find(wall.cell2)) {
                // Remove wall
                this.maze[wall.wallY][wall.wallX] = ELEMENTS.empty;
                union(wall.cell1, wall.cell2);
                removedWalls++;

                if (removedWalls >= targetWalls) break;
            }
        }

        // Add loops based on complexity
        const loopPercentage = {
            easy: 0.05,
            medium: 0.15,
            hard: 0.25
        }[this.complexity] || 0.15;

        const additionalWalls = Math.floor(walls.length * loopPercentage);
        for (let i = removedWalls; i < walls.length && i < removedWalls + additionalWalls; i++) {
            const wall = walls[i];
            this.maze[wall.wallY][wall.wallX] = ELEMENTS.empty;
        }

        this.analyzeMaze();
        return this.maze;
    }

    parseKey(key) {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    }
}
