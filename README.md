# 🎮 MAZE-TEMPLE v2

**Progressive Maze Game with AI-Ready Architecture**

A fun, visually appealing maze game designed as a training school for AI agents. Built with vanilla JavaScript, CSS Grid, and ready for DQN (Deep Q-Network) learning integration.

## 🌟 Features

### Current (Phase 1)
- ✅ **15x15 Dynamic Maze Generation** - Recursive backtracking algorithm
- ✅ **10 Progressive Difficulty Levels** - Increasing complexity
- ✅ **Rich Game Elements**:
  - 💎 Gems (+10 points)
  - ⭐ Bonus items (+50 points)
  - 🔥 Traps (-20 points)
  - 🔑 Keys & 🚪 Doors
  - 🛡️ Shield power-up (5s trap immunity)
  - ⚡ Speed boost (2x movement speed)
  - 🎯 Exit goal
- ✅ **Smooth Animations** - CSS transitions and keyframes
- ✅ **Responsive Controls** - Keyboard (WASD/Arrows) + Touch support
- ✅ **Demo Recording System** - Records gameplay for imitation learning
- ✅ **Local Leaderboard** - Top scores saved in localStorage
- ✅ **AI-Ready State Management** - State vectors for neural networks

### Coming Soon (Phase 2-4)
- 🔄 **AI Watch Mode** - See AI agents play
- 🔄 **Battle Mode** - Human vs AI competition
- 🔄 **DQN Learning** - Deep Q-Network training
- 🔄 **TensorFlow.js Integration** - Neural network inference
- 🔄 **Online Leaderboard** - Cloudflare KV storage

## 🎯 Game Mechanics

### Objective
Navigate through the maze, collect gems, avoid traps, and reach the exit with the highest score!

### Scoring System
- **Gems**: +10 points
- **Bonus**: +50 points
- **Keys**: +15 points
- **Power-ups**: +20 points
- **Door unlock**: +5 points
- **Traps**: -20 points (unless shielded)
- **Exit**: +100 points
- **Steps**: -1 point per move (encourages efficiency)

### Power-Ups
- **🛡️ Shield**: 5 seconds of trap immunity
- **⚡ Speed Boost**: 2x movement speed for 5 seconds

### Controls
- **Movement**: Arrow Keys or WASD
- **Restart**: R key
- **Next Level**: N key
- **Touch**: Swipe in any direction (mobile)

## 🏗️ Architecture

### AI-Ready Design

The game is architected to support AI agent training:

```javascript
// State representation for neural networks
GameState.getStateVector() returns:
[
  normalized_player_x,
  normalized_player_y,
  normalized_score,
  ...local_3x3_grid,      // Surrounding cells encoded
  distance_to_exit,
  nearest_gem_dx,
  nearest_gem_dy,
  shield_active,
  speed_active
]
```

### Demo Recording

Every human gameplay session is recorded and can be used for:
- **Imitation Learning**: Train AI to mimic human behavior
- **Behavioral Cloning**: Bootstrap agent training
- **Analysis**: Study optimal paths and strategies

Demos are stored in `localStorage` as:
```javascript
{
  id: timestamp,
  score: final_score,
  steps: move_count,
  data: [{ state, action, reward, timestamp }, ...],
  date: ISO_string
}
```

### Action Space

Simple discrete action space for RL:
- 0: UP
- 1: RIGHT
- 2: DOWN
- 3: LEFT

### Reward Function

Designed to encourage:
- ✅ Collecting gems and bonuses
- ✅ Efficient pathfinding (step penalty)
- ✅ Reaching the exit
- ❌ Hitting traps
- ✅ Strategic power-up usage

## 🚀 Quick Start

### Local Development

Simply open `index.html` in your browser:

```bash
# Clone the repository
git clone <repository-url>
cd maze-temple-v2

# Open in browser
open index.html
# or
python -m http.server 8000
# then visit http://localhost:8000
```

### Deployment to Cloudflare Pages

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create pages project
wrangler pages project create maze-temple

# Deploy
wrangler pages deploy . --project-name=maze-temple
# or
npm run deploy
```

## 📁 File Structure

```
maze-temple-v2/
├── index.html          # Complete game (HTML + CSS + JS)
├── _headers           # Cloudflare caching rules
├── package.json       # Project metadata
├── README.md          # This file
└── .git/             # Git repository
```

## 🧠 AI Integration (Planned)

### Phase 3: Q-Learning
Simple tabular Q-learning for initial AI training.

### Phase 4: Deep Q-Network (DQN)
Full neural network training with:
- Experience replay buffer
- Target network
- Epsilon-greedy exploration
- TensorFlow.js for browser training

Example integration:
```javascript
// Future AI agent
class DQNAgent {
  constructor() {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [stateSize] }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'linear' }) // 4 actions
      ]
    });
  }

  selectAction(state) {
    // Epsilon-greedy policy
  }

  train(batch) {
    // DQN training with experience replay
  }
}
```

## 🎨 Visual Design

- **Color Scheme**: Purple/Blue gradient background
- **Rendering**: CSS Grid (no Canvas)
- **Graphics**: Emoji-based (no assets needed!)
- **Animations**: Smooth CSS transitions
- **Responsive**: Works on desktop and mobile

## 🔧 Technical Stack

- **Pure HTML/CSS/JavaScript** - No frameworks
- **CSS Grid** - For maze rendering
- **LocalStorage API** - For persistence
- **Touch Events API** - Mobile support
- **Cloudflare Pages** - Deployment platform

## 📊 Success Metrics

- ✅ Player can complete 5 levels in < 5 minutes
- ✅ Game feels responsive (< 16ms input latency)
- ✅ Score system encourages exploration vs speed tradeoff
- 🔄 AI can complete level 1 after 100 training episodes (coming soon)
- 🔄 Battle mode clearly shows winner (coming soon)
- ✅ Works on mobile without changes

## 🎓 Educational Use

Perfect for:
- Learning reinforcement learning concepts
- Experimenting with DQN implementations
- Teaching imitation learning
- Demonstrating game AI development
- Browser-based ML education

## 📝 Roadmap

### Week 1: Core Game ✅
- [x] Maze generation
- [x] Player movement
- [x] Score system
- [x] 10 difficulty levels
- [x] Local high scores
- [x] Demo recording

### Week 2: Polish & Features (Current)
- [ ] Improve maze generation algorithm
- [ ] Add more visual effects
- [ ] Sound effects (optional)
- [ ] Better mobile UX
- [ ] Tutorial/help screen

### Week 3: AI Integration
- [ ] Simple Q-learning AI
- [ ] Watch mode implementation
- [ ] AI vs Human battles
- [ ] Imitation learning from demos

### Week 4: Advanced AI
- [ ] TensorFlow.js integration
- [ ] Deep Q-Network training
- [ ] Multiple agent types
- [ ] Online leaderboard (Cloudflare KV)
- [ ] Shareable replays

## 🤝 Contributing

This is an educational project. Contributions welcome!

Areas to contribute:
- Better maze generation algorithms
- Additional game mechanics
- AI agent implementations
- Visual improvements
- Performance optimizations

## 📄 License

MIT License - Feel free to use for learning and experimentation!

## 🎮 Play Now!

[Live Demo Coming Soon on Cloudflare Pages]

---

**Built with 🧠 for AI Agent Training**

*Part of the AI Agent School series - Teaching machines to navigate, learn, and compete!*
