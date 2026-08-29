/* game.js - Highway Racer
   Vanilla JS + Canvas. Organized using classes and clear functions.
   Features: responsive canvas, keyboard + touch controls, enemy spawn, collisions,
   score/high-score with localStorage, start/pause/restart, simple animations.
*/

/* -------- Global constants and helpers -------- */
const STORAGE_KEY = 'HighwayRacer_highScore_v1';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------- Canvas setup and scaling -------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

let DPR = window.devicePixelRatio || 1;
let vw = 450;   // virtual width for drawing (portrait)
let vh = 780;   // virtual height for drawing

function resizeCanvasToDisplay() {
  // Fit canvas width to container while preserving aspect ratio
  const rect = canvas.getBoundingClientRect();
  const targetCSSW = rect.width;
  const targetCSSH = (targetCSSW * vh) / vw;
  canvas.style.height = `${targetCSSH}px`;

  DPR = window.devicePixelRatio || 1;
  canvas.width = Math.round(targetCSSW * DPR);
  canvas.height = Math.round(targetCSSH * DPR);
  ctx.setTransform(DPR * (canvas.width / (targetCSSW * DPR)), 0, 0, DPR * (canvas.width / (targetCSSW * DPR)), 0, 0);
  // We'll scale drawing coordinates to [0..vw] x [0..vh]
}

/* Map from virtual coords to actual canvas pixel coords */
function screenScaleX(x) { return (x / vw) * canvas.width / DPR; }
function screenScaleY(y) { return (y / vh) * canvas.height / DPR; }

/* -------- Game Entities -------- */
class Player {
  constructor(game) {
    this.game = game;
    this.width = 48;
    this.height = 90;
    this.x = vw / 2 - this.width / 2;
    this.y = vh - this.height - 28;
    this.speed = 6;    // lateral speed
    this.color = '#20c997';
    this.dead = false;
  }
  reset() {
    this.x = vw / 2 - this.width / 2;
    this.y = vh - this.height - 28;
    this.dead = false;
  }
  update(dt, input) {
    if (this.dead) return;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    this.x += dir * this.speed;
    // keep inside road boundaries (game provides left/right)
    this.x = clamp(this.x, this.game.road.left + 8, this.game.road.right - this.width - 8);
  }
  draw(ctx) {
    // Draw a stylized car with layered shapes
    const x = this.x, y = this.y, w = this.width, h = this.height;
    // body shadow
    roundRect(ctx, x+2, y+6, w, h, 8, '#071125');
    // main body
    roundRect(ctx, x, y, w, h, 8, this.color);
    // windows
    roundRect(ctx, x+10, y+12, w-20, h/2.8, 6, 'rgba(255,255,255,0.12)');
    // lights
    ctx.fillStyle = '#fff4';
    ctx.fillRect(x+8, y+h-12, 8, 4);
    ctx.fillRect(x+w-16, y+h-12, 8, 4);
  }
}

class Enemy {
  constructor(game, x, laneWidth, speed) {
    this.game = game;
    this.width = 46;
    this.height = 92;
    this.x = x;
    this.y = -this.height - (Math.random()*80);
    this.speed = speed; // vertical speed
    this.color = randomColor();
    this.passed = false; // whether player has passed it
  }
  update(dt) {
    this.y += this.speed;
  }
  draw(ctx) {
    const x = this.x, y = this.y, w = this.width, h = this.height;
    // drop shadow
    roundRect(ctx, x+3, y+8, w, h, 8, 'rgba(0,0,0,0.35)');
    // body
    roundRect(ctx, x, y, w, h, 8, this.color);
    // window
    roundRect(ctx, x+8, y+14, w-16, h/3.2, 5, 'rgba(255,255,255,0.12)');
    // bumper accent
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x+6, y+h-14, w-12, 6);
  }
}

