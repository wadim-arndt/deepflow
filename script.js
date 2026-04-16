const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

let angle = 0;
let speed = 0.01;

function draw() {
  // leichter Fade (Trail Effekt)
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < 200; i++) {
    const t = i * 0.1 + angle;

    const radius = i * 2;

    const x = centerX + Math.cos(t) * radius;
    const y = centerY + Math.sin(t) * radius;

    const hue = (i * 2 + angle * 50) % 360;

    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  angle += speed;

  requestAnimationFrame(draw);
}

draw();

// Controls
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") speed += 0.005;
  if (e.key === "ArrowDown") speed = Math.max(0.001, speed - 0.005);
});