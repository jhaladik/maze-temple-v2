// Performance Evaluator Class
// Evaluates player/AI performance against optimal maze solutions

export class PerformanceEvaluator {
    constructor(mazeAnalysis, gameState) {
        this.mazeAnalysis = mazeAnalysis;
        this.gameState = gameState;
        this.evaluation = null;
    }

    // Main evaluation method
    evaluate() {
        const startTime = performance.now();

        this.evaluation = {
            timestamp: Date.now(),
            gameMode: this.gameState.gameMode,
            level: this.gameState.level,

            // Basic stats
            stats: this.collectBasicStats(),

            // Efficiency scores
            efficiency: this.calculateEfficiencyScores(),

            // Quality metrics
            quality: this.calculateQualityMetrics(),

            // Final score
            score: this.calculateFinalScore(),

            // Comparison with optimal
            comparison: this.compareWithOptimal(),

            // Performance rating
            rating: null,

            // Improvement suggestions
            improvements: [],

            // Meta
            meta: {
                evaluationTimeMs: 0,
                version: '1.0.0'
            }
        };

        this.evaluation.rating = this.getRating(this.evaluation.score.final);
        this.evaluation.improvements = this.generateImprovements();
        this.evaluation.meta.evaluationTimeMs = performance.now() - startTime;

        return this.evaluation;
    }

    // === BASIC STATS ===

    collectBasicStats() {
        return {
            steps: this.gameState.player.steps,
            score: this.gameState.player.score,
            gemsCollected: this.gameState.gemsCollected,
            totalGems: this.gameState.totalGems,
            keysCollected: this.gameState.player.keys,
            timeElapsed: this.gameState.timeElapsed,
            won: this.gameState.won,
            visitedCells: this.gameState.visitedCells ? this.gameState.visitedCells.size : 0,
            backtrackCount: this.gameState.backtrackCount || 0,
            trapsHit: this.gameState.trapsHit || 0,
            trapsAvoided: this.gameState.trapsAvoided || 0,
            powerUpsUsed: this.gameState.powerUpsUsed || 0,
            decisionsMade: this.gameState.decisionsMade ? this.gameState.decisionsMade.length : 0
        };
    }

    // === EFFICIENCY CALCULATIONS ===

    calculateEfficiencyScores() {
        const stats = this.collectBasicStats();
        const benchmarks = this.mazeAnalysis.benchmarks;

        // Path efficiency: how close to optimal path
        const pathEfficiency = this.calculatePathEfficiency(
            stats.steps,
            benchmarks.optimalSteps
        );

        // Collection efficiency: gems collected vs total
        const collectionEfficiency = stats.totalGems > 0
            ? (stats.gemsCollected / stats.totalGems) * 100
            : 100;

        // Time efficiency: expected vs actual time
        const timeEfficiency = this.calculateTimeEfficiency(
            stats.timeElapsed,
            benchmarks.expectedTime.intermediate
        );

        // Exploration efficiency: useful cells vs visited cells
        const explorationEfficiency = this.calculateExplorationEfficiency(
            stats.visitedCells,
            stats.steps,
            benchmarks.optimalSteps
        );

        // Average efficiency
        const averageEfficiency = (
            pathEfficiency +
            collectionEfficiency +
            timeEfficiency +
            explorationEfficiency
        ) / 4;

        return {
            path: Math.round(pathEfficiency),
            collection: Math.round(collectionEfficiency),
            time: Math.round(timeEfficiency),
            exploration: Math.round(explorationEfficiency),
            average: Math.round(averageEfficiency)
        };
    }

    calculatePathEfficiency(actualSteps, optimalSteps) {
        if (optimalSteps === 0) return 100;
        const efficiency = (optimalSteps / actualSteps) * 100;
        return Math.min(100, Math.max(0, efficiency));
    }

