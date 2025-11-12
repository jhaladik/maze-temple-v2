// Player Settings Class
// Manages player profile, preferences, unlocks, and progress

export class PlayerSettings {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('mazeTemple_playerSettings');
        if (saved) {
            const data = JSON.parse(saved);
            this.name = data.name || 'Player';
            this.skin = data.skin || '🤖';
            this.mazeSize = data.mazeSize || 15;
            this.mazeType = data.mazeType || 'classic';
            this.mazeComplexity = data.mazeComplexity || 'medium';
            this.totalScore = data.totalScore || 0;
            this.levelsCompleted = data.levelsCompleted || 0;
            this.threeStarLevels = data.threeStarLevels || 0;
            this.levelStars = data.levelStars || {};
            this.currentLevel = data.currentLevel || 1; // Track current level for progression
        } else {
            this.name = 'Player';
            this.skin = '🤖';
            this.mazeSize = 15;
            this.mazeType = 'classic';
            this.mazeComplexity = 'medium';
            this.totalScore = 0;
            this.levelsCompleted = 0;
            this.threeStarLevels = 0;
            this.levelStars = {};
            this.currentLevel = 1;
        }
    }

    save() {
        localStorage.setItem('mazeTemple_playerSettings', JSON.stringify({
            name: this.name,
            skin: this.skin,
            mazeSize: this.mazeSize,
            mazeType: this.mazeType,
            mazeComplexity: this.mazeComplexity,
            totalScore: this.totalScore,
            levelsCompleted: this.levelsCompleted,
            threeStarLevels: this.threeStarLevels,
            levelStars: this.levelStars,
            currentLevel: this.currentLevel
        }));
    }

    addScore(score) {
        this.totalScore += score;
        this.save();
    }

    completeLevel(level, stars) {
        if (!this.levelStars[level] || this.levelStars[level] < stars) {
            this.levelStars[level] = stars;
        }
        this.levelsCompleted = Object.keys(this.levelStars).length;
        this.threeStarLevels = Object.values(this.levelStars).filter(s => s === 3).length;

        // Update current level to next level if this is the current level
        if (level === this.currentLevel) {
            this.currentLevel = level + 1;
        }

        this.save();
    }

    // Get total stars earned across all levels
    getTotalStars() {
        return Object.values(this.levelStars).reduce((sum, stars) => sum + stars, 0);
    }

    // Get stars for a specific level (0 if not completed)
    getStarsForLevel(level) {
        return this.levelStars[level] || 0;
    }

    // Check if a level has been completed (any stars)
    isLevelCompleted(level) {
        return this.levelStars[level] > 0;
    }

    // Get current progress level (furthest unlocked level)
    getCurrentLevel() {
        return this.currentLevel;
    }

    // Set current level (for level select)
    setCurrentLevel(level) {
        this.currentLevel = level;
        this.save();
    }

    getUnlockedSkins() {
        const unlocked = ['🤖']; // Default always unlocked
        if (this.levelsCompleted >= 5) unlocked.push('🦊');
        if (this.levelsCompleted >= 10) unlocked.push('🐉');
        if (this.threeStarLevels >= 1) unlocked.push('👾');
        if (this.totalScore >= 1000) unlocked.push('🐱');
        if (this.levelsCompleted >= 10 && Object.keys(this.levelStars).length === 10) unlocked.push('🦄');
        return unlocked;
    }
}
