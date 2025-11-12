// Maze Analyzer Class
// Comprehensive maze analysis including optimal paths, complexity metrics, and difficulty rating

import { ELEMENTS } from '../config/constants.js';

export class MazeAnalyzer {
    constructor(maze, level) {
        this.maze = maze;
        this.size = maze.length;
        this.level = level;
        this.startPos = { x: 1, y: 1 };
        this.exitPos = this.findExit();
        this.gems = this.findAllGems();
        this.traps = this.findAllTraps();
        this.keys = this.findAllKeys();
        this.doors = this.findAllDoors();
        this.powerUps = this.findAllPowerUps();

        this.analysis = null;
    }

    // Main analysis method
    analyze() {
        const startTime = performance.now();

        // Calculate paths once and cache them
        const paths = this.analyzeOptimalPaths();
        const spatial = this.analyzeSpatialMetrics();
        const topology = this.analyzeTopology();

        this.analysis = {
            timestamp: Date.now(),
            level: this.level,
            mazeSize: this.size,

            // Spatial metrics
            spatial: spatial,

            // Path metrics (use cached result)
            paths: paths,

            // Topological metrics
            topology: topology,

            // Element distribution
            elements: this.analyzeElements(),

            // Difficulty rating (pass cached data)
            difficulty: this.calculateDifficulty(paths, spatial, topology),

            // Strategic analysis (pass cached data)
            strategy: this.analyzeStrategy(paths, topology),

            // Performance benchmarks (pass cached data)
            benchmarks: this.calculateBenchmarks(paths, spatial),

            // Analysis metadata
            meta: {
                analysisTimeMs: 0,
                version: '1.0.0'
            }
        };

        this.analysis.meta.analysisTimeMs = performance.now() - startTime;
        return this.analysis;
    }

    // === PATH FINDING ALGORITHMS ===

    // A* algorithm for optimal pathfinding
    findOptimalPath(start, goal, collectibles = []) {
        if (collectibles.length === 0) {
            return this.aStarPath(start, goal);
        }

        // For multiple collectibles, use TSP approximation (nearest neighbor)
        let currentPos = start;
        let fullPath = [];
        let totalDistance = 0;
        let remainingCollectibles = [...collectibles];

        while (remainingCollectibles.length > 0) {
            let nearestIdx = 0;
            let nearestDist = Infinity;
            let nearestPath = null;

            // Find nearest collectible
            for (let i = 0; i < remainingCollectibles.length; i++) {
                const path = this.aStarPath(currentPos, remainingCollectibles[i]);
                if (path && path.length < nearestDist) {
                    nearestDist = path.length;
                    nearestPath = path;
                    nearestIdx = i;
                }
            }

            if (!nearestPath) break;

            // Add path (skip first point if not the very first segment)
            if (fullPath.length > 0) {
                fullPath = fullPath.concat(nearestPath.slice(1));
            } else {
                fullPath = nearestPath;
            }

            totalDistance += nearestPath.length - 1;
            currentPos = remainingCollectibles[nearestIdx];
            remainingCollectibles.splice(nearestIdx, 1);
        }

        // Add path to exit
        const pathToExit = this.aStarPath(currentPos, goal);
        if (pathToExit) {
            if (fullPath.length > 0) {
                // We have collected gems, append exit path (skip overlapping start point)
                fullPath = fullPath.concat(pathToExit.slice(1));
                totalDistance += pathToExit.length - 1;
            } else {
                // No gems collected, just return the direct path to exit
                fullPath = pathToExit;
                totalDistance = pathToExit.length - 1;
            }
        }

        return fullPath;
    }

