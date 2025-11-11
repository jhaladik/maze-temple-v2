// Game Constants and Configuration
// MAZE-TEMPLE v2 - AI Agent Training School

export const ELEMENTS = {
    empty: ' ',
    wall: '⬛',
    player: '🤖',
    gem: '💎',
    bonus: '⭐',
    trap: '🔥',
    key: '🔑',
    door: '🚪',
    exit: '🎯',
    shield: '🛡️',
    speed: '⚡',
};

export const ACTIONS = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};

export const SKINS = {
    '🤖': { name: 'Robot', unlockScore: 0 },
    '🦊': { name: 'Fox', unlockScore: 10 },
    '🐉': { name: 'Dragon', unlockScore: 25 },
    '👾': { name: 'Alien', unlockScore: 50 },
    '🐱': { name: 'Cat', unlockScore: 75 },
    '🦄': { name: 'Unicorn', unlockScore: 100 }
};

export const MAZE_SIZES = {
    11: { cellSize: 36, name: 'Small' },
    15: { cellSize: 32, name: 'Medium' },
    19: { cellSize: 26, name: 'Large' },
    23: { cellSize: 22, name: 'XL' }
};

export const TIME_LIMITS = {
    3: 90,  // Level 3: 90 seconds
    6: 120, // Level 6: 120 seconds
    9: 150  // Level 9: 150 seconds
};

export const DIFFICULTY_CONFIGS = {
    1: { gems: 5, traps: 2, keys: 0, doors: 0, bonus: 1 },
    2: { gems: 8, traps: 4, keys: 0, doors: 0, bonus: 1 },
    3: { gems: 10, traps: 6, keys: 1, doors: 1, bonus: 2 },
    4: { gems: 12, traps: 8, keys: 1, doors: 2, bonus: 2 },
    5: { gems: 15, traps: 10, keys: 2, doors: 2, bonus: 3 },
    6: { gems: 18, traps: 12, keys: 2, doors: 3, bonus: 3 },
    7: { gems: 20, traps: 14, keys: 2, doors: 3, bonus: 4 },
    8: { gems: 22, traps: 16, keys: 3, doors: 4, bonus: 4 },
    9: { gems: 25, traps: 18, keys: 3, doors: 4, bonus: 5 },
    10: { gems: 30, traps: 20, keys: 4, doors: 5, bonus: 5 }
};
