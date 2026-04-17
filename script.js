const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height, centerX, centerY;
let particles = [];
let cosmicObjects = [];

// --- Configuration ---
const MAX_DEPTH = 1000;
const BASE_SPEED = 2.5;
const WARP_SPEED_THRESHOLD = 30; // Threshold for portal activation

// Phase Definitions with increased star counts
const PHASES = [
  { id: 0, name: "Calm Space", count: 1200, hueRange: 200, trail: 0.15, shake: 0 },
  { id: 1, name: "Ion Cloud", count: 1800, hueRange: 160, trail: 0.25, shake: 0.5 },
  { id: 2, name: "Energy Vortex", count: 2200, hueRange: 300, trail: 0.35, shake: 2 },
  { id: 3, name: "Hyperspace Void", count: 2800, hueRange: 220, trail: 0.5, shake: 5 }
];

let phaseIdx = 0;
let portalProgress = 0; // 0 to 1 scaling for expansion effect
let isPhasing = false; // Is currently in the breakthrough event
let phaseFlash = 0; // Screen flash alpha
let portalBuildupValue = 0; // Internal timer for manual trigger delay

let currentSpeed = BASE_SPEED;
let targetSpeed = BASE_SPEED;
let tunnelCurveX = 0, tunnelCurveY = 0;
let huePivot = 220;

const keys = { ArrowUp: false, ArrowDown: false, Shift: false, " ": false };

// --- UI State Management ---
let appState = "intro"; // "intro" | "controls" | "running"
const introScreen = document.getElementById("intro-screen");
const controlsScreen = document.getElementById("controls-screen");
const mainTitle = document.getElementById("main-title");
const startBtn = document.getElementById("start-btn");
const beginBtn = document.getElementById("begin-btn");



function startToControls() {
  appState = "controls";
  introScreen.classList.remove("active");
  setTimeout(() => {
    controlsScreen.classList.add("active");
  }, 500);
}

function beginExperience() {
  appState = "running";
  controlsScreen.classList.remove("active");
  // Transition speed ramp handled in updateState
}