    // A* pathfinding implementation
    aStarPath(start, goal) {
        // Validate inputs
        if (!start || !goal) {
            console.error('A* called with invalid start/goal:', start, goal);
            return null;
        }

        // Check if start and goal are the same
        if (start.x === goal.x && start.y === goal.y) {
            return [start];
        }


        const openSet = [start];
        const closedSet = new Set();  // Track already-explored nodes
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (pos) => `${pos.x},${pos.y}`;

        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, goal));

        let iterations = 0;
        const maxIterations = this.size * this.size * 2;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Find node with lowest fScore
            let currentIdx = 0;
            const firstF = fScore.get(key(openSet[0]));
            let lowestF = firstF !== undefined ? firstF : Infinity;

            for (let i = 1; i < openSet.length; i++) {
                const nodeF = fScore.get(key(openSet[i]));
                const f = nodeF !== undefined ? nodeF : Infinity;
                if (f < lowestF) {
                    lowestF = f;
                    currentIdx = i;
                }
            }

            const current = openSet[currentIdx];
            const currentKey = key(current);

            // Goal reached
            if (current.x === goal.x && current.y === goal.y) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.splice(currentIdx, 1);
            closedSet.add(currentKey);  // Mark as explored

            // Check neighbors
            const neighbors = this.getWalkableNeighbors(current.x, current.y);

            for (const neighbor of neighbors) {
                const neighborKey = key(neighbor);

                // Skip if already explored
                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // FIX: Use explicit undefined check to handle gScore of 0 correctly
                const currentG = gScore.get(currentKey);
                const tentativeG = (currentG !== undefined ? currentG : Infinity) + 1;
                const currentNeighborG = gScore.get(neighborKey);
                const neighborG = currentNeighborG !== undefined ? currentNeighborG : Infinity;

                if (tentativeG < neighborG) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, goal));

                    if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // No path found
        if (iterations >= maxIterations) {
            console.warn(`A* exceeded max iterations (${maxIterations})`);
        }
        console.warn(`No path found: (${start.x},${start.y}) -> (${goal.x},${goal.y})`);
        return null;
    }

    // Manhattan distance heuristic
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // Reconstruct path from A* result
    reconstructPath(cameFrom, current) {
        const path = [current];
        const key = (pos) => `${pos.x},${pos.y}`;

        while (cameFrom.has(key(current))) {
            current = cameFrom.get(key(current));
            path.unshift(current);
        }

        return path;
    }

    // Get walkable neighbors for pathfinding
    getWalkableNeighbors(x, y) {
        const neighbors = [];
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                const cell = this.maze[ny][nx];
                // Walkable if not a wall (doors and traps are walkable for analysis)
                if (cell !== ELEMENTS.wall) {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }

        return neighbors;
    }

    // BFS to find all reachable cells
    findReachableCells(start) {
        const visited = new Set();
        const queue = [start];
        const key = (pos) => `${pos.x},${pos.y}`;

        visited.add(key(start));

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getWalkableNeighbors(current.x, current.y);

            for (const neighbor of neighbors) {
                const nKey = key(neighbor);
                if (!visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push(neighbor);
                }
            }
        }

        return visited;
    }

    // === ANALYSIS METHODS ===

    analyzeSpatialMetrics() {
        const totalCells = this.size * this.size;
        let wallCells = 0;
        let pathCells = 0;

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.wall) {
                    wallCells++;
                } else {
                    pathCells++;
                }
            }
        }

        const reachableCells = this.findReachableCells(this.startPos);
        const reachableCount = reachableCells.size;
        const reachabilityRatio = reachableCount / pathCells;

        return {
            totalCells,
            wallCells,
            pathCells,
            reachableCells: reachableCount,
            reachabilityRatio,
            wallDensity: wallCells / totalCells,
            pathDensity: pathCells / totalCells
        };
    }

    analyzeOptimalPaths() {
        // Validate exit position exists
        if (!this.exitPos) {
            console.warn('MazeAnalyzer: No exit found in maze');
            return {
                directPath: { path: null, length: null, steps: null },
                collectionPath: { path: null, length: null, steps: null, gemsToCollect: this.gems.length },
                pathDifference: null
            };
        }

        // Optimal path: Start -> Exit (shortest)
        const directPath = this.aStarPath(this.startPos, this.exitPos);

        if (!directPath) {
            console.warn('MazeAnalyzer: No path found from start to exit');
        }

        // Optimal collection path: Start -> All Gems -> Exit
        const collectionPath = this.findOptimalPath(this.startPos, this.exitPos, this.gems);

        if (!collectionPath && this.gems.length > 0) {
            console.warn('MazeAnalyzer: No path found that collects all gems');
        }

        return {
            directPath: {
                path: directPath,
                length: directPath ? directPath.length : null,
                steps: directPath ? directPath.length - 1 : null
            },
            collectionPath: {
                path: collectionPath,
                length: collectionPath ? collectionPath.length : null,
                steps: collectionPath ? collectionPath.length - 1 : null,
                gemsToCollect: this.gems.length
            },
            pathDifference: (collectionPath && directPath)
                ? collectionPath.length - directPath.length
                : null
        };
    }

    analyzeTopology() {
        const decisionPoints = [];
        const deadEnds = [];
        const corridors = [];
        const junctions = [];

        for (let y = 1; y < this.size - 1; y++) {
            for (let x = 1; x < this.size - 1; x++) {
                if (this.maze[y][x] !== ELEMENTS.wall) {
                    const openNeighbors = this.countOpenNeighbors(x, y);

                    if (openNeighbors === 1) {
                        deadEnds.push({ x, y });
                    } else if (openNeighbors === 2) {
                        corridors.push({ x, y });
                    } else if (openNeighbors === 3) {
                        junctions.push({ x, y, type: 'T-junction' });
                        decisionPoints.push({ x, y, branches: 3 });
                    } else if (openNeighbors === 4) {
                        junctions.push({ x, y, type: 'crossroads' });
                        decisionPoints.push({ x, y, branches: 4 });
                    }
                }
            }
        }

        const totalOpenCells = this.analyzeSpatialMetrics().pathCells;

        return {
            decisionPoints,
            deadEnds,
            corridors: corridors.length,
            junctions,
            decisionPointDensity: decisionPoints.length / totalOpenCells,
            deadEndRatio: deadEnds.length / totalOpenCells,
            averageBranchFactor: decisionPoints.length > 0
                ? decisionPoints.reduce((sum, dp) => sum + dp.branches, 0) / decisionPoints.length
                : 0,
            complexity: this.calculateTopologicalComplexity(decisionPoints.length, deadEnds.length, junctions.length)
        };
    }

    analyzeElements() {
        return {
            gems: {
                count: this.gems.length,
                positions: this.gems,
                averageDistanceFromStart: this.averageDistance(this.startPos, this.gems),
                averageDistanceFromExit: this.averageDistance(this.exitPos, this.gems),
                inDeadEnds: this.countElementsInDeadEnds(this.gems)
            },
            traps: {
                count: this.traps.length,
                positions: this.traps,
                averageDistanceFromStart: this.averageDistance(this.startPos, this.traps),
                onOptimalPath: this.countElementsOnPath(this.traps, this.analysis?.paths?.directPath?.path),
                density: this.traps.length / this.analyzeSpatialMetrics().pathCells
            },
            keys: {
                count: this.keys.length,
                positions: this.keys
            },
            doors: {
                count: this.doors.length,
                positions: this.doors
            },
            powerUps: {
                count: this.powerUps.length,
                positions: this.powerUps
            }
        };
    }

    calculateDifficulty(paths, spatial, topology) {
        // Use passed parameters or calculate if not provided (for backwards compatibility)
        if (!paths) paths = this.analyzeOptimalPaths();
        if (!spatial) spatial = this.analyzeSpatialMetrics();
        if (!topology) topology = this.analyzeTopology();

        // Structural difficulty (0-100)
        const structuralDifficulty = Math.min(100,
            (topology.decisionPoints.length * 2) +
            (topology.deadEnds.length * 1.5) +
            (spatial.pathCells / 10)
        );

        // Navigation difficulty (0-100)
        const navigationDifficulty = paths.directPath.steps
            ? Math.min(100, (paths.directPath.steps / this.size) * 50)
            : 0;

        // Collection difficulty (0-100)
        const collectionDifficulty = paths.collectionPath.steps && paths.directPath.steps
            ? Math.min(100, ((paths.collectionPath.steps - paths.directPath.steps) / this.size) * 30)
            : 0;

        // Hazard difficulty (0-100)
        const trapDensity = this.traps.length / spatial.pathCells;
        const hazardDifficulty = Math.min(100, trapDensity * 500);

        // Overall difficulty (weighted average)
        const overallDifficulty = (
            structuralDifficulty * 0.3 +
            navigationDifficulty * 0.25 +
            collectionDifficulty * 0.25 +
            hazardDifficulty * 0.2
        );

        return {
            overall: Math.round(overallDifficulty),
            structural: Math.round(structuralDifficulty),
            navigation: Math.round(navigationDifficulty),
            collection: Math.round(collectionDifficulty),
            hazard: Math.round(hazardDifficulty),
            rating: this.getDifficultyRating(overallDifficulty)
        };
    }

    analyzeStrategy(paths, topology) {
        // Use passed parameters or calculate if not provided
        if (!paths) paths = this.analyzeOptimalPaths();
        if (!topology) topology = this.analyzeTopology();

        // Identify critical decision points (on optimal path)
        const criticalDecisions = topology.decisionPoints.filter(dp =>
            this.isOnPath(dp, paths.directPath.path)
        );

        // Identify risk zones (trap clusters)
        const riskZones = this.findClusters(this.traps, 3);

        // Identify reward zones (gem clusters)
        const rewardZones = this.findClusters(this.gems, 3);

        // Identify bottlenecks (must-pass points)
        const bottlenecks = this.findBottlenecks();

        return {
            criticalDecisions,
            riskZones,
            rewardZones,
            bottlenecks,
            strategyRecommendations: this.generateRecommendations(criticalDecisions, riskZones, rewardZones)
        };
    }

    calculateBenchmarks(paths, spatial) {
        // Use passed parameters or calculate if not provided
        if (!paths) paths = this.analyzeOptimalPaths();
        if (!spatial) spatial = this.analyzeSpatialMetrics();

        // Calculate difficulty with cached data
        const topology = this.analysis ? this.analysis.topology : this.analyzeTopology();
        const difficulty = this.calculateDifficulty(paths, spatial, topology);

        // Expected steps for different player levels
        const optimalSteps = paths.collectionPath.steps || paths.directPath.steps || 0;

        // Debug logging if optimal steps is 0
        if (optimalSteps === 0) {
            console.warn('⚠️ Optimal steps is 0!');
            console.warn('Collection path steps:', paths.collectionPath.steps);
            console.warn('Direct path steps:', paths.directPath.steps);
            console.warn('Exit position:', this.exitPos);
        }
        const expectedSteps = {
            expert: optimalSteps,
            intermediate: Math.round(optimalSteps * 1.3),
            beginner: Math.round(optimalSteps * 1.8),
            random: Math.round(spatial.reachableCells * 0.6)
        };

        // Expected time (assuming 2 moves per second for intermediate)
        const expectedTime = {
            expert: Math.round(expectedSteps.expert / 3),
            intermediate: Math.round(expectedSteps.intermediate / 2),
            beginner: Math.round(expectedSteps.beginner / 1.5)
        };

        // Expected exploration (unique cells visited)
        const expectedExploration = {
            expert: Math.round(optimalSteps * 1.1),
            intermediate: Math.round(spatial.reachableCells * 0.4),
            beginner: Math.round(spatial.reachableCells * 0.7)
        };

        return {
            optimalSteps,
            expectedSteps,
            expectedTime,
            expectedExploration,
            scoreTargets: {
                perfect: difficulty.overall * 100,
                good: difficulty.overall * 80,
                average: difficulty.overall * 60,
                passing: difficulty.overall * 40
            }
        };
    }

    // === HELPER METHODS ===

    findExit() {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.exit) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    findAllGems() {
        const gems = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.gem) {
                    gems.push({ x, y });
                }
            }
        }
        return gems;
    }

    findAllTraps() {
        const traps = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.trap) {
                    traps.push({ x, y });
                }
            }
        }
        return traps;
    }

    findAllKeys() {
        const keys = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.key) {
                    keys.push({ x, y });
                }
            }
        }
        return keys;
    }

    findAllDoors() {
        const doors = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.maze[y][x] === ELEMENTS.door) {
                    doors.push({ x, y });
                }
            }
        }
        return doors;
    }

    findAllPowerUps() {
        const powerUps = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.maze[y][x];
                if (cell === ELEMENTS.shield || cell === ELEMENTS.speed) {
                    powerUps.push({ x, y, type: cell });
                }
            }
        }
        return powerUps;
    }

    countOpenNeighbors(x, y) {
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

    calculateTopologicalComplexity(decisionPoints, deadEnds, junctions) {
        return (decisionPoints * 2) + deadEnds + (junctions * 1.5);
    }

    averageDistance(from, positions) {
        if (positions.length === 0) return 0;

        const totalDist = positions.reduce((sum, pos) => {
            return sum + Math.abs(pos.x - from.x) + Math.abs(pos.y - from.y);
        }, 0);

        return totalDist / positions.length;
    }

    countElementsInDeadEnds(elements) {
        const topology = this.analyzeTopology();
        return elements.filter(elem =>
            topology.deadEnds.some(de => de.x === elem.x && de.y === elem.y)
        ).length;
    }

    countElementsOnPath(elements, path) {
        if (!path) return 0;

        return elements.filter(elem =>
            path.some(p => p.x === elem.x && p.y === elem.y)
        ).length;
    }

    isOnPath(point, path) {
        if (!path) return false;
        return path.some(p => p.x === point.x && p.y === point.y);
    }

    findClusters(points, minDistance) {
        const clusters = [];

        for (const point of points) {
            const nearbyPoints = points.filter(p =>
                p !== point &&
                Math.abs(p.x - point.x) + Math.abs(p.y - point.y) <= minDistance
            );

            if (nearbyPoints.length >= 2) {
                clusters.push({
                    center: point,
                    points: nearbyPoints,
                    size: nearbyPoints.length + 1
                });
            }
        }

        return clusters;
    }

    findBottlenecks() {
        // Simplified: doors are natural bottlenecks
        return this.doors.map(door => ({
            position: door,
            type: 'door',
            requiresKey: true
        }));
    }

    generateRecommendations(criticalDecisions, riskZones, rewardZones) {
        const recommendations = [];

        if (criticalDecisions.length > 5) {
            recommendations.push("High number of critical decisions - plan route carefully");
        }

        if (riskZones.length > 0) {
            recommendations.push(`Avoid ${riskZones.length} trap cluster(s) - use shield power-ups`);
        }

        if (rewardZones.length > 0) {
            recommendations.push(`${rewardZones.length} gem cluster(s) identified - prioritize for efficient collection`);
        }

        return recommendations;
    }

    getDifficultyRating(score) {
        if (score >= 80) return 'Expert';
        if (score >= 60) return 'Hard';
        if (score >= 40) return 'Medium';
        if (score >= 20) return 'Easy';
        return 'Trivial';
    }

    // Export analysis as JSON
    toJSON() {
        return JSON.stringify(this.analysis, null, 2);
    }

    // Get summary for display
    getSummary() {
        if (!this.analysis) {
            this.analyze();
        }

        return {
            difficulty: this.analysis.difficulty.overall,
            rating: this.analysis.difficulty.rating,
            optimalSteps: this.analysis.paths.collectionPath.steps,
            decisionPoints: this.analysis.topology.decisionPoints.length,
            deadEnds: this.analysis.topology.deadEnds.length,
            traps: this.analysis.elements.traps.count,
            gems: this.analysis.elements.gems.count
        };
    }
}
