// Level Configuration System
// Defines all worlds, levels, objectives, and progression requirements

export const WORLDS = {
    1: {
        id: 1,
        name: "Training Grounds",
        description: "Learn the basics of maze navigation",
        unlockRequirement: 0, // Always unlocked
        levels: [
            {
                id: 1,
                worldId: 1,
                name: "Baby Steps",
                description: "Take your first steps into the temple. Just reach the exit.",
                size: 11,
                mazeType: 'classic',
                complexity: 'easy',

                // What the game will generate
                config: {
                    gems: 2,
                    traps: 0,
                    keys: 0,
                    doors: 0,
                    bonus: 0
                },

                // What player needs to do
                objectives: {
                    primary: "Reach the exit",
                    secondary: [
                        "Collect gems (optional)"
                    ]
                },

                // How to earn stars
                starRequirements: {
                    1: {
                        description: "Complete the level",
                        complete: true
                    },
                    2: {
                        description: "Collect 1 gem",
                        complete: true,
                        gemsPercent: 50  // 1 out of 2
                    },
                    3: {
                        description: "Collect all gems",
                        complete: true,
                        gemsPercent: 100
                    }
                },

                unlockRequirement: 0 // Always unlocked
            },

            {
                id: 2,
                worldId: 1,
                name: "First Choice",
                description: "The path splits. Which way will you go?",
                size: 11,
                mazeType: 'branching',
                complexity: 'easy',

                config: {
                    gems: 4,
                    traps: 1,
                    keys: 0,
                    doors: 0,
                    bonus: 1
                },

                objectives: {
                    primary: "Reach the exit",
                    secondary: [
                        "Collect at least 2 gems",
                        "Find the bonus treasure"
                    ]
                },

                starRequirements: {
                    1: {
                        description: "Complete the level",
                        complete: true
                    },
                    2: {
                        description: "Collect 3 gems",
                        complete: true,
                        gemsPercent: 75
                    },
                    3: {
                        description: "Collect all gems and find bonus",
                        complete: true,
                        gemsPercent: 100,
                        bonusCollected: true
                    }
                },

                unlockRequirement: 1 // Need 1 star from previous level
            },

            {
                id: 3,
                worldId: 1,
                name: "The Locked Door",
                description: "Find the key to unlock your path.",
                size: 11,
                mazeType: 'classic',
                complexity: 'easy',

                config: {
                    gems: 5,
                    traps: 2,
                    keys: 1,
                    doors: 1,
                    bonus: 0
                },

                objectives: {
                    primary: "Find the key and reach the exit",
                    secondary: [
                        "Collect gems",
                        "Avoid traps"
                    ]
                },

                starRequirements: {
                    1: {
                        description: "Complete the level",
                        complete: true
                    },
                    2: {
                        description: "Collect 4 gems",
                        complete: true,
                        gemsPercent: 80
                    },
                    3: {
                        description: "Complete without hitting traps",
                        complete: true,
                        gemsPercent: 80,
                        maxTrapsHit: 0
                    }
                },

                unlockRequirement: 2 // Need 2 stars total
            },

            {
                id: 4,
                worldId: 1,
                name: "Danger Zone",
                description: "Traps are everywhere. Be careful!",
                size: 11,
                mazeType: 'branching',
                complexity: 'medium',

                config: {
                    gems: 6,
                    traps: 5,
                    keys: 0,
                    doors: 0,
                    bonus: 1
                },

                objectives: {
                    primary: "Navigate through the traps",
                    secondary: [
                        "Collect gems safely",
                        "Minimize damage taken"
                    ]
                },

                starRequirements: {
                    1: {
                        description: "Complete the level",
                        complete: true
                    },
                    2: {
                        description: "Collect 5 gems",
                        complete: true,
                        gemsPercent: 83
                    },
                    3: {
                        description: "Hit only 1 trap or less",
                        complete: true,
                        gemsPercent: 83,
                        maxTrapsHit: 1
                    }
                },

                unlockRequirement: 4 // Need 4 stars total
            },

            {
                id: 5,
                worldId: 1,
                name: "Power of Protection",
                description: "Use the shield power-up to survive dangerous areas.",
                size: 15,
                mazeType: 'branching',
                complexity: 'medium',

                config: {
                    gems: 8,
                    traps: 6,
                    keys: 1,
                    doors: 1,
                    bonus: 1
                },

                objectives: {
                    primary: "Master power-ups and reach the exit",
                    secondary: [
                        "Find and use the shield",
                        "Collect all gems",
                        "Complete efficiently"
                    ]
                },

                starRequirements: {
                    1: {
                        description: "Complete the level",
                        complete: true
                    },
                    2: {
                        description: "Collect 6 gems",
                        complete: true,
                        gemsPercent: 75
                    },
                    3: {
                        description: "Collect all gems and use shield",
                        complete: true,
                        gemsPercent: 100,
                        powerUpsUsed: 1
                    }
                },

                unlockRequirement: 7 // Need 7 stars total (encourages replaying)
            }
        ]
    }

    // Future: World 2, 3, etc. will be added here
};

