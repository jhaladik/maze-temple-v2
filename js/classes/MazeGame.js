// Main Game Class
// Core game controller that manages game flow, rendering, and user interaction

import { ELEMENTS, MAZE_SIZES, ACTIONS } from '../config/constants.js';
import { PlayerSettings } from './PlayerSettings.js';
import { GameState } from './GameState.js';
import { MazeGenerator } from './MazeGenerator.js';
import { DemoRecorder } from './DemoRecorder.js';
import { MazeAnalyzer } from './MazeAnalyzer.js';
import { PerformanceEvaluator } from './PerformanceEvaluator.js';

export class MazeGame {
    constructor() {
        this.state = null;
        this.recorder = new DemoRecorder();
        this.mode = 'human';
        this.currentLevel = 1;
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

        this.init();
        this.updatePlayerDisplay();
    }

    init() {
        const mazeSize = this.playerSettings.mazeSize;
        const mazeType = this.playerSettings.mazeType || 'classic';
        const complexity = this.playerSettings.mazeComplexity || 'medium';

        this.state = new GameState(mazeSize, this.currentLevel);
        this.state.maze = MazeGenerator.generate(mazeSize, this.currentLevel, mazeType, complexity);
        this.state.player.x = 1;
        this.state.player.y = 1;
        this.previousPlayerPos = { x: 1, y: 1 };

        // Count total gems in maze
        this.state.totalGems = 0;
        for (let y = 0; y < mazeSize; y++) {
            for (let x = 0; x < mazeSize; x++) {
                if (this.state.maze[y][x] === ELEMENTS.gem) {
                    this.state.totalGems++;
                }
            }
        }

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

        // Calculate stars from evaluation
        const stars = evaluation.rating.stars;

        // Save progress
        this.playerSettings.addScore(this.state.player.score);
        this.playerSettings.completeLevel(this.currentLevel, stars);

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

        // Display performance evaluation
        if (evaluation) {
            const bonusInfo = document.getElementById('bonus-info');
            const perfInfo = document.getElementById('performance-info');

            // Display rating and grade
            bonusInfo.innerHTML = `Grade: ${evaluation.rating.grade} - ${evaluation.rating.description}`;

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
}
