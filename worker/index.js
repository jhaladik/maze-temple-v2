// MAZE TEMPLE API - Cloudflare Worker
// Handles player data, progress sync, and leaderboards

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Player-Token',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/api/player/register' && request.method === 'POST') {
        return await handleRegisterPlayer(request, env, corsHeaders);
      }

      if (path === '/api/player/progress' && request.method === 'GET') {
        return await handleGetProgress(request, env, corsHeaders);
      }

      if (path === '/api/player/progress' && request.method === 'POST') {
        return await handleSaveProgress(request, env, corsHeaders);
      }

      if (path === '/api/leaderboard/global' && request.method === 'GET') {
        return await handleGetLeaderboard(request, env, corsHeaders);
      }

      if (path === '/api/leaderboard/submit' && request.method === 'POST') {
        return await handleSubmitScore(request, env, corsHeaders);
      }

      // Maze endpoints
      if (path.startsWith('/api/maze/') && request.method === 'GET') {
        const levelId = path.split('/')[3];
        if (levelId) {
          return await handleGetMaze(levelId, env, corsHeaders);
        }
      }

      if (path === '/api/maze/performance' && request.method === 'POST') {
        return await handleSaveMazePerformance(request, env, corsHeaders);
      }

      if (path === '/api/maze/assign' && request.method === 'POST') {
        return await handleAssignMaze(request, env, corsHeaders);
      }

      // Health check
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    } catch (error) {
      console.error('API Error:', error);
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  }
};

// Register new player
async function handleRegisterPlayer(request, env, corsHeaders) {
  const data = await request.json();
  const { playerId, username, avatar } = data;

  if (!playerId || !username) {
    return jsonResponse({ error: 'Missing playerId or username' }, corsHeaders, 400);
  }

  try {
    // Insert player
    await env.DB.prepare(
      'INSERT OR IGNORE INTO players (id, username, avatar) VALUES (?, ?, ?)'
    ).bind(playerId, username, avatar || '🤖').run();

    // Initialize progress
    await env.DB.prepare(
      'INSERT OR IGNORE INTO player_progress (player_id) VALUES (?)'
    ).bind(playerId).run();

    return jsonResponse({
      success: true,
      playerId,
      username,
      message: 'Player registered successfully'
    }, corsHeaders);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return jsonResponse({ error: 'Username already taken' }, corsHeaders, 409);
    }
    throw error;
  }
}

// Get player progress
async function handleGetProgress(request, env, corsHeaders) {
  const playerId = request.headers.get('X-Player-Token');

  if (!playerId) {
    return jsonResponse({ error: 'Missing player token' }, corsHeaders, 401);
  }

  // Get player data
  const player = await env.DB.prepare(
    'SELECT * FROM players WHERE id = ?'
  ).bind(playerId).first();

  if (!player) {
    return jsonResponse({ error: 'Player not found' }, corsHeaders, 404);
  }

  // Get progress
  const progress = await env.DB.prepare(
    'SELECT * FROM player_progress WHERE player_id = ?'
  ).bind(playerId).first();

  // Get level completions
  const completions = await env.DB.prepare(
    'SELECT * FROM level_completions WHERE player_id = ? ORDER BY level_id'
  ).bind(playerId).all();

  return jsonResponse({
    player,
    progress: progress || {
      player_id: playerId,
      current_level: 1,
      total_stars: 0,
      total_score: 0,
      levels_completed: 0,
      three_star_count: 0
    },
    completions: completions.results || []
  }, corsHeaders);
}

