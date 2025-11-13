// Player Settings Class
// Manages player profile, preferences, unlocks, and progress

import { CloudAPI, generatePlayerId } from '../services/CloudAPI.js';

export class PlayerSettings {
    constructor() {
        this.cloudAPI = null;
        this.cloudSyncEnabled = true;
        this.load();
        this.initializeCloudSync();
    }

    load() {
        const saved = localStorage.getItem('mazeTemple_playerSettings');
        if (saved) {
            const data = JSON.parse(saved);
            this.playerId = data.playerId || null;
            this.name = data.name || 'Player';
            this.skin = data.skin || '🤖';
            this.mazeSize = data.mazeSize || 15;
            this.mazeType = data.mazeType || 'classic';
            this.mazeComplexity = data.mazeComplexity || 'medium';
            this.totalScore = data.totalScore || 0;
            this.levelsCompleted = data.levelsCompleted || 0;
            this.threeStarLevels = data.threeStarLevels || 0;
            this.levelStars = data.levelStars || {};
            this.currentLevel = data.currentLevel || 1;
        } else {
            this.playerId = null;
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
            playerId: this.playerId,
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

    // Initialize cloud sync
    async initializeCloudSync() {
        if (!this.cloudSyncEnabled) return;

        // Generate player ID if not exists
        if (!this.playerId) {
            this.playerId = generatePlayerId();
            this.save();
        }

        // Initialize cloud API
        this.cloudAPI = new CloudAPI(this.playerId);

        // Register player if first time
        try {
            await CloudAPI.registerPlayer(this.playerId, this.name, this.skin);
            console.log('Player registered:', this.playerId);
        } catch (error) {
            // Already registered, that's ok
            console.log('Player already registered');
        }

        // Load from cloud and merge
        await this.loadFromCloud();
    }

    // Load progress from cloud and merge with local
    async loadFromCloud() {
        if (!this.cloudAPI) return;

        try {
            const cloudData = await this.cloudAPI.getProgress();
            if (!cloudData) return;

            console.log('Cloud data loaded:', cloudData);

            // Merge progress (keep best of both)
            const cloudProgress = cloudData.progress;
            if (cloudProgress) {
                this.totalScore = Math.max(this.totalScore, cloudProgress.total_score || 0);
                this.currentLevel = Math.max(this.currentLevel, cloudProgress.current_level || 1);

                // Merge level stars (keep highest)
                if (cloudData.completions) {
                    cloudData.completions.forEach(completion => {
                        const localStars = this.levelStars[completion.level_id] || 0;
                        if (completion.stars > localStars) {
                            this.levelStars[completion.level_id] = completion.stars;
                        }
                    });
                }

                // Recalculate totals
                this.levelsCompleted = Object.keys(this.levelStars).length;
                this.threeStarLevels = Object.values(this.levelStars).filter(s => s === 3).length;

                this.save();
                console.log('Progress merged from cloud');
            }
        } catch (error) {
            console.error('Failed to load from cloud:', error);
        }
    }

    // Sync level completion to cloud
    async syncLevelToCloud(level, stars, score, time, steps) {
        if (!this.cloudAPI || !this.cloudSyncEnabled) return;

        try {
            await this.cloudAPI.saveProgress(level, stars, score, time, steps);
            console.log(`Level ${level} synced to cloud`);
        } catch (error) {
            console.error('Failed to sync to cloud:', error);
        }
    }

    addScore(score) {
        this.totalScore += score;
        this.save();
    }

    completeLevel(level, stars, score, time, steps) {
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

        // Sync to cloud (don't await - fire and forget)
        this.syncLevelToCloud(level, stars, score, time, steps);
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
