const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height, centerX, centerY;
let particles = [];
let cosmicObjects = [];

// --- Configuration ---
const MAX_DEPTH = 1000;
const BASE_SPEED = 2.5;
const WARP_SPEED_THRESHOLD = 35; // Speed required to build portal progress

// Phase Definitions
const PHASES = [
  { id: 0, name: "Calm Space", count: 800, hueRange: 200, trail: 0.15, shake: 0 },
  { id: 1, name: "Ion Cloud", count: 1200, hueRange: 160, trail: 0.25, shake: 0.5 },
  { id: 2, name: "Energy Vortex", count: 1500, hueRange: 300, trail: 0.35, shake: 2 },
  { id: 3, name: "Hyperspace Void", count: 2000, hueRange: 220, trail: 0.5, shake: 5 }
];

let phaseIdx = 0;
let portalProgress = 0;
let isPhasing = false;
let phaseFlash = 0; // Screen flash alpha

let currentSpeed = BASE_SPEED;
let targetSpeed = BASE_SPEED;
let flightDirection = 1;
let tunnelCurveX = 0, tunnelCurveY = 0;
let huePivot = 220;

const keys = { ArrowUp: false, ArrowDown: false, Shift: false, " ": false };

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
}
window.addEventListener("resize", resize);
resize();

// --- Particle Class ---
class Particle {
  constructor(isInitial = false) {
    this.init(isInitial);
  }

  init(isInitial = false) {
    const distFactor = Math.sqrt(Math.random());
    this.r = (distFactor * 500) + 10;
    this.phi = Math.random() * Math.PI * 2;
    this.z = isInitial ? Math.random() * MAX_DEPTH : (flightDirection > 0 ? MAX_DEPTH : 10);
    this.prevZ = this.z;
    this.spin = (Math.random() - 0.5) * 0.01;
    this.size = Math.random() * 1.5 + 0.5;
    this.type = Math.random() > 0.8 ? 'streak' : 'dust';
  }

  update(speed) {
    this.prevZ = this.z;
    this.z -= (speed * flightDirection);
    this.phi += this.spin;
    if (flightDirection > 0 ? this.z <= 1 : this.z >= MAX_DEPTH) this.init(false);
  }

  draw() {
    if (this.z <= 5 || this.z >= MAX_DEPTH) return;
    const factor = (500 + currentSpeed * 10) / this.z; // FOV shift with speed
    const curve = (MAX_DEPTH - this.z) * 0.15;
    const px = Math.cos(this.phi) * this.r * factor + centerX + (tunnelCurveX * curve);
    const py = Math.sin(this.phi) * this.r * factor + centerY + (tunnelCurveY * curve);

    const phase = PHASES[phaseIdx];
    const depthAlpha = Math.max(0, 1 - (this.z / MAX_DEPTH));
    const hue = (huePivot + (this.z / 4)) % 360;
    const brightness = 40 + (depthAlpha * 40);
    
    ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${depthAlpha})`;
    ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${depthAlpha})`;

    if (this.type === 'streak' || Math.abs(currentSpeed) > 12) {
      const prevFactor = (500 + currentSpeed * 10) / this.prevZ;
      const prevX = Math.cos(this.phi) * this.r * prevFactor + centerX + (tunnelCurveX * curve);
      const prevY = Math.sin(this.phi) * this.r * prevFactor + centerY + (tunnelCurveY * curve);
      ctx.lineWidth = this.size * factor * 0.2;
      ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(px, py); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.1, this.size * factor * 0.1), 0, Math.PI * 2); ctx.fill();
    }
  }
}

// --- Cosmic Object Class ---
class CosmicObject {
  constructor() {
    this.init();
  }

  init() {
    this.z = MAX_DEPTH * 1.5;
    this.phi = Math.random() * Math.PI * 2;
    this.r = 400 + Math.random() * 600;
    this.size = 20 + Math.random() * 60;
    this.type = Math.random() > 0.5 ? 'planet' : 'nebula';
    this.hue = Math.random() * 360;
  }