// Save player progress
async function handleSaveProgress(request, env, corsHeaders) {
  const playerId = request.headers.get('X-Player-Token');

  if (!playerId) {
    return jsonResponse({ error: 'Missing player token' }, corsHeaders, 401);
  }

  const data = await request.json();
  const { level, stars, score, time, steps } = data;

  if (!level || stars === undefined) {
    return jsonResponse({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  // Update last played
  await env.DB.prepare(
    'UPDATE players SET last_played = ? WHERE id = ?'
  ).bind(Math.floor(Date.now() / 1000), playerId).run();

  // Update or insert level completion
  const existing = await env.DB.prepare(
    'SELECT * FROM level_completions WHERE player_id = ? AND level_id = ?'
  ).bind(playerId, level).first();

  if (existing) {
    // Update if better
    const updateStars = stars > existing.stars;
    const updateScore = score > existing.best_score;
    const updateTime = time && (!existing.best_time || time < existing.best_time);
    const updateSteps = steps && (!existing.best_steps || steps < existing.best_steps);

    if (updateStars || updateScore || updateTime || updateSteps) {
      await env.DB.prepare(`
        UPDATE level_completions
        SET stars = MAX(stars, ?),
            best_score = MAX(best_score, ?),
            best_time = CASE WHEN ? IS NOT NULL AND (best_time IS NULL OR ? < best_time) THEN ? ELSE best_time END,
            best_steps = CASE WHEN ? IS NOT NULL AND (best_steps IS NULL OR ? < best_steps) THEN ? ELSE best_steps END,
            attempts = attempts + 1,
            last_completed = ?
        WHERE player_id = ? AND level_id = ?
      `).bind(
        stars, score,
        time, time, time,
        steps, steps, steps,
        Math.floor(Date.now() / 1000),
        playerId, level
      ).run();
    }
  } else {
    // Insert new completion
    await env.DB.prepare(`
      INSERT INTO level_completions (player_id, level_id, stars, best_score, best_time, best_steps)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(playerId, level, stars, score, time, steps).run();
  }

  // Recalculate total progress
  const totals = await env.DB.prepare(`
    SELECT
      COUNT(*) as levels_completed,
      SUM(stars) as total_stars,
      SUM(best_score) as total_score,
      SUM(CASE WHEN stars = 3 THEN 1 ELSE 0 END) as three_star_count,
      MAX(level_id) + 1 as current_level
    FROM level_completions
    WHERE player_id = ?
  `).bind(playerId).first();

  // Update progress
  await env.DB.prepare(`
    UPDATE player_progress
    SET current_level = ?,
        total_stars = ?,
        total_score = ?,
        levels_completed = ?,
        three_star_count = ?,
        updated_at = ?
    WHERE player_id = ?
  `).bind(
    totals.current_level || 1,
    totals.total_stars || 0,
    totals.total_score || 0,
    totals.levels_completed || 0,
    totals.three_star_count || 0,
    Math.floor(Date.now() / 1000),
    playerId
  ).run();

  return jsonResponse({
    success: true,
    message: 'Progress saved',
    totals
  }, corsHeaders);
}

// Get global leaderboard
async function handleGetLeaderboard(request, env, corsHeaders) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const levelId = url.searchParams.get('level');

  let query;
  if (levelId) {
    // Level-specific leaderboard
    query = env.DB.prepare(`
      SELECT l.*, p.username, p.avatar
      FROM leaderboard l
      JOIN players p ON l.player_id = p.id
      WHERE l.level_id = ?
      ORDER BY l.score DESC, l.time_seconds ASC
      LIMIT ?
    `).bind(parseInt(levelId), limit);
  } else {
    // Global leaderboard (total scores)
    query = env.DB.prepare(`
      SELECT
        p.id as player_id,
        p.username,
        p.avatar,
        pp.total_score as score,
        pp.total_stars as stars,
        pp.levels_completed
      FROM player_progress pp
      JOIN players p ON pp.player_id = p.id
      ORDER BY pp.total_score DESC, pp.total_stars DESC
      LIMIT ?
    `).bind(limit);
  }

  const results = await query.all();

  // Add rank
  const leaderboard = results.results.map((entry, index) => ({
    rank: index + 1,
    ...entry
  }));

  return jsonResponse({
    leaderboard,
    count: leaderboard.length,
    level_id: levelId ? parseInt(levelId) : null
  }, corsHeaders);
}

// Submit score to leaderboard
async function handleSubmitScore(request, env, corsHeaders) {
  const playerId = request.headers.get('X-Player-Token');

  if (!playerId) {
    return jsonResponse({ error: 'Missing player token' }, corsHeaders, 401);
  }

  const data = await request.json();
  const { level, score, stars, time, steps } = data;

  // Get player info
  const player = await env.DB.prepare(
    'SELECT username, avatar FROM players WHERE id = ?'
  ).bind(playerId).first();

  if (!player) {
    return jsonResponse({ error: 'Player not found' }, corsHeaders, 404);
  }

  // Insert into leaderboard
  await env.DB.prepare(`
    INSERT INTO leaderboard (player_id, username, avatar, level_id, score, stars, time_seconds, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    playerId,
    player.username,
    player.avatar,
    level,
    score,
    stars,
    time,
    steps
  ).run();

  return jsonResponse({
    success: true,
    message: 'Score submitted to leaderboard'
  }, corsHeaders);
}

// Get current maze for a level
async function handleGetMaze(levelId, env, corsHeaders) {
  const levelIdInt = parseInt(levelId);

  if (isNaN(levelIdInt)) {
    return jsonResponse({ error: 'Invalid level ID' }, corsHeaders, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  // Get current active maze for this level
  const assignment = await env.DB.prepare(`
    SELECT lm.maze_id, lm.rotation_period, lm.active_from, lm.active_until,
           m.maze_data, m.size, m.maze_type, m.complexity,
           m.optimal_steps, m.total_gems, m.total_keys, m.total_locks,
           m.total_shields, m.total_enemies, m.difficulty_score, m.quality_score
    FROM level_mazes lm
    JOIN mazes m ON lm.maze_id = m.id
    WHERE lm.level_id = ?
      AND lm.is_current = 1
      AND lm.active_from <= ?
      AND (lm.active_until IS NULL OR lm.active_until > ?)
      AND m.is_active = 1
    ORDER BY lm.active_from DESC
    LIMIT 1
  `).bind(levelIdInt, now, now).first();

  if (!assignment) {
    // No active maze assigned, return error
    return jsonResponse({
      error: 'No maze assigned to this level',
      level_id: levelIdInt
    }, corsHeaders, 404);
  }

  // Update play count
  await env.DB.prepare(
    'UPDATE mazes SET play_count = play_count + 1 WHERE id = ?'
  ).bind(assignment.maze_id).run();

  return jsonResponse({
    maze_id: assignment.maze_id,
    level_id: levelIdInt,
    maze_data: JSON.parse(assignment.maze_data),
    size: assignment.size,
    maze_type: assignment.maze_type,
    complexity: assignment.complexity,
    optimal_steps: assignment.optimal_steps,
    total_gems: assignment.total_gems,
    total_keys: assignment.total_keys,
    total_locks: assignment.total_locks,
    total_shields: assignment.total_shields,
    total_enemies: assignment.total_enemies,
    difficulty_score: assignment.difficulty_score,
    quality_score: assignment.quality_score,
    rotation_period: assignment.rotation_period,
    active_from: assignment.active_from,
    active_until: assignment.active_until
  }, corsHeaders);
}

// Save player performance on a specific maze
async function handleSaveMazePerformance(request, env, corsHeaders) {
  const playerId = request.headers.get('X-Player-Token');

  if (!playerId) {
    return jsonResponse({ error: 'Missing player token' }, corsHeaders, 401);
  }

  const data = await request.json();
  const {
    maze_id,
    level_id,
    completed,
    stars,
    score,
    time,
    steps,
    gems_collected,
    enemies_defeated,
    shields_used,
    deaths
  } = data;

  if (!maze_id || !level_id || time === undefined || steps === undefined) {
    return jsonResponse({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  // Insert performance record
  await env.DB.prepare(`
    INSERT INTO player_maze_performance (
      player_id, maze_id, level_id,
      completed, stars, score, time_seconds, steps,
      gems_collected, enemies_defeated, shields_used, deaths
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    playerId, maze_id, level_id,
    completed ? 1 : 0,
    stars || 0,
    score || 0,
    time,
    steps,
    gems_collected || 0,
    enemies_defeated || 0,
    shields_used || 0,
    deaths || 0
  ).run();

  // Get player's rank on this maze
  const rank = await env.DB.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM player_maze_performance
    WHERE maze_id = ?
      AND (score > ? OR (score = ? AND time_seconds < ?))
  `).bind(maze_id, score, score, time).first();

  return jsonResponse({
    success: true,
    message: 'Performance saved',
    rank: rank.rank
  }, corsHeaders);
}

// Assign maze to level (admin function)
async function handleAssignMaze(request, env, corsHeaders) {
  const data = await request.json();
  const {
    level_id,
    maze_id,
    rotation_period,
    active_from,
    active_until,
    set_current
  } = data;

  if (!level_id || !maze_id || !rotation_period) {
    return jsonResponse({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  const activeFrom = active_from || Math.floor(Date.now() / 1000);

  // If set_current, unset all other current assignments for this level
  if (set_current) {
    await env.DB.prepare(
      'UPDATE level_mazes SET is_current = 0 WHERE level_id = ?'
    ).bind(level_id).run();
  }

  // Insert assignment
  await env.DB.prepare(`
    INSERT INTO level_mazes (
      level_id, maze_id, rotation_period,
      active_from, active_until, is_current
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    level_id,
    maze_id,
    rotation_period,
    activeFrom,
    active_until || null,
    set_current ? 1 : 0
  ).run();

  return jsonResponse({
    success: true,
    message: 'Maze assigned to level',
    level_id,
    maze_id
  }, corsHeaders);
}

// Helper: JSON response
function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
