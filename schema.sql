-- MAZE TEMPLE Database Schema
-- Cloudflare D1 Database for player progress and leaderboards

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    avatar TEXT DEFAULT '🤖',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_played INTEGER DEFAULT (strftime('%s', 'now')),
    total_playtime INTEGER DEFAULT 0
);

-- Player progress (current state)
CREATE TABLE IF NOT EXISTS player_progress (
    player_id TEXT PRIMARY KEY,
    current_level INTEGER DEFAULT 1,
    total_stars INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    levels_completed INTEGER DEFAULT 0,
    three_star_count INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Level completions (best performance per level)
CREATE TABLE IF NOT EXISTS level_completions (
    player_id TEXT NOT NULL,
    level_id INTEGER NOT NULL,
    stars INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    best_time INTEGER,
    best_steps INTEGER,
    attempts INTEGER DEFAULT 1,
    first_completed INTEGER DEFAULT (strftime('%s', 'now')),
    last_completed INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (player_id, level_id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Global leaderboard (top scores)
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT DEFAULT '🤖',
    level_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    stars INTEGER NOT NULL,
    time_seconds INTEGER,
    steps INTEGER,
    achieved_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON leaderboard(level_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress ON player_progress(total_stars DESC);
CREATE INDEX IF NOT EXISTS idx_level_completions ON level_completions(player_id, level_id);

-- Sample data for testing
INSERT OR IGNORE INTO players (id, username, avatar) VALUES
    ('test-player-1', 'TestPlayer1', '🤖'),
    ('test-player-2', 'MazeRunner', '🦊'),
    ('test-player-3', 'ProGamer', '🐉');

INSERT OR IGNORE INTO player_progress (player_id, current_level, total_stars, total_score) VALUES
    ('test-player-1', 3, 6, 15000),
    ('test-player-2', 5, 12, 28000),
    ('test-player-3', 2, 4, 9000);

-- ==========================================
-- MAZE DATABASE SYSTEM
-- Stores pre-generated, analyzed mazes for fair player comparison
-- ==========================================

-- Mazes table: stores pre-generated maze data with analysis
CREATE TABLE IF NOT EXISTS mazes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maze_data TEXT NOT NULL,              -- JSON serialized maze grid
    size INTEGER NOT NULL,                 -- Maze dimensions (e.g., 11, 15, 21)
    maze_type TEXT NOT NULL,               -- classic, spiral, binary_tree, etc.
    complexity TEXT NOT NULL,              -- easy, medium, hard

    -- Analysis metrics
    optimal_steps INTEGER NOT NULL,        -- Shortest path length
    total_gems INTEGER NOT NULL,           -- Number of gems in maze
    total_keys INTEGER NOT NULL,           -- Number of keys
    total_locks INTEGER NOT NULL,          -- Number of locks
    total_shields INTEGER NOT NULL,        -- Number of shields
    total_enemies INTEGER NOT NULL,        -- Number of enemies

    -- Difficulty scoring
    difficulty_score REAL NOT NULL,        -- 0-1 computed difficulty
    quality_score REAL NOT NULL,           -- 0-1 quality rating

    -- Metadata
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    created_by TEXT DEFAULT 'system',      -- 'system' or player_id for community mazes
    is_active INTEGER DEFAULT 1,           -- 0=archived, 1=active
    play_count INTEGER DEFAULT 0,          -- Times this maze has been played
    average_rating REAL DEFAULT 0          -- Community rating average
);

-- Level-Maze assignments: which mazes are assigned to which levels
CREATE TABLE IF NOT EXISTS level_mazes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL,             -- Level number (1, 2, 3, etc.)
    maze_id INTEGER NOT NULL,              -- Reference to mazes table
    rotation_period TEXT NOT NULL,         -- 'daily', 'weekly', 'monthly', 'permanent'
    active_from INTEGER NOT NULL,          -- Unix timestamp when this becomes active
    active_until INTEGER,                  -- Unix timestamp when this expires (NULL = permanent)
    is_current INTEGER DEFAULT 0,          -- 1 if currently active for this level

    FOREIGN KEY (maze_id) REFERENCES mazes(id),
    UNIQUE(level_id, maze_id, active_from) -- Prevent duplicate assignments
);

-- Player performance on specific mazes: enables fair comparison
CREATE TABLE IF NOT EXISTS player_maze_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    maze_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,

    -- Performance metrics
    completed INTEGER DEFAULT 0,           -- 0=failed, 1=completed
    stars INTEGER DEFAULT 0,               -- 0-3 stars earned
    score INTEGER DEFAULT 0,               -- Points earned
    time_seconds INTEGER NOT NULL,         -- Time taken
    steps INTEGER NOT NULL,                -- Steps taken

    -- Efficiency metrics
    gems_collected INTEGER DEFAULT 0,      -- Gems collected
    enemies_defeated INTEGER DEFAULT 0,    -- Enemies defeated
    shields_used INTEGER DEFAULT 0,        -- Shields collected
    deaths INTEGER DEFAULT 0,              -- Times player died

    -- Metadata
    played_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (maze_id) REFERENCES mazes(id)
);

-- Maze feedback: community ratings and reports
CREATE TABLE IF NOT EXISTS maze_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maze_id INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5), -- 1-5 stars
    difficulty_rating TEXT,                -- 'too_easy', 'just_right', 'too_hard'
    feedback_text TEXT,                    -- Optional text feedback
    is_report INTEGER DEFAULT 0,           -- 1 if reporting quality issue
    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (maze_id) REFERENCES mazes(id),
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(maze_id, player_id)             -- One rating per player per maze
);

-- Indexes for maze system performance
CREATE INDEX IF NOT EXISTS idx_mazes_level_type ON mazes(size, maze_type, complexity);
CREATE INDEX IF NOT EXISTS idx_mazes_quality ON mazes(quality_score DESC, is_active);
CREATE INDEX IF NOT EXISTS idx_level_mazes_current ON level_mazes(level_id, is_current);
CREATE INDEX IF NOT EXISTS idx_level_mazes_active ON level_mazes(level_id, active_from, active_until);
CREATE INDEX IF NOT EXISTS idx_player_maze_perf ON player_maze_performance(player_id, maze_id);
CREATE INDEX IF NOT EXISTS idx_maze_leaderboard ON player_maze_performance(maze_id, score DESC, time_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_maze_feedback ON maze_feedback(maze_id, rating);
