/* game.js - Highway Racer (full-screen + improved car visuals)
   - Full-device pixel backing buffer sized to window innerWidth/innerHeight
   - Uniform SCALE & OFFSETS center virtual viewport inside the canvas
   - Player & Enemy draw are enhanced (wheels, highlights, grille, stripes)
*/

/* ---- constants and helpers ---- */
const STORAGE_KEY = 'HighwayRacer_highScore_v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- canvas & virtual viewport ---- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Virtual coordinate system (game logic uses these coordinates)
let vw = 450;
let vh = 800;

// Scale and offset mapping virtual coords -> device pixels
let SCALE = 1;
let OFFSET_X = 0;
let OFFSET_Y = 0;

function resizeCanvasToDisplay() {
  // Use full window size (covering the page)
  const cssWidth = Math.max(320, window.innerWidth);
  const cssHeight = Math.max(320, window.innerHeight);

  const DPR = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * DPR);
  canvas.height = Math.round(cssHeight * DPR);

  // compute uniform scale so virtual viewport fits entirely within canvas
  const scaleX = canvas.width / vw;
  const scaleY = canvas.height / vh;
  SCALE = Math.min(scaleX, scaleY);

  // center the virtual viewport
  OFFSET_X = Math.round((canvas.width - vw * SCALE) / 2);
  OFFSET_Y = Math.round((canvas.height - vh * SCALE) / 2);

  // set transform so all drawing uses virtual coords directly
  ctx.setTransform(SCALE, 0, 0, SCALE, OFFSET_X, OFFSET_Y);
  ctx.imageSmoothingEnabled = false;
}