    calculateTimeEfficiency(actualTime, expectedTime) {
        if (actualTime === 0 || expectedTime === 0) return 100;
        const efficiency = (expectedTime / actualTime) * 100;
        return Math.min(100, Math.max(0, efficiency));
    }

    calculateExplorationEfficiency(visitedCells, actualSteps, optimalSteps) {
        // Good exploration = visiting cells close to the optimal path count
        // Bad exploration = visiting too many unnecessary cells
        if (visitedCells === 0 || actualSteps === 0) return 100;

        const idealVisited = optimalSteps * 1.2; // Allow 20% exploration
        const efficiency = (idealVisited / visitedCells) * 100;
        return Math.min(100, Math.max(0, efficiency));
    }

    // === QUALITY METRICS ===

    calculateQualityMetrics() {
        const stats = this.collectBasicStats();
        const spatial = this.mazeAnalysis.spatial;

        // Backtracking ratio
        const backtrackRatio = stats.steps > 0
            ? (stats.backtrackCount / stats.steps) * 100
            : 0;

        // Trap avoidance rate
        const totalTraps = this.mazeAnalysis.elements.traps.count;
        const trapAvoidanceRate = totalTraps > 0
            ? (stats.trapsAvoided / totalTraps) * 100
            : 100;

        // Power-up utilization
        const totalPowerUps = this.mazeAnalysis.elements.powerUps.count;
        const powerUpUtilization = totalPowerUps > 0
            ? (stats.powerUpsUsed / totalPowerUps) * 100
            : 0;

        // Decision quality (if tracked)
        const decisionQuality = this.calculateDecisionQuality();

        // Exploration coverage
        const explorationCoverage = spatial.reachableCells > 0
            ? (stats.visitedCells / spatial.reachableCells) * 100
            : 0;

        return {
            backtrackRatio: Math.round(backtrackRatio),
            trapAvoidanceRate: Math.round(trapAvoidanceRate),
            powerUpUtilization: Math.round(powerUpUtilization),
            decisionQuality: Math.round(decisionQuality),
            explorationCoverage: Math.round(explorationCoverage)
        };
    }

    calculateDecisionQuality() {
        // If we have decision tracking, analyze quality
        // For now, return a placeholder based on efficiency
        const efficiency = this.calculateEfficiencyScores();
        return efficiency.average;
    }

    // === FINAL SCORE CALCULATION ===

    calculateFinalScore() {
        const difficulty = this.mazeAnalysis.difficulty.overall;
        const efficiency = this.calculateEfficiencyScores();
        const quality = this.calculateQualityMetrics();
        const stats = this.collectBasicStats();

        // Base score from maze difficulty
        const baseScore = difficulty * 100;

        // Efficiency multiplier (0.0 - 1.0)
        const efficiencyMultiplier = efficiency.average / 100;

        // Calculate bonuses
        const bonuses = this.calculateBonuses(stats, quality);

        // Calculate penalties
        const penalties = this.calculatePenalties(stats, quality);

        // Final score calculation
        const finalScore = Math.max(0, Math.round(
            (baseScore * efficiencyMultiplier) + bonuses.total - penalties.total
        ));

        return {
            base: Math.round(baseScore),
            efficiencyMultiplier: Math.round(efficiencyMultiplier * 100) / 100,
            bonuses,
            penalties,
            final: finalScore
        };
    }

