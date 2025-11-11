// Simple AI Class
// Basic AI agent with greedy strategy (ready for DQN expansion)

import { ACTIONS } from '../config/constants.js';

export class SimpleAI {
    constructor(gameState) {
        this.gameState = gameState;
        this.qTable = this.loadQTable() || {};
    }

    selectAction() {
        // Simple greedy strategy: move towards nearest gem or exit
        const nearestGem = this.gameState.getNearestGemDirection();
        const [dx, dy] = nearestGem;

        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? ACTIONS.RIGHT : ACTIONS.LEFT;
        } else {
            return dy > 0 ? ACTIONS.DOWN : ACTIONS.UP;
        }
    }

    loadQTable() {
        try {
            return JSON.parse(localStorage.getItem('mazeTemple_qTable') || '{}');
        } catch {
            return {};
        }
    }

    saveQTable() {
        try {
            localStorage.setItem('mazeTemple_qTable', JSON.stringify(this.qTable));
        } catch (e) {
            console.error('Failed to save Q-table:', e);
        }
    }
}
