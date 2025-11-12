// Diagnostic script to test maze generation and analysis
import { MazeGenerator } from './js/classes/MazeGenerator.js';
import { MazeAnalyzer } from './js/classes/MazeAnalyzer.js';
import { ELEMENTS } from './js/config/constants.js';

console.log('🔍 Starting Maze Diagnostic...\n');

// Generate a small test maze
const size = 11;
const level = 1;
const mazeType = 'classic';

console.log(`Generating ${size}x${size} ${mazeType} maze for level ${level}...`);
const maze = MazeGenerator.generate(size, level, mazeType, 'medium');

// Check maze structure
console.log('\n📊 Maze Structure Check:');
let wallCount = 0;
let emptyCount = 0;
let exitCount = 0;
let gemCount = 0;

for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
        const cell = maze[y][x];
        if (cell === ELEMENTS.wall) wallCount++;
        else if (cell === ELEMENTS.empty) emptyCount++;
        else if (cell === ELEMENTS.exit) {
            exitCount++;
            console.log(`  ✓ Exit found at (${x}, ${y})`);
        }
        else if (cell === ELEMENTS.gem) gemCount++;
    }
}

console.log(`  Total cells: ${size * size}`);
console.log(`  Walls: ${wallCount}`);
console.log(`  Empty: ${emptyCount}`);
console.log(`  Exits: ${exitCount}`);
console.log(`  Gems: ${gemCount}`);

if (exitCount === 0) {
    console.error('  ❌ ERROR: No exit found in maze!');
} else if (exitCount > 1) {
    console.warn(`  ⚠️  WARNING: Multiple exits found (${exitCount})`);
}

// Visualize maze
console.log('\n🗺️  Maze Visualization:');
for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
        const cell = maze[y][x];
        if (x === 1 && y === 1) row += 'S';  // Start
        else if (cell === ELEMENTS.exit) row += 'E';
        else if (cell === ELEMENTS.gem) row += '💎';
        else if (cell === ELEMENTS.wall) row += '█';
        else row += '·';
    }
    console.log(row);
}

// Test MazeAnalyzer
console.log('\n🔍 Testing MazeAnalyzer...');
const analyzer = new MazeAnalyzer(maze, level);

console.log(`  Start position: (${analyzer.startPos.x}, ${analyzer.startPos.y})`);
console.log(`  Exit position: ${analyzer.exitPos ? `(${analyzer.exitPos.x}, ${analyzer.exitPos.y})` : 'NOT FOUND'}`);
console.log(`  Gems found: ${analyzer.gems.length}`);

// Test A* directly with debug
console.log('\n🔬 Testing A* directly with debug output:');
const directTestPath = analyzer.aStarPath(analyzer.startPos, analyzer.exitPos, true);
console.log(`Direct A* test result: ${directTestPath ? 'SUCCESS' : 'FAILED'}`);

// Run analysis
console.log('\n📈 Running full analysis...');
const analysis = analyzer.analyze();

console.log('\n🎯 Path Analysis Results:');
console.log(`  Direct path: ${analysis.paths.directPath.path ?
    `✅ Found (${analysis.paths.directPath.steps} steps)` :
    '❌ NOT FOUND'}`);
console.log(`  Collection path: ${analysis.paths.collectionPath.path ?
    `✅ Found (${analysis.paths.collectionPath.steps} steps)` :
    '❌ NOT FOUND'}`);
console.log(`  Optimal steps: ${analysis.benchmarks.optimalSteps}`);

if (!analysis.paths.directPath.path) {
    console.error('\n❌ PATHFINDING FAILED!');
    console.error('Debugging information:');

    // Check what getWalkableNeighbors returns
    console.log('\nTesting getWalkableNeighbors from start:');
    const startNeighbors = analyzer.getWalkableNeighbors(1, 1);
    console.log(`  Walkable neighbors from (1,1): ${startNeighbors.length}`);
    startNeighbors.forEach(n => {
        console.log(`    - (${n.x}, ${n.y}) contains: "${maze[n.y][n.x]}"`);
    });

    // Check cell types
    console.log('\nChecking ELEMENTS constants:');
    console.log(`  ELEMENTS.wall = "${ELEMENTS.wall}"`);
    console.log(`  ELEMENTS.empty = "${ELEMENTS.empty}"`);
    console.log(`  ELEMENTS.exit = "${ELEMENTS.exit}"`);

    console.log('\nChecking actual maze cell contents around start:');
    console.log(`  maze[1][1] (start) = "${maze[1][1]}" (type: ${typeof maze[1][1]})`);
    console.log(`  maze[1][2] (east) = "${maze[1][2]}" (type: ${typeof maze[1][2]})`);
    console.log(`  maze[0][1] (north) = "${maze[0][1]}" (type: ${typeof maze[0][1]})`);
    console.log(`  maze[2][1] (south) = "${maze[2][1]}" (type: ${typeof maze[2][1]})`);
    console.log(`  maze[1][0] (west) = "${maze[1][0]}" (type: ${typeof maze[1][0]})`);

    // Test strict equality
    console.log('\nTesting equality checks:');
    console.log(`  maze[1][2] !== ELEMENTS.wall: ${maze[1][2] !== ELEMENTS.wall}`);
    console.log(`  maze[1][2] === ELEMENTS.empty: ${maze[1][2] === ELEMENTS.empty}`);

    // Test accessibility manually
    console.log('\nTesting if exit is reachable from start...');
    const visited = new Set();
    const queue = [{ x: 1, y: 1 }];
    visited.add('1,1');
    let exitReachable = false;

    while (queue.length > 0) {
        const current = queue.shift();

        if (analyzer.exitPos && current.x === analyzer.exitPos.x && current.y === analyzer.exitPos.y) {
            exitReachable = true;
            break;
        }

        const neighbors = [
            { x: current.x, y: current.y - 1 },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x - 1, y: current.y }
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(key) &&
                neighbor.x >= 0 && neighbor.x < size &&
                neighbor.y >= 0 && neighbor.y < size &&
                maze[neighbor.y][neighbor.x] !== ELEMENTS.wall) {
                visited.add(key);
                queue.push(neighbor);
            }
        }
    }

    console.log(`  Exit reachable via BFS: ${exitReachable ? '✓ YES' : '✗ NO'}`);
    console.log(`  Cells visited during BFS: ${visited.size}`);
} else {
    console.log('\n✅ SUCCESS: Pathfinding is working correctly!');
}

console.log('\n📊 Full Analysis Summary:');
console.log(JSON.stringify(analysis, null, 2));
