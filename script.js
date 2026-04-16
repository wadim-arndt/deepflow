const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height;
let centerX, centerY;
let particles = [];
let targetCenterX, targetCenterY;

// Configuration
const PARTICLE_COUNT = 1000;
const MAX_DEPTH = 1000;
const TUNNEL_RADIUS = 300;
const BASE_SPEED = 2.5;
const WARP_SPEED_MULTIPLIER = 10;

let currentSpeed = BASE_SPEED;
let targetSpeed = BASE_SPEED;
let flightDirection = 1; // 1 for forward, -1 for backward
let tunnelCurveX = 0;
let tunnelCurveY = 0;
let huePivot = 220; // Neon Blue/Cyan shift

// Input Tracking
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  Shift: false,
  " ": false // Spacebar
};

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
}

window.addEventListener("resize", resize);
resize();

class Particle {
  constructor(isInitial = false) {
    this.init(isInitial);
  }

  init(isInitial = false) {
    // 1. Structured Tunnel Distribution (Cylindrical Wall)
    // Using sqrt to push particles toward the outer radius of the tunnel
    const distFactor = Math.sqrt(Math.random()); 
    this.r = (distFactor * 200) + 100; 
    
    // Spiral bias mapping
    this.phi = Math.random() * Math.PI * 2;
    
    // Z placement
    this.z = isInitial ? Math.random() * MAX_DEPTH : (flightDirection > 0 ? MAX_DEPTH : 10);
    this.prevZ = this.z;

    // Movement: subtle rotational drift creates the "bore" feeling
    this.spin = (Math.random() - 0.5) * 0.01;
    this.wobble = Math.random() * 0.1;

    // Visuals
    this.size = Math.random() * 1.5 + 0.5;
    this.type = Math.random() > 0.85 ? 'streak' : 'dust';
  }

  update(speed) {
    this.prevZ = this.z;
    
    // Move particle along Z based on direction and speed
    this.z -= (speed * flightDirection);

    // Rotational drift around center axis
    this.phi += this.spin;

    // Recycle logic for infinite flow
    if (flightDirection > 0) {
      if (this.z <= 1) this.init(false);
    } else {
      if (this.z >= MAX_DEPTH) this.init(false);
    }
  }

  project(x, y, z) {
    // 2. Strong Perspective Structure
    // Ensuring particles grow rapidly as they leave the center vanish point
    const focalLength = 500;
    const factor = focalLength / z; 
    
    // Apply tunnel bending via mouse influence
    const curveOffsetFactor = (MAX_DEPTH - z) * 0.15;
    const px = x * factor + centerX + (tunnelCurveX * curveOffsetFactor);
    const py = y * factor + centerY + (tunnelCurveY * curveOffsetFactor);
    
    return { px, py, factor };
  }

  draw() {
    // 3. Structured Flow Calculation
    const x = Math.cos(this.phi) * this.r;
    const y = Math.sin(this.phi) * this.r;

    const current = this.project(x, y, this.z);
    
    // Clipping
    if (this.z <= 5 || this.z >= MAX_DEPTH) return;

    // 4. Energy Ring Illusion (Z-based modulation)
    // Synchronize brightness at certain intervals to create "rings"
    const ringFreq = 0.05;
    const ringIntensity = Math.pow(Math.sin(this.z * ringFreq), 10) * 0.5;
    
    // Depth-based intensity & color mapping
    const depthAlpha = Math.max(0, 1 - (this.z / MAX_DEPTH));
    const finalAlpha = depthAlpha * (0.3 + ringIntensity);
    
    const hue = (huePivot + (this.z / 4)) % 360;
    const brightness = 40 + (depthAlpha * 40) + (ringIntensity * 20);
    
    ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${finalAlpha})`;
    ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${finalAlpha})`;

    if (this.type === 'streak' || Math.abs(currentSpeed) > 12) {
      // Directional Trails
      const previous = this.project(x, y, this.prevZ);
      ctx.lineWidth = this.size * current.factor * 0.2;
      ctx.beginPath();
      ctx.moveTo(previous.px, previous.py);
      ctx.lineTo(current.px, current.py);
      ctx.stroke();
    } else {
      // Detailed Dust / Stars
      const s = this.size * current.factor * 0.1;
      ctx.beginPath();
      ctx.arc(current.px, current.py, Math.max(0.1, s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Init State
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle(true));
}

function updateState() {
  // Speed Scaling & Controls
  if (keys.Shift) {
    targetSpeed = BASE_SPEED * WARP_SPEED_MULTIPLIER;
  } else if (keys.ArrowUp) {
    targetSpeed = Math.min(50, targetSpeed + 0.4);
  } else if (keys.ArrowDown) {
    targetSpeed = Math.max(0.5, targetSpeed - 0.4);
  } else {
    // Slow drift toward base speed
    targetSpeed += (BASE_SPEED - targetSpeed) * 0.05;
  }

  // Elastic Motion Interpolation
  currentSpeed += (targetSpeed - currentSpeed) * 0.08;

  // Global Hue Engine
  huePivot = (huePivot + 0.15) % 360;
}

function drawLoop() {
  updateState();

  // Trail buildup (Alpha Fade)
  const fadeAlpha = Math.min(0.2, 0.05 + Math.abs(currentSpeed) / 100);
  ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
  ctx.fillRect(0, 0, width, height);

  // Core Vanishing Point Glow
  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
  glow.addColorStop(0, `hsla(${huePivot}, 100%, 15%, 0.1)`);
  glow.addColorStop(0.6, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Painter's sorting (Z-depth consistency)
  particles.sort((a, b) => b.z - a.z);

  particles.forEach(p => {
    p.update(currentSpeed);
    p.draw();
  });

  requestAnimationFrame(drawLoop);
}

// Interactions
window.addEventListener("mousemove", (e) => {
  // Map mouse to tunnel curvature
  const targetX = (e.clientX / width - 0.5) * 5;
  const targetY = (e.clientY / height - 0.5) * 5;
  
  // Exponentially weighted smoothing for cursor
  tunnelCurveX += (targetX - tunnelCurveX) * 0.05;
  tunnelCurveY += (targetY - tunnelCurveY) * 0.05;
  
  // Influence color on rapid movement
  huePivot = (huePivot + Math.abs(e.movementX) * 0.05) % 360;
});

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  
  // Toggle Direction on Space
  if (e.key === " ") {
    flightDirection *= -1;
    console.log(`Flight Direction reversed: ${flightDirection > 0 ? 'FORWARD' : 'BACKWARD'}`);
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Launch
drawLoop();