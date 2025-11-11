// Branching Generator
// Creates deliberate branching paths with multiple routes - teaches decision-making

import { ELEMENTS } from '../../config/constants.js';
import { BaseMazeGenerator } from './BaseMazeGenerator.js';

export class BranchingGenerator extends BaseMazeGenerator {
    generate() {
        this.maze = this.createEmptyMaze();

        // Start with recursive backtracking
        this.recursiveBacktrack(1, 1);

        // Add branches based on complexity
        const branchCount = {
            easy: 2,
            medium: 4,
            hard: 6
        }[this.complexity] || 4;

        this.createBranches(branchCount);

        // Remove some walls to create multiple paths
        this.createAlternatePaths();

        this.analyzeMaze();
        return this.maze;
    }

    recursiveBacktrack(x, y) {
        const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
        this.shuffle(directions);
        this.maze[y][x] = ELEMENTS.empty;

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            const wallX = x + dx / 2;
            const wallY = y + dy / 2;

            if (this.isValid(newX, newY) && this.maze[newY][newX] === ELEMENTS.wall) {
                this.maze[wallY][wallX] = ELEMENTS.empty;
                this.recursiveBacktrack(newX, newY);
            }
        }
    }

    createBranches(count) {
        let attempts = 0;
        let created = 0;

        while (created < count && attempts < count * 10) {
            attempts++;

            // Find a corridor cell
            const x = Math.floor(Math.random() * (this.size - 2)) + 1;
            const y = Math.floor(Math.random() * (this.size - 2)) + 1;

            if (this.maze[y][x] === ELEMENTS.empty) {
                const openNeighbors = this.countOpenNeighbors(x, y);

                // If it's a corridor (2 neighbors), try to add a branch
                if (openNeighbors === 2) {
                    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                    this.shuffle(directions);

                    for (const [dx, dy] of directions) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (this.isValid(nx, ny) && this.maze[ny][nx] === ELEMENTS.wall) {
                            // Check if we can create a short branch
                            const branchLength = Math.floor(Math.random() * 3) + 2;
                            if (this.canCreateBranch(nx, ny, dx, dy, branchLength)) {
                                this.createBranch(nx, ny, dx, dy, branchLength);
                                created++;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    canCreateBranch(startX, startY, dx, dy, length) {
        let x = startX;
        let y = startY;

        for (let i = 0; i < length; i++) {
            if (!this.isValid(x, y) || this.maze[y][x] === ELEMENTS.empty) {
                return false;
            }
            x += dx;
            y += dy;
        }

        return true;
    }

    createBranch(startX, startY, dx, dy, length) {
        let x = startX;
        let y = startY;

        for (let i = 0; i < length; i++) {
            this.maze[y][x] = ELEMENTS.empty;
            x += dx;
            y += dy;
        }
    }

    createAlternatePaths() {
        // Remove random walls to create shortcuts/alternate routes
        const wallsToRemove = {
            easy: Math.floor(this.size * 0.3),
            medium: Math.floor(this.size * 0.5),
            hard: Math.floor(this.size * 0.7)
        }[this.complexity] || Math.floor(this.size * 0.5);

        let removed = 0;
        let attempts = 0;

        while (removed < wallsToRemove && attempts < wallsToRemove * 10) {
            attempts++;

            const x = Math.floor(Math.random() * (this.size - 2)) + 1;
            const y = Math.floor(Math.random() * (this.size - 2)) + 1;

            if (this.maze[y][x] === ELEMENTS.wall) {
                // Check if removing this wall connects two empty spaces
                const openNeighbors = this.countOpenNeighbors(x, y);

                if (openNeighbors >= 2) {
                    this.maze[y][x] = ELEMENTS.empty;
                    removed++;
                }
            }
        }
    }
}
