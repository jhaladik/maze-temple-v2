// Demo Recorder Class
// Records gameplay for imitation learning and analysis

export class DemoRecorder {
    constructor() {
        this.recording = false;
        this.currentDemo = [];
    }

    startRecording() {
        this.recording = true;
        this.currentDemo = [];
    }

    recordStep(state, action, reward) {
        if (this.recording) {
            this.currentDemo.push({
                state: state.getStateVector(),
                action: action,
                reward: reward,
                timestamp: Date.now()
            });
        }
    }

    saveDemo(score, steps) {
        if (this.currentDemo.length === 0) return;

        try {
            const demos = JSON.parse(localStorage.getItem('mazeTemple_demos') || '[]');
            demos.push({
                id: Date.now(),
                score: score,
                steps: steps,
                data: this.currentDemo,
                date: new Date().toISOString()
            });

            // Keep only last 10 demos
            if (demos.length > 10) {
                demos.shift();
            }

            localStorage.setItem('mazeTemple_demos', JSON.stringify(demos));
            console.log(`Demo saved: ${this.currentDemo.length} steps, score ${score}`);
        } catch (e) {
            console.error('Failed to save demo:', e);
        }

        this.currentDemo = [];
        this.recording = false;
    }

    stopRecording() {
        this.recording = false;
    }
}
