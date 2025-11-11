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
            levelStars: this.levelStars
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
