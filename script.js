const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height;
let centerX, centerY;
let particles = [];
let targetCenterX, targetCenterY;

// Configuration
const PARTICLE_COUNT = 800;
const MAX_DEPTH = 1000;
const TUNNEL_RADIUS = 250;
const BASE_SPEED = 2;
const WARP_SPEED_MULTIPLIER = 12;

let currentSpeed = BASE_SPEED;
let targetSpeed = BASE_SPEED;
let tunnelCurveX = 0;
let tunnelCurveY = 0;
let huePivot = 200; // Starting neon blue/cyan

// State track
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  Shift: false
};

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
  targetCenterX = centerX;
  targetCenterY = centerY;
}

window.addEventListener("resize", resize);
resize();

class Particle {
  constructor(isInitial = false) {
    this.init(isInitial);
  }

  init(isInitial = false) {
    // 3D Polar coordinates
    this.r = Math.random() * TUNNEL_RADIUS + 50; 
    this.phi = Math.random() * Math.PI * 2;
    
    // Z depth (0 is viewer, MAX_DEPTH is far end)
    // If isInitial, distribute across Z, else start at the far end
    this.z = isInitial ? Math.random() * MAX_DEPTH : MAX_DEPTH;
    this.prevZ = this.z;

    // Movement noise / spiral
    this.spin = (Math.random() - 0.5) * 0.02;
    this.noise = (Math.random() - 0.5) * 2;

    // Visuals
    this.size = Math.random() * 2 + 0.5;
    this.type = Math.random() > 0.8 ? 'streak' : 'dust';
  }

  update(speed, curveX, curveY) {
    this.prevZ = this.z;
    this.z -= speed;

    // Spiral rotation
    this.phi += this.spin;

    // Reset particle if it passes the viewer
    if (this.z <= 0) {
      this.init(false);
    }
  }

  project(x, y, z) {
    const factor = 600 / z; // Perspective factor
    const px = x * factor + centerX + (tunnelCurveX * (MAX_DEPTH - z) * 0.1);
    const py = y * factor + centerY + (tunnelCurveY * (MAX_DEPTH - z) * 0.1);
    return { px, py, factor };
  }

  draw() {
    // Calculate 3D position
    const x = Math.cos(this.phi) * this.r + this.noise;
    const y = Math.sin(this.phi) * this.r + this.noise;

    const current = this.project(x, y, this.z);
    
    // Don't draw if behind viewer (though init handles this, safety first)
    if (this.z <= 10) return;

    // Color based on huePivot, time, and distance
    const depthAlpha = 1 - (this.z / MAX_DEPTH);
    const hue = (huePivot + (this.z / 5)) % 360;
    const brightness = 50 + (depthAlpha * 30);
    
    ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${depthAlpha})`;
    ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${depthAlpha})`;

    if (this.type === 'streak' || currentSpeed > 10) {
      // Draw motion trail
      const previous = this.project(x, y, this.prevZ);
      ctx.lineWidth = this.size * current.factor * 0.2;
      ctx.beginPath();
      ctx.moveTo(previous.px, previous.py);
      ctx.lineTo(current.px, current.py);
      ctx.stroke();
    } else {
      // Draw point/star
      const s = this.size * current.factor * 0.1;
      ctx.beginPath();
      ctx.arc(current.px, current.py, Math.max(0.1, s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Initialize particles
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle(true));
}

function updateState() {
  // Handle speed targets
  if (keys.Shift) {
    targetSpeed = BASE_SPEED * WARP_SPEED_MULTIPLIER;
  } else if (keys.ArrowUp) {
    targetSpeed = Math.min(60, targetSpeed + 0.5);
  } else if (keys.ArrowDown) {
    targetSpeed = Math.max(1, targetSpeed - 0.5);
  } else {
    // Return to base speed gradually
    targetSpeed = targetSpeed > BASE_SPEED ? targetSpeed - 0.2 : targetSpeed + 0.1;
    if (Math.abs(targetSpeed - BASE_SPEED) < 0.2) targetSpeed = BASE_SPEED;
  }

  // Smooth speed transition
  currentSpeed += (targetSpeed - currentSpeed) * 0.1;

  // Global hue cycle
  huePivot = (huePivot + 0.2) % 360;
}

function draw() {
  updateState();

  // Create hyperspace trail effect via alpha fade
  // Darker fade at high speed for cleaner streaks
  const fadeAlpha = currentSpeed > 15 ? 0.3 : 0.15;
  ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
  ctx.fillRect(0, 0, width, height);

  // Center Glow (Bloom Simulation)
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
  gradient.addColorStop(0, `hsla(${huePivot}, 100%, 20%, 0.1)`);
  gradient.addColorStop(0.5, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sort particles by Z so distant ones are drawn first (painters algorithm)
  // Actually optional for this tunnel effect since Z is clear, but better for visual depth
  particles.sort((a, b) => b.z - a.z);

  particles.forEach(p => {
    p.update(currentSpeed, tunnelCurveX, tunnelCurveY);
    p.draw();
  });

  requestAnimationFrame(draw);
}

// Interactivity
window.addEventListener("mousemove", (e) => {
  // Normalize mouse pos to -1 to 1
  tunnelCurveX = (e.clientX / width - 0.5) * 2;
  tunnelCurveY = (e.clientY / height - 0.5) * 2;

  // Influence hue with mouse X pos
  huePivot = (huePivot + e.movementX * 0.1) % 360;
});

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

draw();