/* -------- Road background and lane markers -------- */
class Road {
  constructor(game) {
    this.game = game;
    // define road bounds in virtual coordinates
    this.left = 36;
    this.right = vw - 36;
    this.center = vw / 2;
    this.laneCount = 3;
    this.laneWidth = (this.right - this.left) / this.laneCount;
    this.offset = 0; // for animated scrolling
  }
  update(dt, speed) {
    this.offset = (this.offset + speed * 0.6) % 24;
  }
  draw(ctx) {
    // road background
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(0, 0, vw, vh);
    // road surface
    roundRect(ctx, this.left, 0, this.right - this.left, vh, 0, '#11161b');
    // road texture - subtle gradient
    const g = ctx.createLinearGradient(this.center, 0, this.center, vh);
    g.addColorStop(0, 'rgba(255,255,255,0.01)');
    g.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(this.left, 0, this.right - this.left, vh);

    // side rumble strips
    ctx.fillStyle = '#2b2f33';
    ctx.fillRect(this.left-10, 0, 10, vh);
    ctx.fillRect(this.right, 0, 10, vh);
    // dashed center lines (moving)
    ctx.strokeStyle = '#e8eef7';
    ctx.lineWidth = 6;
    ctx.setLineDash([28, 24]);
    ctx.lineDashOffset = -this.offset;
    for (let i=1;i<this.laneCount;i++){
      const x = this.left + i*this.laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

/* -------- Main Game Class -------- */
class Game {
  constructor() {
    this.state = 'start'; // 'start' | 'running' | 'paused' | 'gameover'
    this.road = new Road(this);
    this.player = new Player(this);
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1100; // ms
    this.baseSpeed = 2.2;
    this.speedMultiplier = 1;
    this.score = 0;
    this.highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
    this.lastTime = performance.now();
    this.input = { left:false, right:false };
    this.touchPressed = { left:false, right:false };
    this.bindUI();
    this.updateScoreUI();
    this.resize();
    window.addEventListener('resize', ()=> this.resize());
    requestAnimationFrame((t)=>this.loop(t));
  }

  bindUI(){
    // buttons and overlays
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

    this.startBtn.addEventListener('click', ()=> this.startGame());
    this.startFromScreen.addEventListener('click', ()=> this.startGame());
    this.pauseBtn.addEventListener('click', ()=> this.togglePause());
    this.restartBtn.addEventListener('click', ()=> this.restartGame());
    this.restartFromOver.addEventListener('click', ()=> { this.startGame(); });
    this.backToStart.addEventListener('click', ()=> { this.showStart(); });

    // keyboard
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'Escape') this.togglePause();
    });
    window.addEventListener('keyup', (e)=>{
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

    // touch controls
    const leftTouch = document.getElementById('leftTouch');
    const rightTouch = document.getElementById('rightTouch');

    const setTouch = (side, v) => {
      this.input[side] = v;
      this.touchPressed[side] = v;
    };

    leftTouch.addEventListener('touchstart', (e)=>{ e.preventDefault(); setTouch('left', true); });
    leftTouch.addEventListener('touchend', (e)=>{ e.preventDefault(); setTouch('left', false); });
    leftTouch.addEventListener('touchcancel', (e)=>{ e.preventDefault(); setTouch('left', false); });

    rightTouch.addEventListener('touchstart', (e)=>{ e.preventDefault(); setTouch('right', true); });
    rightTouch.addEventListener('touchend', (e)=>{ e.preventDefault(); setTouch('right', false); });
    rightTouch.addEventListener('touchcancel', (e)=>{ e.preventDefault(); setTouch('right', false); });

    // Also allow pointerdown/mouse click for desktop touch buttons
    leftTouch.addEventListener('pointerdown', ()=> setTouch('left', true));
    leftTouch.addEventListener('pointerup', ()=> setTouch('left', false));
    rightTouch.addEventListener('pointerdown', ()=> setTouch('right', true));
    rightTouch.addEventListener('pointerup', ()=> setTouch('right', false));
  }

  resize(){
    // ensure the canvas is visually scaled and our virtual resolution is consistent
    resizeCanvasToDisplay();
    // update road laneWidth based on vw/vh if needed
    this.road = new Road(this);
    // adjust player clamp if necessary
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
    this.baseSpeed = 2.2;
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
    this.state = 'running';
  }

  showStart() {
    this.state = 'start';
    this.startScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  spawnEnemy() {
    // spawn in one of the lane centers
    const lane = Math.floor(Math.random() * this.road.laneCount);
    const laneX = this.road.left + lane * this.road.laneWidth + (this.road.laneWidth - 46)/2;
    // create with speed based on current multiplier
    const spd = this.baseSpeed * (1.0 + Math.random() * 0.6 + (this.score*0.02));
    const e = new Enemy(this, laneX, this.road.laneWidth, spd);
    this.enemies.push(e);
  }

  endGame() {
    this.state = 'gameover';
    this.player.dead = true;
    // update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.highScore));
    }
    // show game over overlay
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

    // update
    if (this.state === 'running') {
      // pace spawn interval with difficulty
      this.spawnTimer += dt;
      // slightly reduce interval as score grows
      const interval = Math.max(500, this.spawnInterval - (this.score * 8));
      if (this.spawnTimer > interval) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }

      // calculate speed multiplier (increase gradually)
      this.speedMultiplier = 1 + Math.floor(this.score / 15) * 0.06 + Math.min(0.9, this.score * 0.002);
      const actualSpeed = this.baseSpeed * this.speedMultiplier;

      this.road.update(dt, actualSpeed);
      this.player.update(dt, this.input);

      // update enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt * (actualSpeed * 0.55));
        // collision check - AABB
        if (!this.player.dead && rectsOverlap(this.player, e)) {
          this.endGame();
        }
        // passed check: if enemy passes the bottom and not counted
        if (!e.passed && e.y > this.player.y + this.player.height) {
          e.passed = true;
          this.score += 1;
          this.updateScoreUI();
        }
        // remove off-screen
        if (e.y > vh + 200) this.enemies.splice(i,1);
      }
    }

    // draw
    this.draw();

    requestAnimationFrame((t)=>this.loop(t));
  }

