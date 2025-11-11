// Maze Factory
// Selects and instantiates the appropriate maze generator

import { RecursiveBacktracker } from './RecursiveBacktracker.js';
import { KruskalGenerator } from './KruskalGenerator.js';
import { BranchingGenerator } from './BranchingGenerator.js';
import { RoomBasedGenerator } from './RoomBasedGenerator.js';

export class MazeFactory {
    static createGenerator(type, size, level, complexity = 'medium') {
        switch (type) {
            case 'classic':
                return new RecursiveBacktracker(size, level, complexity);

            case 'branching':
                return new BranchingGenerator(size, level, complexity);

            case 'looped':
                return new KruskalGenerator(size, level, complexity);

            case 'rooms':
                return new RoomBasedGenerator(size, level, complexity);

            case 'strategic':
                // Use branching with extra features
                return new BranchingGenerator(size, level, complexity);

            case 'hybrid':
                // Randomly mix generators
                const generators = [BranchingGenerator, KruskalGenerator, RoomBasedGenerator];
                const GeneratorClass = generators[Math.floor(Math.random() * generators.length)];
                return new GeneratorClass(size, level, 'hard');

            case 'organic':
                // Use Kruskal with high complexity
                return new KruskalGenerator(size, level, 'hard');

            default:
                console.warn(`Unknown maze type: ${type}, using classic`);
                return new RecursiveBacktracker(size, level, complexity);
        }
    }

    static generate(type, size, level, complexity = 'medium') {
        const generator = this.createGenerator(type, size, level, complexity);
        return generator.generate();
    }
}
