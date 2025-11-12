// Main Game Class
// Core game controller that manages game flow, rendering, and user interaction

import { ELEMENTS, MAZE_SIZES, ACTIONS } from '../config/constants.js';
import { PlayerSettings } from './PlayerSettings.js';
import { GameState } from './GameState.js';
import { MazeGenerator } from './MazeGenerator.js';
import { DemoRecorder } from './DemoRecorder.js';
import { MazeAnalyzer } from './MazeAnalyzer.js';
import { PerformanceEvaluator } from './PerformanceEvaluator.js';
import { WORLDS, getLevelById, isLevelUnlocked, calculateStarsForLevel, getMaxStars } from '../config/levels.js';

export class MazeGame {
    constructor() {
        this.state = null;
        this.recorder = new DemoRecorder();
        this.mode = 'human';
        this.currentLevel = 1;
        this.currentLevelConfig = null; // Store current level configuration
        this.selectedLevel = null; // Track level selected from level select screen
        this.timerInterval = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.keyHandler = null;
        this.touchStartHandler = null;
        this.touchEndHandler = null;
        this.previousPlayerPos = { x: -1, y: -1 };
        this.cellElements = [];
        this.playerSettings = new PlayerSettings();
        this.mazeAnalyzer = null;
        this.performanceEvaluator = null;

        // Start with player's current level
        this.currentLevel = this.playerSettings.getCurrentLevel();

        this.init();
        this.updatePlayerDisplay();
        this.updateTotalStarsDisplay();
    }

    init() {
        // Load level configuration
        this.currentLevelConfig = getLevelById(this.currentLevel);

        if (!this.currentLevelConfig) {
            console.error(`Level ${this.currentLevel} not found! Falling back to level 1.`);
            this.currentLevel = 1;
            this.currentLevelConfig = getLevelById(1);
        }

        const config = this.currentLevelConfig;
        const mazeSize = config.size;
        const mazeType = config.mazeType;
        const complexity = config.complexity;

        this.state = new GameState(mazeSize, this.currentLevel);
        this.state.maze = MazeGenerator.generate(mazeSize, this.currentLevel, mazeType, complexity);
        this.state.player.x = 1;
        this.state.player.y = 1;
        this.previousPlayerPos = { x: 1, y: 1 };

        // Count total gems in maze
        this.state.totalGems = 0;
        let bonusCount = 0;
        for (let y = 0; y < mazeSize; y++) {
            for (let x = 0; x < mazeSize; x++) {
                if (this.state.maze[y][x] === ELEMENTS.gem) {
                    this.state.totalGems++;
                }
                if (this.state.maze[y][x] === ELEMENTS.bonus) {
                    bonusCount++;
                }
            }
        }
        this.state.totalBonus = bonusCount;
        this.state.bonusCollected = false;

        // Update cell size for different maze sizes
        const sizeConfig = MAZE_SIZES[mazeSize];
        document.documentElement.style.setProperty('--cell-size', `${sizeConfig.cellSize}px`);

        // Analyze the maze (wait for next tick to ensure maze is fully ready)
        setTimeout(() => {
            this.mazeAnalyzer = new MazeAnalyzer(this.state.maze, this.currentLevel);

            // Debug: Check if exit exists
            console.log('Exit position:', this.mazeAnalyzer.exitPos);
            console.log('Start position:', this.mazeAnalyzer.startPos);
            console.log('Gems found:', this.mazeAnalyzer.gems.length);

            const analysis = this.mazeAnalyzer.analyze();
            console.log('Maze Analysis:', analysis);

            // Debug: Check path results
            console.log('📊 Path Analysis Results:');
            console.log('  Direct path:', analysis.paths.directPath.path ? `✅ ${analysis.paths.directPath.steps} steps` : '❌ NULL');
            console.log('  Collection path:', analysis.paths.collectionPath.path ? `✅ ${analysis.paths.collectionPath.steps} steps` : '❌ NULL');
            console.log('  Optimal steps for benchmarks:', analysis.benchmarks.optimalSteps);

            this.displayMazeAnalysis(analysis);
        }, 0);

        this.renderInitial();
        this.bindControls();
        this.startTimer();
        this.updateLeaderboard();
        this.updateLevelStars();
        this.showTimedChallengeBadge();

        if (this.mode === 'human') {
            this.recorder.startRecording();
        }
    }

