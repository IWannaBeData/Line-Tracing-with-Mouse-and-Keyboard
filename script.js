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

let currentTrial = 1;
let totalTrials = 5;
let trialResults = [];
let testFinished = false;

// Visual/scoring settings
const GUIDE_LINE_WIDTH = 1;
const TRACE_LINE_WIDTH = 1;
const CURSOR_RADIUS = 2;
const ACCURACY_TOLERANCE_PX = 18;
const COVERAGE_THRESHOLD_PX = 8;

const app = document.querySelector('.app');
const header = document.querySelector('header');
const controls = document.querySelector('.controls');
const stats = document.querySelector('.stats');
const notes = document.querySelector('.notes');

if (controls) controls.style.display = 'none';
if (stats) stats.style.display = 'none';
if (notes) notes.style.display = 'none';

const trialStatus = document.createElement('div');
trialStatus.id = 'trialStatus';

const finalResults = document.createElement('section');
finalResults.id = 'finalResults';
finalResults.style.display = 'none';

if (header) {
  header.innerHTML = `
    <h1 id="trialCounter">Trial 1/5</h1>
    <p>The test will start when you start tracing.</p>
    <p>Take as long as you need. This is a measure of accuracy.</p>
  `;
  header.appendChild(trialStatus);
}

if (app) {
  app.appendChild(finalResults);
}

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

  if (dotted) ctx.setLineDash([2, 8]);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawCursor() {
  if (!cursor || testFinished) return;

  ctx.save();
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, CURSOR_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!testFinished) {
    drawPath(guide, '#8f8f8f', GUIDE_LINE_WIDTH, true);

    if (trace.length > 1) {
      drawPath(trace, '#ff5a36', TRACE_LINE_WIDTH);
    }

    drawCursor();
  }
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

function calculateAccuracy() {
  if (trace.length < 2) return 0;

  const meanDist =
    trace.reduce((sum, p) => sum + nearestDistance(p, guide), 0) / trace.length;

  const accuracy = Math.max(
    0,
    100 - (meanDist / ACCURACY_TOLERANCE_PX) * 100
  );

  return accuracy;
}

function updateHiddenMetrics() {
  if (trace.length < 2) return;

  const accuracy = calculateAccuracy();

  const covered =
    guide.filter(g => nearestDistance(g, trace) < COVERAGE_THRESHOLD_PX).length /
    guide.length;

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

function updateTrialCounter() {
  const trialCounter = document.getElementById('trialCounter');

  if (trialCounter) {
    trialCounter.textContent = `Trial ${currentTrial}/${totalTrials}`;
  }

  trialStatus.textContent = '';
}

function prepareTrial() {
  guide = createStraightGuide();
  trace = [];
  drawing = false;
  cursor = null;
  testFinished = false;

  resetTimer();
  updateTrialCounter();
  queueRender();
}

function finishTrial() {
  const accuracy = calculateAccuracy();
  const timeSeconds = elapsedMs / 1000;

  trialResults.push({
    trial: currentTrial,
    accuracy,
    timeSeconds
  });

  trace = [];
  cursor = null;
  queueRender();

  if (currentTrial >= totalTrials) {
    finishTest();
    return;
  }

  currentTrial += 1;
  trialStatus.textContent = 'Next line starting...';

  setTimeout(() => {
    prepareTrial();
  }, 700);
}

function finishTest() {
  testFinished = true;
  drawing = false;
  trace = [];
  guide = [];
  cursor = null;

  stopTimer();
  queueRender();

  const trialCounter = document.getElementById('trialCounter');

  if (trialCounter) {
    trialCounter.textContent = 'Test complete';
  }

  trialStatus.textContent = '';

  finalResults.style.display = 'block';

  finalResults.innerHTML = `
    <h2>Results</h2>
    <ol>
      ${trialResults
        .map(
          result =>
            `<li>Trial ${result.trial}: ${result.accuracy.toFixed(1)}% accuracy, ${result.timeSeconds.toFixed(2)}s</li>`
        )
        .join('')}
    </ol>
    <button id="restartTestBtn">Restart Test</button>
  `;

  const restartTestBtn = document.getElementById('restartTestBtn');

  restartTestBtn.addEventListener('click', () => {
    resetFullTest();
  });
}

function resetFullTest() {
  currentTrial = 1;
  trialResults = [];
  testFinished = false;

  finalResults.style.display = 'none';
  finalResults.innerHTML = '';

  prepareTrial();
}

canvas.addEventListener('pointerdown', e => {
  if (testFinished) return;

  drawing = true;
  canvas.setPointerCapture(e.pointerId);

  const p = pointerPos(e);

  trace = [p];
  cursor = p;

  startTimer();
  queueRender();
});

canvas.addEventListener('pointermove', e => {
  if (testFinished) return;

  cursor = pointerPos(e);

  if (drawing) {
    trace.push(cursor);
    updateHiddenMetrics();
  }

  queueRender();
});

function endStroke(e) {
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }

  if (!drawing || testFinished) return;

  drawing = false;

  stopTimer();
  updateHiddenMetrics();
  finishTrial();
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

canvas.addEventListener('pointerleave', () => {
  if (!drawing) {
    cursor = null;
    queueRender();
  }
});

if (startBtn) {
  startBtn.addEventListener('click', resetFullTest);
}

if (clearBtn) {
  clearBtn.addEventListener('click', resetFullTest);
}

resetFullTest();
