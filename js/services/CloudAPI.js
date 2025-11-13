// Cloud API Client
// Communicates with Cloudflare Worker backend for player data sync

const API_BASE = 'https://maze-temple-api.jhaladik.workers.dev/api';

export class CloudAPI {
    constructor(playerToken) {
        this.playerToken = playerToken;
    }

    // Register new player
    static async registerPlayer(playerId, username, avatar) {
        try {
            const response = await fetch(`${API_BASE}/player/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerId, username, avatar })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Get player progress from cloud
    async getProgress() {
        try {
            const response = await fetch(`${API_BASE}/player/progress`, {
                method: 'GET',
                headers: {
                    'X-Player-Token': this.playerToken
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Player not found
                }
                throw new Error('Failed to fetch progress');
            }

            return await response.json();
        } catch (error) {
            console.error('Get progress error:', error);
            return null;
        }
    }

    // Save progress to cloud
    async saveProgress(level, stars, score, time, steps) {
        try {
            const response = await fetch(`${API_BASE}/player/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Player-Token': this.playerToken
                },
                body: JSON.stringify({ level, stars, score, time, steps })
            });

            if (!response.ok) {
                throw new Error('Failed to save progress');
            }

            return await response.json();
        } catch (error) {
            console.error('Save progress error:', error);
            throw error;
        }
    }

    // Get leaderboard
    static async getLeaderboard(limit = 100, levelId = null) {
        try {
            let url = `${API_BASE}/leaderboard/global?limit=${limit}`;
            if (levelId) {
                url += `&level=${levelId}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            return await response.json();
        } catch (error) {
            console.error('Get leaderboard error:', error);
            return { leaderboard: [], count: 0 };
        }
    }

    // Submit score to leaderboard
    async submitScore(level, score, stars, time, steps) {
        try {
            const response = await fetch(`${API_BASE}/leaderboard/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Player-Token': this.playerToken
                },
                body: JSON.stringify({ level, score, stars, time, steps })
            });

            if (!response.ok) {
                throw new Error('Failed to submit score');
            }

            return await response.json();
        } catch (error) {
            console.error('Submit score error:', error);
            throw error;
        }
    }

    // Health check
    static async healthCheck() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    // Get maze for level
    static async getMazeForLevel(levelId) {
        try {
            const response = await fetch(`${API_BASE}/maze/${levelId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // No maze assigned to level
                }
                throw new Error('Failed to fetch maze');
            }

            return await response.json();
        } catch (error) {
            console.error('Get maze error:', error);
            return null;
        }
    }

    // Save maze performance
    async saveMazePerformance(mazeId, levelId, completed, stars, score, time, steps, metrics = {}) {
        try {
            const response = await fetch(`${API_BASE}/maze/performance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Player-Token': this.playerToken
                },
                body: JSON.stringify({
                    maze_id: mazeId,
                    level_id: levelId,
                    completed: completed ? 1 : 0,
                    stars,
                    score,
                    time,
                    steps,
                    gems_collected: metrics.gemsCollected || 0,
                    enemies_defeated: metrics.enemiesDefeated || 0,
                    shields_used: metrics.shieldsUsed || 0,
                    deaths: metrics.deaths || 0
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save maze performance');
            }

            return await response.json();
        } catch (error) {
            console.error('Save maze performance error:', error);
            throw error;
        }
    }

    // Assign maze to level (admin function)
    static async assignMazeToLevel(levelId, mazeId, rotationPeriod = 'weekly', setCurrent = true) {
        try {
            const response = await fetch(`${API_BASE}/maze/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level_id: levelId,
                    maze_id: mazeId,
                    rotation_period: rotationPeriod,
                    set_current: setCurrent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to assign maze');
            }

            return await response.json();
        } catch (error) {
            console.error('Assign maze error:', error);
            throw error;
        }
    }
}

// Generate UUID for player ID
export function generatePlayerId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