  update(speed) {
    this.z -= speed * 0.5 * flightDirection; // Slower parallax
    if (this.z < 20) this.init();
  }

  draw() {
    if (this.z > MAX_DEPTH * 1.5 || this.z < 20) return;
    const factor = 500 / this.z;
    const x = Math.cos(this.phi) * this.r * factor + centerX + (tunnelCurveX * (MAX_DEPTH - this.z) * 0.1);
    const y = Math.sin(this.phi) * this.r * factor + centerY + (tunnelCurveY * (MAX_DEPTH - this.z) * 0.1);
    const s = this.size * factor;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, s);
    if (this.type === 'planet') {
      grad.addColorStop(0, `hsla(${this.hue}, 80%, 60%, 0.8)`);
      grad.addColorStop(1, `hsla(${this.hue}, 100%, 10%, 0)`);
    } else {
      grad.addColorStop(0, `hsla(${this.hue}, 100%, 50%, 0.1)`);
      grad.addColorStop(1, `transparent`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  }
}

// Initialization
for (let i = 0; i < PHASES[0].count; i++) particles.push(new Particle(true));
for (let i = 0; i < 3; i++) cosmicObjects.push(new CosmicObject());

function triggerNextPhase() {
  isPhasing = true;
  phaseFlash = 1.0;
  setTimeout(() => {
    phaseIdx = (phaseIdx + 1) % PHASES.length;
    portalProgress = 0;
    isPhasing = false;
    // Adjust particle count
    const targetCount = PHASES[phaseIdx].count;
    while (particles.length < targetCount) particles.push(new Particle());
    if (particles.length > targetCount) particles.splice(0, particles.length - targetCount);
    console.log(`Entering phase: ${PHASES[phaseIdx].name}`);
  }, 200);
}

function updateState() {
  if (keys.Shift) targetSpeed = 40;
  else if (keys.ArrowUp) targetSpeed = Math.min(60, targetSpeed + 0.5);
  else if (keys.ArrowDown) targetSpeed = Math.max(0.5, targetSpeed - 0.5);
  else targetSpeed += (BASE_SPEED - targetSpeed) * 0.05;

  currentSpeed += (targetSpeed - currentSpeed) * 0.08;
  huePivot = (huePivot + 0.15) % 360;

  // Portal logical progress
  if (currentSpeed > WARP_SPEED_THRESHOLD && !isPhasing) {
    portalProgress += (currentSpeed - WARP_SPEED_THRESHOLD) * 0.001;
    if (portalProgress >= 1.0) triggerNextPhase();
  } else {
    portalProgress = Math.max(0, portalProgress - 0.01);
  }

  if (phaseFlash > 0) phaseFlash -= 0.05;
}

function drawLoop() {
  updateState();
  const phase = PHASES[phaseIdx];
  const shakeX = (Math.random() - 0.5) * phase.shake;
  const shakeY = (Math.random() - 0.5) * phase.shake;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Background fade
  ctx.fillStyle = `rgba(0, 0, 0, ${phase.trail + Math.abs(currentSpeed)/200})`;
  ctx.fillRect(-10, -10, width + 20, height + 20);

  cosmicObjects.forEach(obj => { obj.update(currentSpeed); obj.draw(); });
  particles.forEach(p => { p.update(currentSpeed); p.draw(); });

  // Barrier Visual
  if (portalProgress > 0.1) {
    const r = (1 - portalProgress) * height;
    ctx.strokeStyle = `hsla(${huePivot}, 100%, 70%, ${portalProgress * 0.5})`;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(centerX, centerY, r > 0 ? r : 1, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();

  // Flash Effect
  if (phaseFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${phaseFlash})`;
    ctx.fillRect(0, 0, width, height);
  }

  requestAnimationFrame(drawLoop);
}

// Logic Inputs
window.addEventListener("mousemove", (e) => {
  tunnelCurveX = (e.clientX / width - 0.5) * 5;
  tunnelCurveY = (e.clientY / height - 0.5) * 5;
});
window.addEventListener("keydown", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; if (e.key === " ") flightDirection *= -1; });
window.addEventListener("keyup", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

drawLoop();