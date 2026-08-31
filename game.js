/* game.js - Highway Racer
   Vanilla JS + Canvas. Cute car design with proper proportions.
   Features: responsive canvas, keyboard + touch controls, enemy spawn, collisions,
   score/high-score with localStorage, start/pause/restart, smooth animations.
*/

/* -------- Global constants and helpers -------- */
const STORAGE_KEY = 'HighwayRacer_highScore_v1';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------- Canvas setup and scaling -------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let DPR = window.devicePixelRatio || 1;
const vw = 450;   // virtual width for drawing (portrait)
const vh = 780;   // virtual height for drawing

function resizeCanvasToDisplay() {
  // Get the actual display size from the canvas element
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  // Update device pixel ratio
  DPR = window.devicePixelRatio || 1;

  // Set canvas resolution to match display size * DPR
  canvas.width = Math.round(displayWidth * DPR);
  canvas.height = Math.round(displayHeight * DPR);

  // Scale the context to account for DPR and map virtual coords to physical pixels
  const scaleX = canvas.width / vw;
  const scaleY = canvas.height / vh;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
}

/* -------- Game Entities -------- */
class Player {
  constructor(game) {
    this.game = game;
    this.width = 38;
    this.height = 70;
    this.x = vw / 2 - this.width / 2;
    this.y = vh - this.height - 20;
    this.speed = 8;    // lateral speed - increased for better mobile control
    this.bodyColor = '#00d9ff';
    this.dead = false;
  }
  reset() {
    this.x = vw / 2 - this.width / 2;
    this.y = vh - this.height - 20;
    this.dead = false;
  }
  update(dt, input) {
    if (this.dead) return;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    this.x += dir * this.speed;
    // keep inside road boundaries
    this.x = clamp(this.x, this.game.road.left + 5, this.game.road.right - this.width - 5);
  }
  draw(ctx) {
    const x = this.x, y = this.y, w = this.width, h = this.height;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h + 3, w/2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // --- Main Car Body ---
    // Draw cute rounded car shape
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    // Hood (front - top part)
    ctx.moveTo(x + 8, y + h * 0.25);
    ctx.lineTo(x + w - 8, y + h * 0.25);
    // Front bumper curve
    ctx.quadraticCurveTo(x + w, y + h * 0.35, x + w - 3, y + h * 0.5);
    // Right side of body
    ctx.lineTo(x + w - 3, y + h * 0.85);
    // Back bumper curve
    ctx.quadraticCurveTo(x + w, y + h - 8, x + w - 5, y + h);
    // Trunk area
    ctx.lineTo(x + 5, y + h);
    // Left back bumper
    ctx.quadraticCurveTo(x, y + h - 8, x + 3, y + h * 0.85);
    // Left side of body
    ctx.lineTo(x + 3, y + h * 0.5);
    // Left front bumper
    ctx.quadraticCurveTo(x, y + h * 0.35, x + 8, y + h * 0.25);
    ctx.fill();
    
    // --- Windshield (Front Window) ---
    ctx.fillStyle = 'rgba(135, 206, 250, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 8);
    ctx.lineTo(x + w - 10, y + 8);
    ctx.quadraticCurveTo(x + w - 7, y + 14, x + w - 9, y + 24);
    ctx.lineTo(x + 9, y + 24);
    ctx.quadraticCurveTo(x + 7, y + 14, x + 10, y + 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(135, 206, 250, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // --- Rear Window ---
    ctx.fillStyle = 'rgba(135, 206, 250, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + 11, y + h * 0.55);
    ctx.lineTo(x + w - 11, y + h * 0.55);
    ctx.quadraticCurveTo(x + w - 8, y + h * 0.7, x + w - 10, y + h - 10);
    ctx.lineTo(x + 10, y + h - 10);
    ctx.quadraticCurveTo(x + 8, y + h * 0.7, x + 11, y + h * 0.55);
    ctx.fill();
    
    // --- Front Headlights (at the front/top) ---
    // Left headlight
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.32, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Right headlight
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.32, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // --- Rear Tail Lights (at the back/bottom) ---
    // Left tail light
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.92, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // Right tail light
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.92, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // --- Wheels (4 positioned symmetrically) ---
    // Front left wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.4, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Front right wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.4, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Rear left wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.82, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Rear right wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.82, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // --- Door line (middle accent) ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + h * 0.4);
    ctx.lineTo(x + w/2, y + h * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

class Enemy {
  constructor(game, x, laneWidth, speed) {
    this.game = game;
    this.width = 36;
    this.height = 68;
    this.x = x;
    this.y = -this.height - (Math.random() * 100);
    this.speed = speed; // vertical speed - increased for faster gameplay
    this.colorIndex = Math.floor(Math.random() * 6);
    this.passed = false;
  }
  
  getCarColor() {
    const colors = [
      '#ff4444',  // Red
      '#ffaa00',  // Orange
      '#ff44ff',  // Pink/Magenta
      '#44ff44',  // Green
      '#ffff44',  // Yellow
      '#ff6644'   // Orange-red
    ];
    return colors[this.colorIndex];
  }
  
  update(dt) {
    this.y += this.speed;
  }
  
  draw(ctx) {
    const x = this.x, y = this.y, w = this.width, h = this.height;
    const bodyColor = this.getCarColor();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h + 3, w/2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // --- Main Car Body ---
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    // Hood (front)
    ctx.moveTo(x + 8, y + h * 0.25);
    ctx.lineTo(x + w - 8, y + h * 0.25);
    // Front bumper
    ctx.quadraticCurveTo(x + w, y + h * 0.35, x + w - 3, y + h * 0.5);
    // Right side
    ctx.lineTo(x + w - 3, y + h * 0.85);
    // Back bumper
    ctx.quadraticCurveTo(x + w, y + h - 8, x + w - 5, y + h);
    // Trunk
    ctx.lineTo(x + 5, y + h);
    // Left back bumper
    ctx.quadraticCurveTo(x, y + h - 8, x + 3, y + h * 0.85);
    // Left side
    ctx.lineTo(x + 3, y + h * 0.5);
    // Left front bumper
    ctx.quadraticCurveTo(x, y + h * 0.35, x + 8, y + h * 0.25);
    ctx.fill();
    
    // --- Windshield (Front Window) ---
    ctx.fillStyle = 'rgba(150, 150, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 8);
    ctx.lineTo(x + w - 10, y + 8);
    ctx.quadraticCurveTo(x + w - 7, y + 14, x + w - 9, y + 24);
    ctx.lineTo(x + 9, y + 24);
    ctx.quadraticCurveTo(x + 7, y + 14, x + 10, y + 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 150, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // --- Rear Window ---
    ctx.fillStyle = 'rgba(150, 150, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + 11, y + h * 0.55);
    ctx.lineTo(x + w - 11, y + h * 0.55);
    ctx.quadraticCurveTo(x + w - 8, y + h * 0.7, x + w - 10, y + h - 10);
    ctx.lineTo(x + 10, y + h - 10);
    ctx.quadraticCurveTo(x + 8, y + h * 0.7, x + 11, y + h * 0.55);
    ctx.fill();
    
    // --- Front Headlights (at the front/top) ---
    // Left headlight
    ctx.fillStyle = '#fff44f';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.32, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // Right headlight
    ctx.fillStyle = '#fff44f';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.32, 3, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    // --- Rear Tail Lights (at the back/bottom) ---
    // Left tail light
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.92, 2.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bb0000';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    
    // Right tail light
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.92, 2.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bb0000';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    
    // --- Wheels (4 positioned symmetrically) ---
    // Front left wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.4, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Front right wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.4, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Rear left wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y + h * 0.82, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Rear right wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.8, y + h * 0.82, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/* -------- Road background and lane markers -------- */
class Road {
  constructor(game) {
    this.game = game;
    // define road bounds in virtual coordinates
    this.left = 30;
    this.right = vw - 30;
    this.center = vw / 2;
    this.laneCount = 3;
    this.laneWidth = (this.right - this.left) / this.laneCount;
    this.offset = 0;
  }
  
  update(dt, speed) {
    this.offset = (this.offset + speed * 0.8) % 30;
  }
  
  draw(ctx) {
    // Road background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, vw, vh);
    
    // Road surface with gradient
    const roadGradient = ctx.createLinearGradient(0, 0, 0, vh);
    roadGradient.addColorStop(0, '#1a2438');
    roadGradient.addColorStop(0.5, '#151d2d');
    roadGradient.addColorStop(1, '#1a2438');
    ctx.fillStyle = roadGradient;
    ctx.fillRect(this.left, 0, this.right - this.left, vh);
    
    // Road texture overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(this.left, i * (vh / 20), this.right - this.left, 2);
    }
    
    // Side rumble strips with glow
    ctx.fillStyle = '#2d3a4a';
    ctx.fillRect(this.left - 12, 0, 12, vh);
    ctx.fillRect(this.right, 0, 12, vh);
    
    // Left edge accent glow
    const leftGlow = ctx.createLinearGradient(this.left - 12, 0, this.left, 0);
    leftGlow.addColorStop(0, 'rgba(37, 99, 235, 0)');
    leftGlow.addColorStop(1, 'rgba(37, 99, 235, 0.1)');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(this.left - 12, 0, 12, vh);
    
    // Right edge accent glow
    const rightGlow = ctx.createLinearGradient(this.right, 0, this.right + 12, 0);
    rightGlow.addColorStop(0, 'rgba(37, 99, 235, 0.1)');
    rightGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(this.right, 0, 12, vh);
    
    // Animated dashed center lines
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = -this.offset;
    
    for (let i = 1; i < this.laneCount; i++) {
      const x = this.left + i * this.laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, -vh);
      ctx.lineTo(x, vh * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

/* -------- Main Game Class -------- */
class Game {
  constructor() {
    this.state = 'start';
    this.road = new Road(this);
    this.player = new Player(this);
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000;  // Reduced from 1100ms for faster gameplay
    this.baseSpeed = 3.2;       // Increased from 2.2 for faster cars
    this.speedMultiplier = 1;
    this.score = 0;
    this.highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
    this.lastTime = performance.now();
    this.input = { left: false, right: false };
    this.touchPressed = { left: false, right: false };
    this.bindUI();
    this.updateScoreUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    this.startScreen = document.getElementById('startScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.startFromScreen = document.getElementById('startFromScreen');
    this.restartFromOver = document.getElementById('restartFromOver');
    this.backToStart = document.getElementById('backToStart');

    this.scoreEl = document.getElementById('score');
    this.highEl = document.getElementById('highScore');
    this.finalScore = document.getElementById('finalScore');
    this.finalHigh = document.getElementById('finalHigh');

    this.startBtn.addEventListener('click', () => this.startGame());
    this.startFromScreen.addEventListener('click', () => this.startGame());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.restartBtn.addEventListener('click', () => this.restartGame());
    this.restartFromOver.addEventListener('click', () => this.startGame());
    this.backToStart.addEventListener('click', () => this.showStart());

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'Escape') this.togglePause();
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

    // Touch controls for mobile
    const leftTouch = document.getElementById('leftTouch');
    const rightTouch = document.getElementById('rightTouch');

    const setTouch = (side, v) => {
      this.input[side] = v;
      this.touchPressed[side] = v;
    };

    leftTouch.addEventListener('touchstart', (e) => { e.preventDefault(); setTouch('left', true); }, { passive: false });
    leftTouch.addEventListener('touchend', (e) => { e.preventDefault(); setTouch('left', false); }, { passive: false });
    leftTouch.addEventListener('touchcancel', (e) => { e.preventDefault(); setTouch('left', false); }, { passive: false });

    rightTouch.addEventListener('touchstart', (e) => { e.preventDefault(); setTouch('right', true); }, { passive: false });
    rightTouch.addEventListener('touchend', (e) => { e.preventDefault(); setTouch('right', false); }, { passive: false });
    rightTouch.addEventListener('touchcancel', (e) => { e.preventDefault(); setTouch('right', false); }, { passive: false });

    // Pointer events for desktop
    leftTouch.addEventListener('pointerdown', () => setTouch('left', true));
    leftTouch.addEventListener('pointerup', () => setTouch('left', false));
    rightTouch.addEventListener('pointerdown', () => setTouch('right', true));
    rightTouch.addEventListener('pointerup', () => setTouch('right', false));
  }

  resize() {
    resizeCanvasToDisplay();
    this.road = new Road(this);
    this.player = this.player || new Player(this);
    this.player.reset();
  }

  startGame() {
    this.state = 'running';
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.enemies = [];
    this.score = 0;
    this.spawnTimer = 0;
    this.baseSpeed = 3.2;
    this.speedMultiplier = 1;
    this.player.reset();
    this.updateScoreUI();
    this.lastTime = performance.now();
  }

  togglePause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.pauseBtn.textContent = 'Resume';
    } else if (this.state === 'paused') {
      this.state = 'running';
      this.pauseBtn.textContent = 'Pause';
      this.lastTime = performance.now();
    }
  }

  restartGame() {
    this.startGame();
  }

  showStart() {
    this.state = 'start';
    this.startScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  spawnEnemy() {
    const lane = Math.floor(Math.random() * this.road.laneCount);
    const laneX = this.road.left + lane * this.road.laneWidth + (this.road.laneWidth - 36) / 2;
    const spd = this.baseSpeed * (1.0 + Math.random() * 0.5 + (this.score * 0.015));
    const e = new Enemy(this, laneX, this.road.laneWidth, spd);
    this.enemies.push(e);
  }

  endGame() {
    this.state = 'gameover';
    this.player.dead = true;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.highScore));
    }
    this.finalScore.textContent = this.score;
    this.finalHigh.textContent = this.highScore;
    this.gameOverScreen.classList.remove('hidden');
  }

  updateScoreUI() {
    this.scoreEl.textContent = this.score;
    this.highEl.textContent = this.highScore;
  }

  loop(now) {
    const dt = Math.min(40, now - this.lastTime);
    this.lastTime = now;

    if (this.state === 'running') {
      this.spawnTimer += dt;
      const interval = Math.max(400, this.spawnInterval - (this.score * 6));
      if (this.spawnTimer > interval) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }

      this.speedMultiplier = 1 + Math.floor(this.score / 12) * 0.08 + Math.min(0.8, this.score * 0.0015);
      const actualSpeed = this.baseSpeed * this.speedMultiplier;

      this.road.update(dt, actualSpeed);
      this.player.update(dt, this.input);

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt * (actualSpeed * 0.5));
        
        if (!this.player.dead && rectsOverlap(this.player, e)) {
          this.endGame();
        }
        
        if (!e.passed && e.y > this.player.y + this.player.height) {
          e.passed = true;
          this.score += 1;
          this.updateScoreUI();
        }
        
        if (e.y > vh + 200) this.enemies.splice(i, 1);
      }
    }

    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  draw() {
    ctx.save();
    ctx.clearRect(0, 0, vw, vh);

    this.road.draw(ctx);

    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);

    this.drawHUD(ctx);
    ctx.restore();
  }

  drawHUD(ctx) {
    const speed = (this.baseSpeed * this.speedMultiplier).toFixed(1);
    
    // Speed indicator with gradient background
    const speedGradient = ctx.createLinearGradient(12, 12, 12, 46);
    speedGradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    speedGradient.addColorStop(1, 'rgba(37, 99, 235, 0.1)');
    ctx.fillStyle = speedGradient;
    ctx.fillRect(10, 10, 130, 36);
    
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, 130, 36);
    
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('⚡ ' + speed, 16, 30);

    // Subtle vignette for focus
    const vignetteGradient = ctx.createRadialGradient(vw / 2, vh / 2, 150, vw / 2, vh / 2, 400);
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, vw, vh);
  }
}

/* -------- Utility drawing helpers -------- */
function rectsOverlap(a, b) {
  return !(a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height);
}

/* -------- Boot the game instance -------- */
const game = new Game();

document.getElementById('highScore').textContent = game.highScore;

(function addStartScreenPolish() {
  const startWrap = document.querySelector('#startScreen .card');
  if (startWrap) startWrap.classList.add('fadeIn');
})();

/* Mouse drag control on canvas */
let pointerActive = false;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    pointerActive = true;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointerActive) return;
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const virtualX = (cssX / rect.width) * vw;
  game.player.x = clamp(virtualX - game.player.width / 2, game.road.left + 5, game.road.right - game.player.width - 5);
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') {
    pointerActive = false;
    canvas.releasePointerCapture(e.pointerId);
  }
});

window.addEventListener('load', () => game.resize());