    bindControls() {
        // Remove old listeners if they exist
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        if (this.touchStartHandler) {
            const maze = document.getElementById('maze');
            maze.removeEventListener('touchstart', this.touchStartHandler);
        }
        if (this.touchEndHandler) {
            const maze = document.getElementById('maze');
            maze.removeEventListener('touchend', this.touchEndHandler);
        }

        // Create new handlers
        this.keyHandler = (e) => this.handleKeyPress(e);
        this.touchStartHandler = (e) => this.handleTouchStart(e);
        this.touchEndHandler = (e) => this.handleTouchEnd(e);

        // Keyboard controls
        document.addEventListener('keydown', this.keyHandler);

        // Touch controls
        const maze = document.getElementById('maze');
        maze.addEventListener('touchstart', this.touchStartHandler, { passive: false });
        maze.addEventListener('touchend', this.touchEndHandler, { passive: false });
    }

    handleKeyPress(e) {
        if (this.state.gameOver || this.mode !== 'human') return;

        let action = -1;

        switch(e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                action = ACTIONS.UP;
                e.preventDefault();
                break;
            case 'arrowright':
            case 'd':
                action = ACTIONS.RIGHT;
                e.preventDefault();
                break;
            case 'arrowdown':
            case 's':
                action = ACTIONS.DOWN;
                e.preventDefault();
                break;
            case 'arrowleft':
            case 'a':
                action = ACTIONS.LEFT;
                e.preventDefault();
                break;
            case 'r':
                this.restart();
                return;
            case 'n':
                this.nextLevel();
                return;
        }

        if (action !== -1) {
            this.performAction(action);
        }
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (this.state.gameOver || this.mode !== 'human') return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;

        const minSwipe = 30;
        let action = -1;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > minSwipe) {
                action = dx > 0 ? ACTIONS.RIGHT : ACTIONS.LEFT;
            }
        } else {
            if (Math.abs(dy) > minSwipe) {
                action = dy > 0 ? ACTIONS.DOWN : ACTIONS.UP;
            }
        }

        if (action !== -1) {
            this.performAction(action);
        }

        e.preventDefault();
    }

    performAction(action) {
        const prevState = { ...this.state };
        const [newState, reward, done] = this.state.executeAction(action);

        if (this.mode === 'human') {
            this.recorder.recordStep(this.state, action, reward);
        }

        this.render();
        this.updateUI();

        if (done && this.state.won) {
            this.handleLevelComplete();
        }
    }

    renderInitial() {
        const mazeElement = document.getElementById('maze');
        mazeElement.innerHTML = '';
        mazeElement.style.setProperty('--maze-size', this.state.size);
        this.cellElements = [];

        for (let y = 0; y < this.state.size; y++) {
            this.cellElements[y] = [];
            for (let x = 0; x < this.state.size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                this.cellElements[y][x] = cell;

                // Check if player is here
                if (x === this.state.player.x && y === this.state.player.y) {
                    cell.textContent = this.playerSettings.skin;
                    cell.classList.add('player');

                    if (this.state.powerUps.shieldActive) {
                        cell.classList.add('shield-active');
                    }
                    if (this.state.powerUps.speedActive) {
                        cell.classList.add('speed-active');
                    }
                } else {
                    const element = this.state.maze[y][x];
                    cell.textContent = element;

                    if (element === ELEMENTS.wall) cell.classList.add('wall');
                    else if (element === ELEMENTS.gem) cell.classList.add('gem');
                    else if (element === ELEMENTS.bonus) cell.classList.add('bonus');
                    else if (element === ELEMENTS.trap) cell.classList.add('trap');
                    else if (element === ELEMENTS.exit) cell.classList.add('exit');
                }

                mazeElement.appendChild(cell);
            }
        }
    }

    render() {
        // Only update the cells that changed
        const prevX = this.previousPlayerPos.x;
        const prevY = this.previousPlayerPos.y;
        const currX = this.state.player.x;
        const currY = this.state.player.y;

        // Update previous position cell (restore maze element)
        if (prevX >= 0 && prevY >= 0 && prevX < this.state.size && prevY < this.state.size) {
            const prevCell = this.cellElements[prevY][prevX];
            const element = this.state.maze[prevY][prevX];

            prevCell.className = 'cell';
            prevCell.textContent = element;

            if (element === ELEMENTS.wall) prevCell.classList.add('wall');
            else if (element === ELEMENTS.gem) prevCell.classList.add('gem');
            else if (element === ELEMENTS.bonus) prevCell.classList.add('bonus');
            else if (element === ELEMENTS.trap) prevCell.classList.add('trap');
            else if (element === ELEMENTS.exit) prevCell.classList.add('exit');
        }

        // Update current position cell (show player)
        const currCell = this.cellElements[currY][currX];
        currCell.className = 'cell player';
        currCell.textContent = this.playerSettings.skin;

        if (this.state.powerUps.shieldActive) {
            currCell.classList.add('shield-active');
        }
        if (this.state.powerUps.speedActive) {
            currCell.classList.add('speed-active');
        }

        // Update previous position tracker
        this.previousPlayerPos.x = currX;
        this.previousPlayerPos.y = currY;
    }

    updateUI() {
        document.getElementById('score').textContent = this.state.player.score;
        document.getElementById('steps').textContent = this.state.player.steps;
        document.getElementById('keys').textContent = this.state.player.keys;
        document.getElementById('level').textContent = this.currentLevel;

        const shieldStatus = document.getElementById('shield-status');
        if (this.state.powerUps.shieldActive) {
            shieldStatus.innerHTML = 'Shield: <span>🛡️ ACTIVE</span>';
            shieldStatus.classList.add('active');
        } else {
            shieldStatus.innerHTML = 'Shield: <span>OFF</span>';
            shieldStatus.classList.remove('active');
        }

        const speedStatus = document.getElementById('speed-status');
        if (this.state.powerUps.speedActive) {
            speedStatus.innerHTML = 'Speed: <span>⚡ 2x</span>';
            speedStatus.classList.add('active');
        } else {
            speedStatus.innerHTML = 'Speed: <span>1x</span>';
            speedStatus.classList.remove('active');
        }
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            if (!this.state.gameOver) {
                this.state.timeElapsed = Math.floor((Date.now() - this.state.startTime) / 1000);

                let displayTime;
                const timerElement = document.getElementById('timer');

                if (this.state.isTimedLevel) {
                    // Countdown timer
                    const remaining = this.state.timeLimit - this.state.timeElapsed;
                    if (remaining <= 0) {
                        this.handleTimeUp();
                        return;
                    }
                    const minutes = Math.floor(remaining / 60);
                    const seconds = remaining % 60;
                    displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                    // Warning color when low time
                    if (remaining <= 10) {
                        timerElement.classList.add('timer-warning');
                    } else {
                        timerElement.classList.remove('timer-warning');
                    }
                } else {
                    // Regular count-up timer
                    const minutes = Math.floor(this.state.timeElapsed / 60);
                    const seconds = this.state.timeElapsed % 60;
                    displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    timerElement.classList.remove('timer-warning');
                }

                timerElement.textContent = displayTime;
            }
        }, 1000);
    }

    handleLevelComplete() {
        this.state.gameOver = true;
        clearInterval(this.timerInterval);

        // Evaluate performance
        this.performanceEvaluator = new PerformanceEvaluator(
            this.mazeAnalyzer.analysis,
            this.state
        );
        const evaluation = this.performanceEvaluator.evaluate();
        console.log('Performance Evaluation:', evaluation);

        // Use the new scoring system
        this.state.player.score = evaluation.score.final;

        // Calculate stars based on level-specific requirements
        const stars = calculateStarsForLevel(this.currentLevelConfig, this.state);
        console.log(`Level ${this.currentLevel} completed with ${stars} stars`);

        // Save progress
        this.playerSettings.addScore(this.state.player.score);
        this.playerSettings.completeLevel(this.currentLevel, stars);
        this.updateTotalStarsDisplay();

        // Save demo
        if (this.mode === 'human') {
            this.recorder.saveDemo(this.state.player.score, this.state.player.steps);
        }

        // Save high score
        this.saveHighScore();

        // Show modal with performance data
        this.showGameOverModal(stars, evaluation);
    }

    handleTimeUp() {
        this.state.gameOver = true;
        this.state.won = false;
        clearInterval(this.timerInterval);

        const modal = document.getElementById('gameOverModal');
        document.getElementById('modal-title').textContent = '⏰ Time\'s Up!';
        document.getElementById('stars-earned').textContent = '';
        document.getElementById('final-score').textContent = this.state.player.score;
        document.getElementById('final-time').textContent = 'Failed';
        document.getElementById('final-steps').textContent = this.state.player.steps;
        document.getElementById('bonus-info').textContent = 'Try again to beat the timer!';
        modal.classList.add('show');
    }

    calculateStars() {
        // Star 1: Complete the level
        let stars = 1;

        // Star 2: Collect 80% of gems
        const gemPercentage = this.state.totalGems > 0 ?
            (this.state.gemsCollected / this.state.totalGems) : 1;
        if (gemPercentage >= 0.8) {
            stars = 2;
        }

        // Star 3: Also meet time/efficiency requirements
        if (stars === 2) {
            if (this.state.isTimedLevel) {
                // For timed levels: finish with time remaining
                const timeUsedPercent = this.state.timeElapsed / this.state.timeLimit;
                if (timeUsedPercent <= 0.75) { // Finished with 25%+ time remaining
                    stars = 3;
                }
            } else {
                // For normal levels: efficient step count
                const expectedSteps = this.state.size * 2; // Rough estimate
                if (this.state.player.steps <= expectedSteps) {
                    stars = 3;
                }
            }
        }

        return stars;
    }

    showGameOverModal(stars, evaluation) {
        const modal = document.getElementById('gameOverModal');
        document.getElementById('modal-title').textContent = '🎯 Level Complete!';

        // Show stars with animation
        const starsDisplay = document.getElementById('stars-earned');
        const starSymbols = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        starsDisplay.innerHTML = starSymbols.split('').map((s, i) =>
            `<span class="star ${i < stars ? 'earned' : ''}">${s}</span>`
        ).join('');

        document.getElementById('final-score').textContent = this.state.player.score;

        const minutes = Math.floor(this.state.timeElapsed / 60);
        const seconds = this.state.timeElapsed % 60;
        document.getElementById('final-time').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;

        document.getElementById('final-steps').textContent = this.state.player.steps;

        // Display level objectives completion
        const bonusInfo = document.getElementById('bonus-info');
        const objectivesHTML = this.getObjectivesCompletionHTML();
        bonusInfo.innerHTML = objectivesHTML;

        // Display performance evaluation
        if (evaluation) {
            const perfInfo = document.getElementById('performance-info');

            // Add grade to objectives display
            bonusInfo.innerHTML += `<div style="margin-top: 10px;">Grade: ${evaluation.rating.grade} - ${evaluation.rating.description}</div>`;

            // Display efficiency metrics
            if (perfInfo) {
                perfInfo.innerHTML = `
                    <div class="perf-section">
                        <h4>📊 Efficiency Metrics</h4>
                        <div class="perf-bars">
                            <div class="perf-bar">
                                <span>Path: ${evaluation.efficiency.path}%</span>
                                <div class="bar"><div class="fill" style="width: ${evaluation.efficiency.path}%"></div></div>
                            </div>
                            <div class="perf-bar">
                                <span>Collection: ${evaluation.efficiency.collection}%</span>
                                <div class="bar"><div class="fill" style="width: ${evaluation.efficiency.collection}%"></div></div>
                            </div>
                            <div class="perf-bar">
                                <span>Exploration: ${evaluation.efficiency.exploration}%</span>
                                <div class="bar"><div class="fill" style="width: ${evaluation.efficiency.exploration}%"></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="perf-section">
                        <h4>📈 Comparison</h4>
                        <p>Optimal: ${evaluation.comparison.optimalSteps} steps</p>
                        <p>Your run: ${evaluation.comparison.actualSteps} steps (${evaluation.comparison.stepsDifference > 0 ? '+' : ''}${evaluation.comparison.stepsDifference})</p>
                        <p>Level: <strong>${evaluation.comparison.playerLevel}</strong></p>
                    </div>
                    ${evaluation.improvements.length > 0 ? `
                    <div class="perf-section">
                        <h4>💡 Top Improvement</h4>
                        <p class="improvement-${evaluation.improvements[0].priority}">
                            <strong>${evaluation.improvements[0].category}:</strong> ${evaluation.improvements[0].suggestion}
                        </p>
                    </div>
                    ` : ''}
                `;
            }
        } else {
            document.getElementById('bonus-info').textContent = '';
        }

        modal.classList.add('show');
    }

    displayMazeAnalysis(analysis) {
        const analysisElement = document.getElementById('maze-analysis');
        if (!analysisElement) {
            console.warn('Maze analysis element not found in DOM');
            return;
        }

        if (!analysis) {
            analysisElement.innerHTML = `
                <h4>🎯 Maze Intelligence</h4>
                <p>Analysis in progress...</p>
            `;
            return;
        }

        const summary = analysis.difficulty;
        const benchmarks = analysis.benchmarks;

        // Validate data before displaying
        const optimalSteps = benchmarks.optimalSteps || 'N/A';
        const optimalStepsDisplay = optimalSteps === 0 ? 'Calculating...' :
                                     optimalSteps === 'N/A' ? 'No path' :
                                     `${optimalSteps} steps`;

        analysisElement.innerHTML = `
            <h4>🎯 Maze Intelligence</h4>
            <div class="analysis-grid">
                <div class="analysis-item">
                    <span class="label">Difficulty:</span>
                    <span class="value">${summary.rating} (${summary.overall}/100)</span>
                </div>
                <div class="analysis-item">
                    <span class="label">Optimal Path:</span>
                    <span class="value">${optimalStepsDisplay}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">Decision Points:</span>
                    <span class="value">${analysis.topology.decisionPoints.length}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">Dead Ends:</span>
                    <span class="value">${analysis.topology.deadEnds.length}</span>
                </div>
            </div>
            <div class="difficulty-breakdown">
                <div class="diff-bar">
                    <span>Structure</span>
                    <div class="bar"><div class="fill" style="width: ${summary.structural}%"></div></div>
                </div>
                <div class="diff-bar">
                    <span>Navigation</span>
                    <div class="bar"><div class="fill" style="width: ${summary.navigation}%"></div></div>
                </div>
                <div class="diff-bar">
                    <span>Hazards</span>
                    <div class="bar"><div class="fill" style="width: ${summary.hazard}%"></div></div>
                </div>
            </div>
        `;
    }

    hideGameOverModal() {
        document.getElementById('gameOverModal').classList.remove('show');
    }

    saveHighScore() {
        try {
            const scores = JSON.parse(localStorage.getItem('mazeTemple_scores') || '[]');
            scores.push({
                score: this.state.player.score,
                time: this.state.timeElapsed,
                steps: this.state.player.steps,
                level: this.currentLevel,
                date: new Date().toISOString()
            });

            // Sort by score (descending)
            scores.sort((a, b) => b.score - a.score);

            // Keep top 10
            const topScores = scores.slice(0, 10);
            localStorage.setItem('mazeTemple_scores', JSON.stringify(topScores));

            this.updateLeaderboard();
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }

    updateLeaderboard() {
        try {
            const scores = JSON.parse(localStorage.getItem('mazeTemple_scores') || '[]');
            const leaderboard = document.getElementById('topScores');

            if (scores.length === 0) {
                leaderboard.innerHTML = '<li>No scores yet!</li>';
                return;
            }

            leaderboard.innerHTML = scores.slice(0, 5).map((s, i) => {
                const minutes = Math.floor(s.time / 60);
                const seconds = s.time % 60;
                return `<li>L${s.level}: ${s.score} pts (${minutes}:${seconds.toString().padStart(2, '0')})</li>`;
            }).join('');
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        }
    }

    setMode(mode) {
        this.mode = mode;

        // Update button styles
        document.querySelectorAll('.mode button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`btn-${mode}`).classList.add('active');

        if (mode === 'ai') {
            alert('AI mode coming soon! Train your agent with DQN learning.');
        } else if (mode === 'battle') {
            alert('Battle mode coming soon! Compete against AI agents.');
        }

        this.restart();
    }

    restart() {
        this.hideGameOverModal();
        clearInterval(this.timerInterval);
        this.init();
    }

    nextLevel() {
        this.currentLevel++;
        this.hideGameOverModal();
        clearInterval(this.timerInterval);
        this.init();
    }

    updatePlayerDisplay() {
        document.getElementById('player-skin').textContent = this.playerSettings.skin;
        document.getElementById('player-name').textContent = this.playerSettings.name;
    }

    updateLevelStars() {
        const stars = this.playerSettings.levelStars[this.currentLevel] || 0;
        const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        document.getElementById('level-stars').textContent = starDisplay;
    }

    showTimedChallengeBadge() {
        const badge = document.getElementById('challenge-badge');
        if (this.state.isTimedLevel) {
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');

        // Populate current settings
        document.getElementById('player-name-input').value = this.playerSettings.name;
        document.getElementById('maze-size-select').value = this.playerSettings.mazeSize;
        document.getElementById('maze-type-select').value = this.playerSettings.mazeType || 'classic';
        document.getElementById('maze-complexity-select').value = this.playerSettings.mazeComplexity || 'medium';

        // Update skin selector
        const unlockedSkins = this.playerSettings.getUnlockedSkins();
        document.querySelectorAll('.skin-option').forEach(option => {
            const skin = option.getAttribute('data-skin');
            if (unlockedSkins.includes(skin)) {
                option.classList.remove('locked');
            } else {
                option.classList.add('locked');
            }

            if (skin === this.playerSettings.skin) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }

            option.onclick = () => {
                if (!option.classList.contains('locked')) {
                    document.querySelectorAll('.skin-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                }
            };
        });

        modal.classList.add('show');
    }

    saveSettings() {
        // Save name
        const name = document.getElementById('player-name-input').value.trim();
        if (name) {
            this.playerSettings.name = name;
        }

        // Save selected skin
        const selectedSkin = document.querySelector('.skin-option.selected');
        if (selectedSkin && !selectedSkin.classList.contains('locked')) {
            this.playerSettings.skin = selectedSkin.getAttribute('data-skin');
        }

        // Save maze size
        this.playerSettings.mazeSize = parseInt(document.getElementById('maze-size-select').value);

        // Save maze type
        this.playerSettings.mazeType = document.getElementById('maze-type-select').value;

        // Save complexity
        this.playerSettings.mazeComplexity = document.getElementById('maze-complexity-select').value;

        // Persist to localStorage
        this.playerSettings.save();

        // Update UI
        this.updatePlayerDisplay();

        // Close modal
        document.getElementById('settingsModal').classList.remove('show');

        // Restart with new settings
        this.restart();
    }

    // Level Select Modal Methods
    showLevelSelect() {
        const modal = document.getElementById('levelSelectModal');
        const totalStars = this.playerSettings.getTotalStars();

        // Update progress summary
        document.getElementById('modal-total-stars').textContent = totalStars;
        document.getElementById('modal-max-stars').textContent = getMaxStars();
        document.getElementById('levels-completed-count').textContent = this.playerSettings.levelsCompleted;

        // Populate World 1 levels
        this.populateWorldLevels(1);

        modal.classList.add('show');
    }

    hideLevelSelect() {
        document.getElementById('levelSelectModal').classList.remove('show');
    }

    populateWorldLevels(worldId) {
        const world = WORLDS[worldId];
        if (!world) return;

        const levelsGrid = document.getElementById(`world-${worldId}-levels`);
        levelsGrid.innerHTML = '';

        const totalStars = this.playerSettings.getTotalStars();
        let worldStars = 0;

        world.levels.forEach(level => {
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';

            const isUnlocked = isLevelUnlocked(level.id, totalStars);
            const levelStars = this.playerSettings.getStarsForLevel(level.id);

            if (levelStars > 0) {
                levelCard.classList.add('completed');
                worldStars += levelStars;
            }

            if (!isUnlocked) {
                levelCard.classList.add('locked');
            }

            const starsDisplay = levelStars > 0
                ? '★'.repeat(levelStars) + '☆'.repeat(3 - levelStars)
                : '☆☆☆';

            levelCard.innerHTML = `
                <div class="level-number">${level.id}</div>
                <div class="level-name">${level.name}</div>
                <div class="level-stars">${starsDisplay}</div>
            `;

            if (isUnlocked) {
                levelCard.onclick = () => this.selectLevel(level.id);
            } else {
                levelCard.title = `Unlock with ${level.unlockRequirement} total stars`;
            }

            levelsGrid.appendChild(levelCard);
        });

        // Update world stars display
        const worldStarsEl = document.getElementById(`world-${worldId}-stars`);
        if (worldStarsEl) {
            worldStarsEl.textContent = `⭐ ${worldStars}/${world.levels.length * 3}`;
        }
    }

    selectLevel(levelId) {
        this.selectedLevel = levelId;
        this.hideLevelSelect();
        this.showLevelIntro(levelId);
    }

    // Level Intro Modal Methods
    showLevelIntro(levelId) {
        const level = getLevelById(levelId);
        if (!level) return;

        const modal = document.getElementById('levelIntroModal');

        // Update level info
        document.getElementById('intro-level-name').textContent = `Level ${level.id}: ${level.name}`;
        document.getElementById('intro-level-description').textContent = level.description;
        document.getElementById('intro-maze-size').textContent = `${level.size}×${level.size}`;
        document.getElementById('intro-maze-type').textContent = level.mazeType.charAt(0).toUpperCase() + level.mazeType.slice(1);
        document.getElementById('intro-complexity').textContent = level.complexity.charAt(0).toUpperCase() + level.complexity.slice(1);

        // Display objectives
        const objectivesList = document.getElementById('intro-objectives-list');
        objectivesList.innerHTML = `
            <div class="objective-item">✓ ${level.objectives.primary}</div>
            ${level.objectives.secondary.map(obj => `<div class="objective-item">• ${obj}</div>`).join('')}
        `;

        // Display star requirements
        const starRequirements = document.getElementById('intro-star-requirements');
        starRequirements.innerHTML = `
            <div class="star-requirement-item">⭐ ${level.starRequirements[1].description}</div>
            <div class="star-requirement-item">⭐⭐ ${level.starRequirements[2].description}</div>
            <div class="star-requirement-item">⭐⭐⭐ ${level.starRequirements[3].description}</div>
        `;

        modal.classList.add('show');
    }

    hideLevelIntro() {
        document.getElementById('levelIntroModal').classList.remove('show');
        this.selectedLevel = null;
    }

    startSelectedLevel() {
        if (this.selectedLevel) {
            this.currentLevel = this.selectedLevel;
            this.playerSettings.setCurrentLevel(this.currentLevel);
            this.hideLevelIntro();
            this.restart();
        }
    }

    // Update Total Stars Display
    updateTotalStarsDisplay() {
        const totalStars = this.playerSettings.getTotalStars();
        const maxStars = getMaxStars();

        const totalStarsEl = document.getElementById('total-stars');
        const maxStarsEl = document.getElementById('max-stars');

        if (totalStarsEl) totalStarsEl.textContent = totalStars;
        if (maxStarsEl) maxStarsEl.textContent = maxStars;
    }

    // Get objectives completion HTML for game over modal
    getObjectivesCompletionHTML() {
        const level = this.currentLevelConfig;
        if (!level) return '';

        const requirements = level.starRequirements;
        let html = '<div style="text-align: left; margin-bottom: 15px;"><h4 style="color: var(--gold);">Objectives Completed:</h4>';

        // Check star 1
        const star1Met = this.state.won;
        html += `<div style="margin: 5px 0;">${star1Met ? '✅' : '❌'} ${requirements[1].description}</div>`;

        // Check star 2
        let star2Met = true;
        if (requirements[2].gemsPercent !== undefined) {
            const gemsRequired = Math.ceil(this.state.totalGems * requirements[2].gemsPercent / 100);
            const collected = this.state.gemsCollected >= gemsRequired;
            star2Met = star2Met && collected;
            html += `<div style="margin: 5px 0;">${collected ? '✅' : '❌'} ${requirements[2].description} (${this.state.gemsCollected}/${gemsRequired})</div>`;
        }
        if (requirements[2].bonusCollected && star2Met) {
            const collected = this.state.bonusCollected;
            star2Met = star2Met && collected;
            html += `<div style="margin: 5px 0;">${collected ? '✅' : '❌'} Collect bonus treasure</div>`;
        }

        // Check star 3
        let star3Met = true;
        if (requirements[3].gemsPercent !== undefined) {
            const gemsRequired = Math.ceil(this.state.totalGems * requirements[3].gemsPercent / 100);
            const collected = this.state.gemsCollected >= gemsRequired;
            star3Met = star3Met && collected;
        }
        if (requirements[3].maxTrapsHit !== undefined) {
            const trapsOK = this.state.trapsHit <= requirements[3].maxTrapsHit;
            star3Met = star3Met && trapsOK;
            html += `<div style="margin: 5px 0;">${trapsOK ? '✅' : '❌'} ${requirements[3].description} (Hit: ${this.state.trapsHit})</div>`;
        }
        if (requirements[3].powerUpsUsed !== undefined) {
            const powerUpsOK = this.state.powerUpsUsed >= requirements[3].powerUpsUsed;
            star3Met = star3Met && powerUpsOK;
            html += `<div style="margin: 5px 0;">${powerUpsOK ? '✅' : '❌'} Use power-up (Used: ${this.state.powerUpsUsed})</div>`;
        }

        html += '</div>';
        return html;
    }
}