    calculateBonuses(stats, quality) {
        let timeBonus = 0;
        let collectionBonus = 0;
        let perfectionBonus = 0;
        let trapMasterBonus = 0;

        // Time bonus (for timed levels)
        if (this.gameState.isTimedLevel && stats.won) {
            const timeRemaining = this.gameState.timeLimit - stats.timeElapsed;
            if (timeRemaining > 0) {
                timeBonus = Math.round(timeRemaining * 2);
            }
        }

        // Collection bonus (all gems collected)
        if (stats.gemsCollected === stats.totalGems && stats.totalGems > 0) {
            collectionBonus = 500;
        }

        // Perfection bonus (near-optimal path)
        const efficiency = this.calculateEfficiencyScores();
        if (efficiency.path >= 90) {
            perfectionBonus = 1000;
        } else if (efficiency.path >= 80) {
            perfectionBonus = 500;
        }

        // Trap master bonus (avoided all traps)
        if (stats.trapsHit === 0 && this.mazeAnalysis.elements.traps.count > 0) {
            trapMasterBonus = 300;
        }

        const total = timeBonus + collectionBonus + perfectionBonus + trapMasterBonus;

        return {
            time: timeBonus,
            collection: collectionBonus,
            perfection: perfectionBonus,
            trapMaster: trapMasterBonus,
            total
        };
    }

    calculatePenalties(stats, quality) {
        let backtrackPenalty = 0;
        let trapPenalty = 0;
        let incompletePenalty = 0;

        // Backtracking penalty
        if (quality.backtrackRatio > 20) {
            backtrackPenalty = Math.round((quality.backtrackRatio - 20) * 10);
        }

        // Trap penalty
        trapPenalty = stats.trapsHit * 50;

        // Incomplete penalty (didn't finish)
        if (!stats.won) {
            incompletePenalty = 1000;
        }

        const total = backtrackPenalty + trapPenalty + incompletePenalty;

        return {
            backtrack: backtrackPenalty,
            trap: trapPenalty,
            incomplete: incompletePenalty,
            total
        };
    }

    // === COMPARISON WITH OPTIMAL ===

    compareWithOptimal() {
        const stats = this.collectBasicStats();
        const benchmarks = this.mazeAnalysis.benchmarks;
        const optimalSteps = benchmarks.optimalSteps;

        const stepsDifference = stats.steps - optimalSteps;
        const stepsPercentDiff = optimalSteps > 0
            ? Math.round((stepsDifference / optimalSteps) * 100)
            : 0;

        // Determine player level
        let playerLevel = 'beginner';
        if (stats.steps <= benchmarks.expectedSteps.expert) {
            playerLevel = 'expert';
        } else if (stats.steps <= benchmarks.expectedSteps.intermediate) {
            playerLevel = 'intermediate';
        }

        // Calculate how far from each benchmark
        const vsExpert = stats.steps - benchmarks.expectedSteps.expert;
        const vsIntermediate = stats.steps - benchmarks.expectedSteps.intermediate;
        const vsBeginner = stats.steps - benchmarks.expectedSteps.beginner;

        return {
            optimalSteps,
            actualSteps: stats.steps,
            stepsDifference,
            stepsPercentDiff,
            playerLevel,
            vsExpert,
            vsIntermediate,
            vsBeginner,
            betterThanRandom: stats.steps < benchmarks.expectedSteps.random
        };
    }

    // === RATING ===

    getRating(finalScore) {
        const benchmarks = this.mazeAnalysis.benchmarks.scoreTargets;

        if (finalScore >= benchmarks.perfect) {
            return { grade: 'S', stars: 3, description: 'Perfect!' };
        } else if (finalScore >= benchmarks.good) {
            return { grade: 'A', stars: 3, description: 'Excellent' };
        } else if (finalScore >= benchmarks.average) {
            return { grade: 'B', stars: 2, description: 'Good' };
        } else if (finalScore >= benchmarks.passing) {
            return { grade: 'C', stars: 1, description: 'Fair' };
        } else {
            return { grade: 'D', stars: 0, description: 'Needs Improvement' };
        }
    }

    // === IMPROVEMENT SUGGESTIONS ===