/* ---- Entity drawing helpers ---- */
function roundRect(ctx,x,y,w,h,r,fillStyle){
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

function gradientForColor(base){
  const g = ctx.createLinearGradient(0, 0, 0, 80);
  g.addColorStop(0, shadeColor(base, 14));
  g.addColorStop(1, shadeColor(base, -12));
  return g;
}
function shadeColor(hex, percent){
  const f = parseInt(hex.slice(1),16), t = percent<0?0:255, p = Math.abs(percent)/100;
  const R = Math.round((t - (f>>16)) * p) + (f>>16);
  const G = Math.round((t - (f>>8 & 0x00FF)) * p) + (f>>8 & 0x00FF);
  const B = Math.round((t - (f & 0x0000FF)) * p) + (f & 0x0000FF);
  return `rgb(${R},${G},${B})`;
}

function randomColor(){
  const palette = ['#ff4d6d','#ffcc00','#5eead4','#60a5fa','#a78bfa','#fb7185','#34d399','#f97316'];
  return palette[Math.floor(Math.random()*palette.length)];
}

/* ---- wheel drawing ---- */
function drawWheel(ctx, cx, cy, r){
  ctx.beginPath();
  ctx.fillStyle = '#111';
  ctx.ellipse(cx, cy, r, r*0.72, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.ellipse(cx, cy, r*0.5, r*0.36, 0, 0, Math.PI*2);
  ctx.fill();
}

/* ---- Player & Enemy with upgraded visuals ---- */
class Player {
  constructor(game) {
    this.game = game;
    this.width = 52;
    this.height = 96;
    this.x = vw/2 - this.width/2;
    this.y = vh - this.height - 28;
    this.speed = 7;
    this.baseColor = '#20c997';
    this.dead = false;
    this.tilt = 0;
  }
  reset(){
    this.x = vw/2 - this.width/2;
    this.y = vh - this.height - 28;
    this.dead = false;
    this.tilt = 0;
  }
  update(dt, input){
    if (this.dead) return;
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    this.x += dir * this.speed;
    this.x = clamp(this.x, this.game.road.left + 8, this.game.road.right - this.width - 8);
    this.tilt += (dir * 6 - this.tilt) * 0.12;
  }
  draw(ctx){
    const x = this.x, y = this.y, w = this.width, h = this.height;
    ctx.save();
    ctx.translate(x + w/2, y + h/2);
    ctx.rotate(this.tilt * Math.PI/180 * 0.03);
    ctx.translate(-(x + w/2), -(y + h/2));

    ctx.fillStyle = gradientForColor(this.baseColor);
    roundRect(ctx, x, y+6, w, h-6, 8, ctx.fillStyle);

    roundRect(ctx, x + 10, y + 12, w - 20, h/2.6, 6, 'rgba(255,255,255,0.12)');

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 8, y + 20, 6, h - 44);
    ctx.fillRect(x + w - 14, y + 20, 6, h - 44);

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(ctx, x+6, y+h-18, w-12, 10, 4, ctx.fillStyle);

    drawWheel(ctx, x + 12, y + h - 8, 9);
    drawWheel(ctx, x + w - 14, y + h - 8, 9);

    ctx.fillStyle = 'rgba(255,255,180,0.75)';
    ctx.fillRect(x+6, y+h-12, 8, 4);
    ctx.fillRect(x+w-14, y+h-12, 8, 4);

    ctx.restore();
  }
}

class Enemy {
  constructor(game, x, laneWidth, speed) {
    this.game = game;
    this.width = 50;
    this.height = 96;
    this.x = x;
    this.y = -this.height - (Math.random()*80);
    this.speed = speed;
    this.baseColor = randomColor();
    this.passed = false;
    this.wobble = Math.random() * 20;
  }
  update(dt){ this.y += this.speed; this.wobble += 0.02; }
  draw(ctx){
    const x = this.x, y = this.y, w = this.width, h = this.height;
    const wobbleX = Math.sin(this.wobble) * 1.2;

    ctx.save();
    ctx.translate(wobbleX, 0);

    ctx.fillStyle = gradientForColor(this.baseColor);
    roundRect(ctx, x, y+6, w, h-6, 8, ctx.fillStyle);

    roundRect(ctx, x + 8, y + 14, w - 16, h/3.2, 5, 'rgba(255,255,255,0.10)');

    drawWheel(ctx, x + 12, y + h - 8, 8);
    drawWheel(ctx, x + w - 14, y + h - 8, 8);

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    roundRect(ctx, x+6, y+h-16, w-12, 8, 4, ctx.fillStyle);

    ctx.restore();
  }
}

/* ---- Road ---- */
class Road {
  constructor(game) {
    this.game = game;
    this.margin = 36;
    this.left = this.margin;
    this.right = vw - this.margin;
    this.center = vw/2;
    this.laneCount = 3;
    this.laneWidth = (this.right - this.left) / this.laneCount;
    this.offset = 0;
  }
  update(dt, speed) { this.offset = (this.offset + speed * 0.6) % 32; }
  draw(ctx){
    ctx.fillStyle = '#08111a';
    ctx.fillRect(0, 0, vw, vh);

    roundRect(ctx, this.left, 0, this.right - this.left, vh, 0, '#11161b');

    ctx.fillStyle = '#262b30';
    ctx.fillRect(this.left - 12, 0, 12, vh);
    ctx.fillRect(this.right, 0, 12, vh);

    ctx.strokeStyle = '#dfeaf2';
    ctx.lineWidth = 6;
    ctx.setLineDash([30, 26]);
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

/* ---- Game core ---- */
class Game {
  constructor(){
    this.state = 'start';
    this.road = new Road(this);
    this.player = new Player(this);
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000;
    this.baseSpeed = 2.5;
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
    window.addEventListener('orientationchange', ()=> setTimeout(()=> this.resize(),150));
    requestAnimationFrame((t)=>this.loop(t));
  }

  bindUI(){
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

    window.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = true;
      if (e.key === 'Escape') this.togglePause();
    });
    window.addEventListener('keyup', (e)=>{
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.input.right = false;
    });

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

    leftTouch.addEventListener('pointerdown', ()=> setTouch('left', true));
    leftTouch.addEventListener('pointerup', ()=> setTouch('left', false));
    rightTouch.addEventListener('pointerdown', ()=> setTouch('right', true));
    rightTouch.addEventListener('pointerup', ()=> setTouch('right', false));
  }

  resize(){
    resizeCanvasToDisplay();
    this.road = new Road(this);
    this.player = this.player || new Player(this);
    this.player.reset();
  }

  startGame(){
    this.state = 'running';
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.enemies = [];
    this.score = 0;
    this.spawnTimer = 0;
    this.baseSpeed = 2.5;
    this.speedMultiplier = 1;
    this.player.reset();
    this.updateScoreUI();
    this.lastTime = performance.now();
  }

  togglePause(){
    if (this.state === 'running'){ this.state = 'paused'; this.pauseBtn.textContent = 'Resume'; }
    else if (this.state === 'paused'){ this.state = 'running'; this.pauseBtn.textContent = 'Pause'; this.lastTime = performance.now(); }
  }

  restartGame(){ this.startGame(); this.state='running'; }

  showStart(){ this.state='start'; this.startScreen.classList.remove('hidden'); this.gameOverScreen.classList.add('hidden'); }

  spawnEnemy(){
    const lane = Math.floor(Math.random() * this.road.laneCount);
    const laneX = this.road.left + lane * this.road.laneWidth + (this.road.laneWidth - 50)/2;
    const spd = this.baseSpeed * (1.0 + Math.random()*0.6 + (this.score*0.02));
    const e = new Enemy(this, laneX, this.road.laneWidth, spd);
    this.enemies.push(e);
  }

  endGame(){
    this.state = 'gameover';
    this.player.dead = true;
    if (this.score > this.highScore){ this.highScore = this.score; localStorage.setItem(STORAGE_KEY, String(this.highScore)); }
    this.finalScore.textContent = this.score;
    this.finalHigh.textContent = this.highScore;
    this.gameOverScreen.classList.remove('hidden');
  }

  updateScoreUI(){ this.scoreEl.textContent = this.score; this.highEl.textContent = this.highScore; }

  loop(now){
    const dt = Math.min(40, now - this.lastTime);
    this.lastTime = now;

    if (this.state === 'running'){
      this.spawnTimer += dt;
      const interval = Math.max(420, this.spawnInterval - (this.score * 10));
      if (this.spawnTimer > interval){ this.spawnTimer = 0; this.spawnEnemy(); }

      this.speedMultiplier = 1 + Math.floor(this.score / 12) * 0.06 + Math.min(0.9, this.score * 0.002);
      const actualSpeed = this.baseSpeed * this.speedMultiplier;

      this.road.update(dt, actualSpeed);
      this.player.update(dt, this.input);

      for (let i=this.enemies.length-1;i>=0;i--){
        const e = this.enemies[i];
        e.update(dt * (actualSpeed * 0.55));
        if (!this.player.dead && rectsOverlap(this.player, e)) { this.endGame(); }
        if (!e.passed && e.y > this.player.y + this.player.height) { e.passed = true; this.score += 1; this.updateScoreUI(); }
        if (e.y > vh + 300) this.enemies.splice(i,1);
      }
    }

    this.draw();
    requestAnimationFrame((t)=>this.loop(t));
  }

  draw(){
    // clear device buffer first
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // apply virtual transform
    ctx.setTransform(SCALE,0,0,SCALE,OFFSET_X,OFFSET_Y);

    // draw world in virtual coords
    this.road.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    this.player.draw(ctx);
    this.drawHUD(ctx);
  }

  drawHUD(ctx){
    const speed = (this.baseSpeed * this.speedMultiplier).toFixed(1);
    roundRect(ctx, 12, 12, 140, 36, 10, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px Inter, sans-serif';
    ctx.fillText('Speed: ' + speed, 24, 36);
    const g = ctx.createLinearGradient(0,0,0,vh);
    g.addColorStop(0, 'rgba(0,0,0,0.0)');
    g.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,vw,vh);
  }
}

/* ---- start ---- */
const game = new Game();
document.getElementById('highScore').textContent = game.highScore;
(function addStartScreenPolish(){
  const startWrap = document.querySelector('#startScreen .card');
  if (startWrap) startWrap.classList.add('fadeIn');
})();

/* pointer-drag control (map CSS coords -> virtual coords) */
let pointerActive = false;
canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType === 'mouse') { pointerActive = true; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener('pointermove', (e)=>{
  if (!pointerActive) return;
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const virtualX = (cssX / rect.width) * vw;
  game.player.x = clamp(virtualX - game.player.width / 2, game.road.left + 8, game.road.right - game.player.width - 8);
});
canvas.addEventListener('pointerup', (e)=>{
  if (e.pointerType === 'mouse') { pointerActive = false; canvas.releasePointerCapture(e.pointerId); }
});

/* watch resize/orientation */
window.addEventListener('load', ()=> game.resize());
window.addEventListener('resize', ()=> game.resize());