startBtn.addEventListener("click", startToControls);
beginBtn.addEventListener("click", beginExperience);


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
    this.r = (distFactor * 600) + 10; // Wider distribution
    this.phi = Math.random() * Math.PI * 2;
    this.z = isInitial ? Math.random() * MAX_DEPTH : MAX_DEPTH;
    this.prevZ = this.z;
    this.spin = (Math.random() - 0.5) * 0.008;
    this.size = Math.random() * 1.5 + 0.5;
    this.type = Math.random() > 0.85 ? 'streak' : 'dust';
  }

  update(speed) {
    this.prevZ = this.z;
    this.z -= speed;

    // CENTER BIAS: Subtle radial pull to enhance tunnel depth
    if (this.z < 800) {
      this.r *= 0.998;
    }

    this.phi += this.spin;
    if (this.z <= 1) this.init(false);
  }

  draw() {
    if (this.z <= 5 || this.z >= MAX_DEPTH) return;
    const factor = (500 + currentSpeed * 10) / this.z; 
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
    this.z -= speed * 0.5;
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
for (let i = 0; i < 4; i++) cosmicObjects.push(new CosmicObject());

function triggerPortalEvent() {
  if (isPhasing) return;
  isPhasing = true;
  portalProgress = 0.1;

  // Expansion + Flash animation
  const transition = setInterval(() => {
    portalProgress += 0.05;
    if (portalProgress >= 1.0) {
      clearInterval(transition);
      phaseFlash = 1.0;
      phaseIdx = (phaseIdx + 1) % PHASES.length;
      portalProgress = 0;
      isPhasing = false;
      portalBuildupValue = 0;
      
      const targetCount = PHASES[phaseIdx].count;
      while (particles.length < targetCount) particles.push(new Particle());
      if (particles.length > targetCount) particles.splice(0, particles.length - targetCount);
    }
  }, 16);
}

function updateState() {
  if (appState === "running") {
    if (keys.Shift) targetSpeed = 45;
    else if (keys.ArrowUp) targetSpeed = Math.min(60, targetSpeed + 0.5);
    else if (keys.ArrowDown) targetSpeed = Math.max(0.5, targetSpeed - 0.5);
    else targetSpeed += (BASE_SPEED - targetSpeed) * 0.05;
  } else {
    // Calm, slow speed for intro/controls
    targetSpeed = 0.4;
  }

  currentSpeed += (targetSpeed - currentSpeed) * 0.08;
  huePivot = (huePivot + 0.15) % 360;

  // Manual Portal Pulse / Buildup
  if (portalBuildupValue > 0) {
    portalBuildupValue -= 0.02;
    if (portalBuildupValue < 0.01) triggerPortalEvent();
  }

  if (phaseFlash > 0) phaseFlash -= 0.04;
}

function drawPortalRing() {
  if (!isPhasing && portalBuildupValue <= 0) return;
  
  // Organic, jittery energy field logic
  const time = Date.now() * 0.005;
  const baseR = isPhasing ? portalProgress * height * 1.5 : (1 - portalBuildupValue) * 100;
  const segments = 120;
  const jitter = isPhasing ? 20 : 5;

  ctx.save();
  ctx.strokeStyle = `hsla(${huePivot}, 100%, 75%, ${0.5 + Math.sin(time)*0.2})`;
  ctx.lineWidth = 4 + Math.sin(time * 0.5) * 2;
  ctx.beginPath();

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = Math.sin(angle * 8 + time) * jitter + (Math.random() - 0.5) * 4;
    const pr = baseR + noise;
    const px = centerX + Math.cos(angle) * pr;
    const py = centerY + Math.sin(angle) * pr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Outer glow pulse
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.restore();
}

function drawLoop() {
  updateState();
  const phase = PHASES[phaseIdx];
  const shake = isPhasing ? 10 : phase.shake;
  const shakeX = (Math.random() - 0.5) * shake;
  const shakeY = (Math.random() - 0.5) * shake;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Dynamic Background trail
  const trail = phase.trail + Math.abs(currentSpeed)/180;
  ctx.fillStyle = `rgba(0, 0, 0, ${trail})`;
  ctx.fillRect(-20, -20, width + 40, height + 40);

  // Radial Core Glow
  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
  glow.addColorStop(0, `hsla(${huePivot}, 100%, 15%, 0.15)`);
  glow.addColorStop(0.7, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  cosmicObjects.forEach(obj => { obj.update(currentSpeed); obj.draw(); });
  particles.forEach(p => { p.update(currentSpeed); p.draw(); });

  drawPortalRing();

  ctx.restore();

  // Instant breakthrough / phase jump flash
  if (phaseFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${phaseFlash})`;
    ctx.fillRect(0, 0, width, height);
  }

  requestAnimationFrame(drawLoop);
}

// Logic Inputs
window.addEventListener("mousemove", (e) => {
  if (appState !== "running" && appState !== "controls") {
    // subtle movement in intro
    const tx = (e.clientX / width - 0.5) * 2;
    const ty = (e.clientY / height - 0.5) * 2;
    tunnelCurveX += (tx - tunnelCurveX) * 0.02;
    tunnelCurveY += (ty - tunnelCurveY) * 0.02;
    return;
  }
  const tx = (e.clientX / width - 0.5) * 6;
  const ty = (e.clientY / height - 0.5) * 6;
  tunnelCurveX += (tx - tunnelCurveX) * 0.05;
  tunnelCurveY += (ty - tunnelCurveY) * 0.05;
});

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  
  // MANUAL PORTAL TRIGGER (Space)
  if (e.key === " " && currentSpeed > WARP_SPEED_THRESHOLD && !isPhasing && portalBuildupValue <= 0) {
    portalBuildupValue = 1.0; // Starts 300ms countdown
    phaseFlash = 0.3; // Initial feedback pulse
    console.log("Portal charging...");
  }
});
window.addEventListener("keyup", (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

drawLoop();