// Helper function to get level by ID
export function getLevelById(levelId) {
    for (const worldKey in WORLDS) {
        const world = WORLDS[worldKey];
        const level = world.levels.find(l => l.id === levelId);
        if (level) {
            return level;
        }
    }
    return null;
}

// Helper function to get world by ID
export function getWorldById(worldId) {
    return WORLDS[worldId] || null;
}

// Check if level is unlocked based on total stars
export function isLevelUnlocked(levelId, totalStars) {
    const level = getLevelById(levelId);
    if (!level) return false;
    return totalStars >= level.unlockRequirement;
}

// Check if world is unlocked
export function isWorldUnlocked(worldId, totalStars) {
    const world = getWorldById(worldId);
    if (!world) return false;
    return totalStars >= world.unlockRequirement;
}

// Get total number of levels
export function getTotalLevels() {
    let count = 0;
    for (const worldKey in WORLDS) {
        count += WORLDS[worldKey].levels.length;
    }
    return count;
}

// Get max possible stars
export function getMaxStars() {
    return getTotalLevels() * 3;
}

// Calculate stars earned for a level based on performance
export function calculateStarsForLevel(level, gameState) {
    let stars = 0;
    const requirements = level.starRequirements;

    // Star 1: Just complete
    if (requirements[1].complete && gameState.won) {
        stars = 1;
    } else {
        return 0; // Didn't complete
    }

    // Star 2: Check additional requirements
    if (requirements[2]) {
        let star2Met = true;

        if (requirements[2].gemsPercent !== undefined) {
            const gemsRequired = Math.ceil(gameState.totalGems * requirements[2].gemsPercent / 100);
            if (gameState.gemsCollected < gemsRequired) {
                star2Met = false;
            }
        }

        if (requirements[2].bonusCollected && !gameState.bonusCollected) {
            star2Met = false;
        }

        if (star2Met) {
            stars = 2;
        } else {
            return 1;
        }
    }

    // Star 3: Check even more requirements
    if (requirements[3]) {
        let star3Met = true;

        if (requirements[3].gemsPercent !== undefined) {
            const gemsRequired = Math.ceil(gameState.totalGems * requirements[3].gemsPercent / 100);
            if (gameState.gemsCollected < gemsRequired) {
                star3Met = false;
            }
        }

        if (requirements[3].bonusCollected && !gameState.bonusCollected) {
            star3Met = false;
        }

        if (requirements[3].maxTrapsHit !== undefined) {
            if (gameState.trapsHit > requirements[3].maxTrapsHit) {
                star3Met = false;
            }
        }

        if (requirements[3].powerUpsUsed !== undefined) {
            if (gameState.powerUpsUsed < requirements[3].powerUpsUsed) {
                star3Met = false;
            }
        }

        if (star3Met) {
            stars = 3;
        }
    }

    return stars;
}
