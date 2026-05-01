const canvas = document.getElementById('traceCanvas');
const ctx = canvas.getContext('2d');
const shapeSelect = document.getElementById('shapeSelect');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');

const accuracyEl = document.getElementById('accuracy');
const smoothnessEl = document.getElementById('smoothness');
const timeTakenEl = document.getElementById('timeTaken');
const progressEl = document.getElementById('progress');

const SHAPES = [
  { name: 'Sine Wave', sample: t => ({ x: 80 + 840 * t, y: 300 + 110 * Math.sin(2 * Math.PI * 3 * t) }) },
  { name: 'Square Wave', sample: t => {
      const x = 80 + 840 * t;
      const sections = 8;
      const idx = Math.floor(t * sections);
      return { x, y: idx % 2 === 0 ? 220 : 380 };
    }
  },
  { name: 'Loop Curls', sample: t => {
      const angle = t * Math.PI * 10;
      return { x: 100 + 80 * angle / Math.PI, y: 300 + 95 * Math.sin(angle) * Math.cos(angle / 2) };
    }
  },
  { name: 'Triangle Zig-Zag', sample: t => {
      const x = 80 + 840 * t;
      const wave = 2 * Math.abs(2 * ((t * 4) % 1) - 1) - 1;
      return { x, y: 300 + wave * 130 };
    }
  }
];

let guide = [];
let trace = [];
let drawing = false;
let startedAt = 0;

function sampleShape(shape, points = 700) {
  return Array.from({ length: points }, (_, i) => shape.sample(i / (points - 1)));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestDistance(point, arr) {
  let best = Infinity;
  for (const p of arr) {
    const d = dist(point, p);
    if (d < best) best = d;
  }
  return best;
}

function drawPath(points, style, width, dashed = false) {
  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dashed) ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPath(guide, '#4f5968', 5, true);
  if (trace.length > 1) drawPath(trace, '#ff5a36', 4);
}

function resetMetrics() {
  accuracyEl.textContent = '0%';
  smoothnessEl.textContent = '0%';
  timeTakenEl.textContent = '0.00s';
  progressEl.textContent = '0%';
}

function updateMetrics() {
  if (trace.length < 5) return;

  const meanDist = trace.reduce((sum, p) => sum + nearestDistance(p, guide), 0) / trace.length;
  const accuracy = Math.max(0, 100 - (meanDist / 55) * 100);

  let jerk = 0;
  for (let i = 2; i < trace.length; i++) {
    const a = trace[i - 2], b = trace[i - 1], c = trace[i];
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const mag1 = Math.hypot(v1.x, v1.y) || 1;
    const mag2 = Math.hypot(v2.x, v2.y) || 1;
    const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
    jerk += Math.acos(Math.max(-1, Math.min(1, dot)));
  }
  const avgJerk = jerk / Math.max(1, trace.length - 2);
  const smoothness = Math.max(0, 100 - (avgJerk / Math.PI) * 130);

  const covered = guide.filter(g => nearestDistance(g, trace) < 20).length / guide.length;
  const progress = covered * 100;

  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;

  accuracyEl.textContent = `${accuracy.toFixed(1)}%`;
  smoothnessEl.textContent = `${smoothness.toFixed(1)}%`;
  progressEl.textContent = `${progress.toFixed(1)}%`;
  timeTakenEl.textContent = `${elapsed.toFixed(2)}s`;
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height
  };
}

canvas.addEventListener('pointerdown', e => {
  drawing = true;
  canvas.setPointerCapture(e.pointerId);
  const p = pointerPos(e);
  trace = [p];
  startedAt = performance.now();
  render();
  updateMetrics();
});

canvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  trace.push(pointerPos(e));
  render();
  updateMetrics();
});

canvas.addEventListener('pointerup', () => {
  drawing = false;
  updateMetrics();
});

function loadShape(i) {
  guide = sampleShape(SHAPES[i]);
  trace = [];
  startedAt = 0;
  resetMetrics();
  render();
}

SHAPES.forEach((s, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = s.name;
  shapeSelect.appendChild(opt);
});

startBtn.addEventListener('click', () => loadShape(Number(shapeSelect.value)));
clearBtn.addEventListener('click', () => {
  trace = [];
  startedAt = 0;
  resetMetrics();
  render();
});
shapeSelect.addEventListener('change', () => loadShape(Number(shapeSelect.value)));

loadShape(0);
