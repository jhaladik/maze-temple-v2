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
