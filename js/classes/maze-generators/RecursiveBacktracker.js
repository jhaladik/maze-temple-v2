// Recursive Backtracker Generator
// Classic linear maze - good for teaching basic navigation

import { ELEMENTS } from '../../config/constants.js';
import { BaseMazeGenerator } from './BaseMazeGenerator.js';

export class RecursiveBacktracker extends BaseMazeGenerator {
    generate() {
        this.maze = this.createEmptyMaze();

        // Start from (1, 1)
        this.recursiveBacktrack(1, 1);

        // Analyze the generated maze
        this.analyzeMaze();

        return this.maze;
    }

    recursiveBacktrack(x, y) {
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];

        // Shuffle directions
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
}
