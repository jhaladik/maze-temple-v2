// Base Maze Generator (Abstract Class)
// All maze generators extend this class

import { ELEMENTS } from '../../config/constants.js';

export class BaseMazeGenerator {
    constructor(size, level, complexity = 'medium') {
        if (this.constructor === BaseMazeGenerator) {
            throw new Error("BaseMazeGenerator is abstract and cannot be instantiated");
        }

        this.size = size;
        this.level = level;
        this.complexity = complexity;
        this.maze = null;
        this.metadata = {
            paths: [],
            decisionPoints: [],
            deadEnds: [],
            loops: [],
            rooms: []
        };
    }

    // Abstract method - must be implemented by subclasses
    generate() {
        throw new Error("generate() must be implemented by subclass");
    }

    // Helper: Create empty maze
    createEmptyMaze() {
        return Array(this.size).fill().map(() =>
            Array(this.size).fill(ELEMENTS.wall)
        );
    }

    // Helper: Check if position is valid
    isValid(x, y) {
        return x > 0 && x < this.size - 1 && y > 0 && y < this.size - 1;
    }

    // Helper: Get neighbors
    getNeighbors(x, y, distance = 1) {
        const neighbors = [];
        const directions = [
            [0, -distance], [distance, 0], [0, distance], [-distance, 0]
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                neighbors.push({ x: nx, y: ny, dx, dy });
            }
        }

        return neighbors;
    }

    // Helper: Count open neighbors
    countOpenNeighbors(x, y) {
        let count = 0;
        for (const neighbor of this.getNeighbors(x, y, 1)) {
            if (this.maze[neighbor.y][neighbor.x] === ELEMENTS.empty) {
                count++;
            }
        }
        return count;
    }

    // Helper: Shuffle array
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Analyze maze after generation
    analyzeMaze() {
        this.findPaths();
        this.findDecisionPoints();
        this.findDeadEnds();
        this.findLoops();
        return this.metadata;
    }

    // Find all paths from start to exit using BFS
    findPaths() {
        // Implementation for path finding
        this.metadata.paths = [];
        // TODO: Implement multi-path detection
    }

    // Find junction points (decision points)
    findDecisionPoints() {
        this.metadata.decisionPoints = [];

        for (let y = 1; y < this.size - 1; y++) {
            for (let x = 1; x < this.size - 1; x++) {
                if (this.maze[y][x] === ELEMENTS.empty) {
                    const openNeighbors = this.countOpenNeighbors(x, y);
                    if (openNeighbors >= 3) {
                        this.metadata.decisionPoints.push({ x, y, branches: openNeighbors });
                    }
                }
            }
        }
    }

    // Find dead ends
    findDeadEnds() {
        this.metadata.deadEnds = [];

        for (let y = 1; y < this.size - 1; y++) {
            for (let x = 1; x < this.size - 1; x++) {
                if (this.maze[y][x] === ELEMENTS.empty) {
                    const openNeighbors = this.countOpenNeighbors(x, y);
                    if (openNeighbors === 1) {
                        this.metadata.deadEnds.push({ x, y });
                    }
                }
            }
        }
    }

    // Detect loops in maze
    findLoops() {
        // Simplified loop detection
        this.metadata.loops = [];
        // TODO: Implement cycle detection algorithm
    }

    // Get complexity score
    getComplexityScore() {
        return {
            decisionPoints: this.metadata.decisionPoints.length,
            deadEnds: this.metadata.deadEnds.length,
            paths: this.metadata.paths.length,
            loops: this.metadata.loops.length
        };
    }
}
