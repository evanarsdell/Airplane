class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.lastTime = performance.now();
    this.input = new InputHandler(this.canvas);
    this.physics = new Physics();
    this.renderer = new Renderer(this.canvas, this.ctx);
    this.throttleUI = new ThrottleUI(this.canvas, this.ctx, this.input);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    this.checkOrientation();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.renderer.resize();
    this.throttleUI.resize();
    this.checkOrientation();
  }

  checkOrientation() {
    const overlay = document.getElementById('orientationOverlay');
    if (window.innerWidth < window.innerHeight) {
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  start() {
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  gameLoop(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.input.update();
    this.physics.update(dt, this.input);
    this.renderer.render(this.physics, this.input);
    this.throttleUI.render();
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }
}

class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.pitch = 0;
    this.roll = 0;
    this.throttle = 50;
    this.sliding = false;
    this.sliderRect = { x: 0, y: 0, width: 0, height: 0 };
    window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
    canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => { this.sliding = false; });
  }

  handleOrientation(event) {
    let beta = event.beta || 0;
    let gamma = event.gamma || 0;
    this.pitch = (Math.abs(beta) < 3) ? 0 : Math.max(-30, Math.min(30, beta));
    this.roll = (Math.abs(gamma) < 3) ? 0 : Math.max(-30, Math.min(30, gamma));
  }

  handleTouchStart(e) {
    let touch = e.touches[0];
    let rect = this.canvas.getBoundingClientRect();
    let x = touch.clientX - rect.left;
    let y = touch.clientY - rect.top;
    if (x >= this.sliderRect.x && x <= this.sliderRect.x + this.sliderRect.width &&
      y >= this.sliderRect.y && y <= this.sliderRect.y + this.sliderRect.height) {
      this.sliding = true;
      this.updateThrottleFromY(y);
      e.preventDefault();
    }
  }

  handleTouchMove(e) {
    if (this.sliding) {
      let touch = e.touches[0];
      let rect = this.canvas.getBoundingClientRect();
      let y = touch.clientY - rect.top;
      this.updateThrottleFromY(y);
      e.preventDefault();
    }
  }

  updateThrottleFromY(y) {
    let { y: top, height } = this.sliderRect;
    let relative = Math.max(0, Math.min(1, (top + height - y) / height));
    this.throttle = relative * 100;
  }

  update() {}
}

class Physics {
  constructor() {
    this.altitude = 100;
    this.forwardSpeed = 50;
    this.distance = 0;
  }

  update(dt, input) {
    const targetSpeed = 50 + input.throttle;
    this.forwardSpeed += (targetSpeed - this.forwardSpeed) * 0.5 * dt;
    this.distance += this.forwardSpeed * dt;
    const climbRate = 20;
    this.altitude += (input.pitch / 30) * climbRate * dt;
    if (this.altitude < 0) this.altitude = 0;
  }
}

class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.horizonY = canvas.height * 0.35;
    this.perspectiveScale = 200;
    this.gridSpacing = 50;
    this.numGridLines = 30;
  }

  resize() {
    this.horizonY = this.canvas.height * 0.35;
  }

  render(physics, input) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    skyGrad.addColorStop(0, "#87CEFA");
    skyGrad.addColorStop(1, "#4682B4");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.canvas.width / 2, this.horizonY);
    ctx.rotate(-input.roll * Math.PI / 180);
    ctx.translate(-this.canvas.width / 2, -this.horizonY);

    let scrollOffset = physics.distance % this.gridSpacing;
    for (let i = 0; i < this.numGridLines; i++) {
      let worldZ = i * this.gridSpacing + scrollOffset;
      let lineY = this.horizonY + (this.canvas.height - this.horizonY) * (this.perspectiveScale / (worldZ + this.perspectiveScale));
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(this.canvas.width, lineY);
      ctx.stroke();
    }

    let centerX = this.canvas.width / 2;
    let runwayBottomWidth = this.canvas.width * 0.8;
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, this.horizonY);
    ctx.lineTo(centerX - runwayBottomWidth / 2, this.canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, this.horizonY);
    ctx.lineTo(centerX + runwayBottomWidth / 2, this.canvas.height);
    ctx.stroke();

    ctx.restore();

    const planeX = this.canvas.width / 2;
    const planeY = this.canvas.height * 0.7;
    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(input.roll * Math.PI / 180);
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(20, 10);
    ctx.lineTo(-20, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class ThrottleUI {
  constructor(canvas, ctx, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.margin = 40;
    this.sliderHeight = 100;
    this.sliderWidth = 4;
    this.dotRadius = 8;
    this.updateSliderRect();
    this.input.sliderRect = Object.assign({}, this.sliderRect);
  }

  updateSliderRect() {
    this.sliderRect = {
      x: this.canvas.width - this.margin,
      y: this.canvas.height - this.sliderHeight - this.margin,
      width: this.sliderWidth,
      height: this.sliderHeight
    };
  }

  resize() {
    this.updateSliderRect();
    this.input.sliderRect = Object.assign({}, this.sliderRect);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = this.sliderWidth;
    ctx.beginPath();
    ctx.moveTo(this.sliderRect.x + this.sliderWidth / 2, this.sliderRect.y);
    ctx.lineTo(this.sliderRect.x + this.sliderWidth / 2, this.sliderRect.y + this.sliderRect.height);
    ctx.stroke();

    let t = this.input.throttle / 100;
    let dotY = this.sliderRect.y + this.sliderRect.height * (1 - t);
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(this.sliderRect.x + this.sliderWidth / 2, dotY, this.dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const game = new Game();
game.start();// Paste your full JavaScript code here from the <script> tag in your original index.html
// This file now holds all your game logic.