    generateImprovements() {
        const improvements = [];
        const efficiency = this.calculateEfficiencyScores();
        const quality = this.calculateQualityMetrics();
        const comparison = this.compareWithOptimal();
        const stats = this.collectBasicStats();

        // Path efficiency improvements
        if (efficiency.path < 70) {
            improvements.push({
                category: 'Path Planning',
                priority: 'high',
                message: `Path efficiency is ${efficiency.path}%. Reduce unnecessary movements by ${comparison.stepsDifference} steps.`,
                suggestion: 'Plan your route before moving. Look for the shortest path to objectives.'
            });
        }

        // Backtracking improvements
        if (quality.backtrackRatio > 30) {
            improvements.push({
                category: 'Navigation',
                priority: 'high',
                message: `High backtracking ratio (${quality.backtrackRatio}%).`,
                suggestion: 'Explore systematically. Mark dead ends mentally to avoid revisiting them.'
            });
        }

        // Collection improvements
        if (efficiency.collection < 100 && stats.totalGems > 0) {
            const missedGems = stats.totalGems - stats.gemsCollected;
            improvements.push({
                category: 'Collection',
                priority: 'medium',
                message: `Missed ${missedGems} gem(s).`,
                suggestion: 'Explore all areas thoroughly before heading to the exit.'
            });
        }

        // Trap avoidance improvements
        if (stats.trapsHit > 0) {
            improvements.push({
                category: 'Hazard Avoidance',
                priority: 'medium',
                message: `Hit ${stats.trapsHit} trap(s).`,
                suggestion: 'Be more careful with movement. Use shield power-ups in risky areas.'
            });
        }

        // Exploration improvements
        if (efficiency.exploration < 60) {
            improvements.push({
                category: 'Exploration',
                priority: 'low',
                message: `Low exploration efficiency (${efficiency.exploration}%). Visited too many unnecessary cells.`,
                suggestion: 'Focus on goal-directed exploration. Avoid wandering aimlessly.'
            });
        }

        // Time improvements
        if (efficiency.time < 70 && this.gameState.isTimedLevel) {
            improvements.push({
                category: 'Speed',
                priority: 'high',
                message: `Time efficiency is ${efficiency.time}%. Move faster to beat the timer.`,
                suggestion: 'Practice quick decision-making. Use speed power-ups strategically.'
            });
        }

        // Power-up usage
        if (quality.powerUpUtilization < 50 && this.mazeAnalysis.elements.powerUps.count > 0) {
            improvements.push({
                category: 'Power-ups',
                priority: 'low',
                message: `Only used ${quality.powerUpUtilization}% of available power-ups.`,
                suggestion: 'Collect and use power-ups strategically for better performance.'
            });
        }

        // Sort by priority
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        improvements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return improvements;
    }

    // === EXPORT & DISPLAY ===

    toJSON() {
        return JSON.stringify(this.evaluation, null, 2);
    }

    getSummary() {
        if (!this.evaluation) {
            this.evaluate();
        }

        return {
            score: this.evaluation.score.final,
            rating: this.evaluation.rating,
            efficiency: this.evaluation.efficiency.average,
            playerLevel: this.evaluation.comparison.playerLevel,
            improvements: this.evaluation.improvements.length,
            stars: this.evaluation.rating.stars
        };
    }

    getDetailedReport() {
        if (!this.evaluation) {
            this.evaluate();
        }

        return {
            header: {
                level: this.evaluation.level,
                mode: this.evaluation.gameMode,
                won: this.evaluation.stats.won
            },
            performance: {
                score: this.evaluation.score.final,
                grade: this.evaluation.rating.grade,
                stars: this.evaluation.rating.stars
            },
            efficiency: this.evaluation.efficiency,
            comparison: {
                optimalSteps: this.evaluation.comparison.optimalSteps,
                yourSteps: this.evaluation.comparison.actualSteps,
                difference: this.evaluation.comparison.stepsDifference,
                playerLevel: this.evaluation.comparison.playerLevel
            },
            highlights: {
                perfectPath: this.evaluation.efficiency.path >= 90,
                allGemsCollected: this.evaluation.efficiency.collection === 100,
                noTrapsHit: this.evaluation.stats.trapsHit === 0
            },
            improvements: this.evaluation.improvements.slice(0, 3) // Top 3
        };
    }
}
