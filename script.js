const canvas = document.getElementById('traceCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');

const accuracyEl = document.getElementById('accuracy');
const timeTakenEl = document.getElementById('timeTaken');
const progressEl = document.getElementById('progress');

let guide = [];
let trace = [];
let drawing = false;
let cursor = null;
let rafId = null;

let timerStart = 0;
let timerRunning = false;
let timerRafId = null;
let elapsedMs = 0;

function createStraightGuide(points = 600) {
  const y = canvas.height / 2;
  const startX = 80;
  const endX = canvas.width - 80;

  return Array.from({ length: points }, (_, i) => ({
    x: startX + ((endX - startX) * i) / (points - 1),
    y
  }));
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

function drawPath(points, style, width, dotted = false) {
  if (!points.length) return;

  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (dotted) ctx.setLineDash([2, 10]);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawCursor() {
  if (!cursor) return;

  ctx.save();
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPath(guide, '#8f8f8f', 4, true);

  if (trace.length > 1) {
    drawPath(trace, '#ff5a36', 4);
  }

  drawCursor();
}

function queueRender() {
  if (rafId !== null) return;

  rafId = requestAnimationFrame(() => {
    rafId = null;
    render();
  });
}

function setTimeDisplay(ms) {
  timeTakenEl.textContent = `${(ms / 1000).toFixed(2)}s`;
}

function tickTimer(now) {
  if (!timerRunning) return;

  elapsedMs = now - timerStart;
  setTimeDisplay(elapsedMs);

  timerRafId = requestAnimationFrame(tickTimer);
}

function startTimer() {
  stopTimer();

  elapsedMs = 0;
  timerStart = performance.now();
  timerRunning = true;

  setTimeDisplay(0);

  timerRafId = requestAnimationFrame(tickTimer);
}

function stopTimer() {
  if (timerRafId !== null) {
    cancelAnimationFrame(timerRafId);
    timerRafId = null;
  }

  if (timerRunning) {
    elapsedMs = performance.now() - timerStart;
    setTimeDisplay(elapsedMs);
  }

  timerRunning = false;
}

function resetTimer() {
  stopTimer();

  timerStart = 0;
  elapsedMs = 0;

  setTimeDisplay(0);
}

function resetMetrics() {
  accuracyEl.textContent = '0%';
  progressEl.textContent = '0%';

  resetTimer();
}

function updateMetrics() {
  if (trace.length < 2) return;

  const meanDist =
    trace.reduce((sum, p) => sum + nearestDistance(p, guide), 0) / trace.length;

  const accuracy = Math.max(0, 100 - (meanDist / 35) * 100);

  const covered =
    guide.filter(g => nearestDistance(g, trace) < 14).length / guide.length;

  accuracyEl.textContent = `${accuracy.toFixed(1)}%`;
  progressEl.textContent = `${(covered * 100).toFixed(1)}%`;
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
  cursor = p;

  accuracyEl.textContent = '0%';
  progressEl.textContent = '0%';

  startTimer();
  queueRender();
});

canvas.addEventListener('pointermove', e => {
  cursor = pointerPos(e);

  if (drawing) {
    trace.push(cursor);
    updateMetrics();
  }

  queueRender();
});

function endStroke(e) {
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }

  if (!drawing) return;

  drawing = false;

  stopTimer();
  updateMetrics();
  queueRender();
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

canvas.addEventListener('pointerleave', () => {
  if (!drawing) {
    cursor = null;
    queueRender();
  }
});

function resetTest() {
  guide = createStraightGuide();
  trace = [];
  drawing = false;
  cursor = null;

  resetMetrics();
  queueRender();
}

startBtn.addEventListener('click', resetTest);
clearBtn.addEventListener('click', resetTest);

resetTest();
