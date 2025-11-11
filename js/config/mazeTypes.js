// Maze Type Configuration
// Defines all available maze generation algorithms and their properties

export const MAZE_TYPES = {
    CLASSIC: {
        id: 'classic',
        name: 'Classic',
        emoji: '🔲',
        description: 'Traditional recursive maze - Linear paths, teaches basic navigation',
        aiTraining: 'Basic pathfinding, no decisions',
        complexityLevels: {
            easy: { deadEnds: 'low', branches: 'none', loops: false },
            medium: { deadEnds: 'medium', branches: 'few', loops: false },
            hard: { deadEnds: 'high', branches: 'some', loops: false }
        }
    },

    BRANCHING: {
        id: 'branching',
        name: 'Branching Paths',
        emoji: '🌳',
        description: 'Multiple routes to exit - Teaches decision-making and exploration',
        aiTraining: 'Decision points, path evaluation, risk assessment',
        complexityLevels: {
            easy: { paths: 2, deadEnds: 'low', decisionPoints: 3 },
            medium: { paths: 3, deadEnds: 'medium', decisionPoints: 5 },
            hard: { paths: 5, deadEnds: 'high', decisionPoints: 8 }
        }
    },

    LOOPED: {
        id: 'looped',
        name: 'Looped Maze',
        emoji: '🔄',
        description: 'Interconnected loops - Teaches exploration vs exploitation',
        aiTraining: 'Loop detection, optimal path discovery, backtracking',
        complexityLevels: {
            easy: { loops: 3, connectivity: 'low' },
            medium: { loops: 6, connectivity: 'medium' },
            hard: { loops: 10, connectivity: 'high' }
        }
    },

    ROOMS: {
        id: 'rooms',
        name: 'Room & Corridor',
        emoji: '🏛️',
        description: 'Strategic rooms connected by corridors - Teaches spatial reasoning',
        aiTraining: 'Room exploration, corridor navigation, strategic choices',
        complexityLevels: {
            easy: { rooms: 3, corridors: 3, roomSize: 'large' },
            medium: { rooms: 5, corridors: 6, roomSize: 'medium' },
            hard: { rooms: 8, corridors: 12, roomSize: 'small' }
        }
    },

    STRATEGIC: {
        id: 'strategic',
        name: 'Strategic Maze',
        emoji: '🎯',
        description: 'Risk/reward paths, shortcuts, key quests - Teaches long-term planning',
        aiTraining: 'Strategic planning, risk/reward, resource management',
        complexityLevels: {
            easy: { shortcuts: 1, quests: 1, riskPaths: 1 },
            medium: { shortcuts: 2, quests: 2, riskPaths: 2 },
            hard: { shortcuts: 3, quests: 3, riskPaths: 3 }
        }
    },

    HYBRID: {
        id: 'hybrid',
        name: 'Hybrid Complex',
        emoji: '🌀',
        description: 'Combines all techniques - Maximum complexity for advanced AI',
        aiTraining: 'All skills combined, maximum challenge',
        complexityLevels: {
            easy: { mix: 'balanced', challenge: 'medium' },
            medium: { mix: 'varied', challenge: 'high' },
            hard: { mix: 'chaotic', challenge: 'extreme' }
        }
    },

    ORGANIC: {
        id: 'organic',
        name: 'Organic Caves',
        emoji: '🕳️',
        description: 'Natural cave-like structure - Teaches adaptive navigation',
        aiTraining: 'Irregular spaces, unpredictable layouts',
        complexityLevels: {
            easy: { openness: 0.4, smoothness: 'high' },
            medium: { openness: 0.5, smoothness: 'medium' },
            hard: { openness: 0.6, smoothness: 'low' }
        }
    }
};

export const COMPLEXITY_LEVELS = {
    EASY: { id: 'easy', name: 'Easy', multiplier: 0.7 },
    MEDIUM: { id: 'medium', name: 'Medium', multiplier: 1.0 },
    HARD: { id: 'hard', name: 'Hard', multiplier: 1.3 }
};

// Maze type recommendations for different AI training stages
export const AI_TRAINING_PROGRESSION = [
    { stage: 1, mazeType: 'classic', complexity: 'easy', description: 'Learn basic movement' },
    { stage: 2, mazeType: 'branching', complexity: 'easy', description: 'Learn decisions' },
    { stage: 3, mazeType: 'looped', complexity: 'medium', description: 'Learn exploration' },
    { stage: 4, mazeType: 'rooms', complexity: 'medium', description: 'Learn spatial reasoning' },
    { stage: 5, mazeType: 'strategic', complexity: 'hard', description: 'Learn planning' },
    { stage: 6, mazeType: 'hybrid', complexity: 'hard', description: 'Master all skills' }
];