  draw() {
    // clear & draw at virtual resolution space [0..vw],[0..vh]
    ctx.save();
    // scale to virtual coordinates (canvas is already set up with a transform)
    ctx.clearRect(0,0,vw,vh);

    // background & road
    this.road.draw(ctx);

    // draw enemies behind player
    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);

    // UI hints overlay on canvas (not DOM)
    // speed meter and subtle vignette
    this.drawHUD(ctx);

    ctx.restore();
  }

  drawHUD(ctx) {
    // speed indicator
    const speed = (this.baseSpeed * this.speedMultiplier).toFixed(1);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(ctx, 12, 12, 120, 34, 10, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = '#fff';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText('Speed: ' + speed, 22, 34);

    // subtle vignette
    const g = ctx.createLinearGradient(0,0,0,vh);
    g.addColorStop(0, 'rgba(0,0,0,0.0)');
    g.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,vw,vh);
  }
}

/* -------- Utility drawing helpers -------- */
function roundRect(ctx,x,y,w,h,r, fillStyle){
  ctx.beginPath();
  if (typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function rectsOverlap(a, b){
  return !(a.x + a.width < b.x ||
           a.x > b.x + b.width ||
           a.y + a.height < b.y ||
           a.y > b.y + b.height);
}

function randomColor(){
  // nice saturated colors for cars
  const palette = ['#ff4d6d','#ffcc00','#5eead4','#60a5fa','#a78bfa','#fb7185','#34d399'];
  return palette[Math.floor(Math.random()*palette.length)];
}

/* -------- Boot the game instance and wire DOM UI text -------- */
const game = new Game();

// ensure score UI reflects localStorage high score
document.getElementById('highScore').textContent = game.highScore;

// Add small animation/UX polish for start screen
(function addStartScreenPolish(){
  const startWrap = document.querySelector('#startScreen .card');
  startWrap.classList.add('fadeIn');
})();

/* Allow click-drag mouse lateral control on the canvas for convenience */
let pointerActive = false;
canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType === 'mouse') {
    pointerActive = true;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e)=>{
  if (!pointerActive) return;
  // map pointer x in canvas CSS coords to virtual coords and steer player
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const virtualX = (cssX / rect.width) * vw;
  // set player center to pointer x
  game.player.x = clamp(virtualX - game.player.width / 2, game.road.left + 8, game.road.right - game.player.width - 8);
});
canvas.addEventListener('pointerup', (e)=>{
  if (e.pointerType === 'mouse') {
    pointerActive = false;
    canvas.releasePointerCapture(e.pointerId);
  }
});

/* Initial resize to ensure crisp scaling */
window.addEventListener('load', ()=> game.resize());
