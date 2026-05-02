const canvas = document.getElementById('traceCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');

const accuracyEl = document.getElementById('accuracy');
const timeTakenEl = document.getElementById('timeTaken');
const progressEl = document.getElementById('progress');

// Make the canvas larger
canvas.width = 1400;
canvas.height = 700;

let guide = [];
let trace = [];
let drawing = false;
let cursor = null;
let rafId = null;

let timerStart = 0;
let timerRunning = false;
let timerRafId = null;
let elapsedMs = 0;

const ATTEMPTS_PER_SHAPE = 5;

const GUIDE_LINE_WIDTH = 1;
const TRACE_LINE_WIDTH = 1;
const CURSOR_RADIUS = 2;
const START_DOT_RADIUS = 8;

const ACCURACY_TOLERANCE_PX = 12;
const ACCURACY_PENALTY_MULTIPLIER = 1.5;
const COVERAGE_THRESHOLD_PX = 6;

let currentShapeIndex = 0;
let currentAttempt = 1;
let results = [];
let testFinished = false;

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
trialStatus.style.marginTop = '8px';

const finalResults = document.createElement('section');
finalResults.id = 'finalResults';
finalResults.style.display = 'none';
finalResults.style.marginTop = '20px';

if (header) {
  header.innerHTML = `
    <h1 id="trialCounter">LCircle 1/5</h1>
    <p>The test will start when you start tracing.</p>
    <p>Take as long as you need. This is a measure of accuracy.</p>
  `;
  header.appendChild(trialStatus);
}

if (app) {
  app.appendChild(finalResults);
}

const SHAPES = [
  {
    key: 'LCircle',
    label: 'LCircle',
    dotColor: '#f2c94c',
    createGuide: () => createCircleGuide(220)
  },
  {
    key: 'sCircle',
    label: 'sCircle',
    dotColor: '#ffb300',
    createGuide: () => createCircleGuide(110)
  },
  {
    key: 'LSqaure',
    label: 'LSqaure',
    dotColor: '#ff3333',
    createGuide: () => createSquareGuide(360)
  },
  {
    key: 'sSquare',
    label: 'sSquare',
    dotColor: '#ff7777',
    createGuide: () => createSquareGuide(200)
  },
  {
    key: 'LTriangle',
    label: 'LTriangle',
    dotColor: '#bb6bd9',
    createGuide: () => createTriangleGuide(430)
  },
  {
    key: 'LHexagon',
    label: 'LHexagon',
    dotColor: '#0f52ba',
    createGuide: () => createHexagonGuide(220)
  }
];

function currentShape() {
  return SHAPES[currentShapeIndex];
}

function formatResultName(shapeKey, attempt) {
  return `${shapeKey} ${attempt}`;
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

function addLineSegment(points, x1, y1, x2, y2, steps = 40) {
  const startIndex = points.length ? 1 : 0;

  for (let i = startIndex; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    });
  }
}

function addArc(points, cx, cy, r, startAngle, endAngle, steps = 120) {
  const startIndex = points.length ? 1 : 0;

  for (let i = startIndex; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
}

function addPolygon(points, vertices, stepsPerSide = 50) {
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    addLineSegment(points, a.x, a.y, b.x, b.y, stepsPerSide);
  }
}

function createCircleGuide(radius, pointCount = 500) {
  const points = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 20;

  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const angle = -Math.PI / 2 + t * 2 * Math.PI;

    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }

  return points;
}

function createSquareGuide(size) {
  const points = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 20;
  const half = size / 2;

  const vertices = [
    { x: cx - half, y: cy - half },
    { x: cx + half, y: cy - half },
    { x: cx + half, y: cy + half },
    { x: cx - half, y: cy + half }
  ];

  addPolygon(points, vertices, 70);
  return points;
}

function createTriangleGuide(size) {
  const points = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 25;
  const height = size * Math.sqrt(3) / 2;

  const vertices = [
    { x: cx, y: cy - (2 / 3) * height },
    { x: cx + size / 2, y: cy + (1 / 3) * height },
    { x: cx - size / 2, y: cy + (1 / 3) * height }
  ];

  addPolygon(points, vertices, 80);
  return points;
}

function createHexagonGuide(radius) {
  const points = [];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 20;
  const vertices = [];

  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / 6);
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }

  addPolygon(points, vertices, 60);
  return points;
}

function drawPath(points, style, width, dotted = false) {
  if (!points.length) return;

  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (dotted) {
    ctx.setLineDash([4, 6]);
  }

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

function drawStartDot() {
  const shape = currentShape();
  if (!guide.length || !shape || testFinished) return;

  const first = guide[0];

  ctx.save();
  ctx.fillStyle = shape.dotColor;
  ctx.beginPath();
  ctx.arc(first.x, first.y, START_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!testFinished) {
    drawPath(guide, '#111111', GUIDE_LINE_WIDTH, true);

    if (trace.length > 1) {
      drawPath(trace, '#ff5a36', TRACE_LINE_WIDTH);
    }

    drawStartDot();
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
  if (timeTakenEl) {
    timeTakenEl.textContent = `${(ms / 1000).toFixed(2)}s`;
  }
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
  if (trace.length < 2 || guide.length < 2) return 0;

  const meanDist =
    trace.reduce((sum, p) => sum + nearestDistance(p, guide), 0) / trace.length;

  const adjustedError = meanDist * ACCURACY_PENALTY_MULTIPLIER;

  return Math.max(0, 100 - (adjustedError / ACCURACY_TOLERANCE_PX) * 100);
}

function updateHiddenMetrics() {
  if (trace.length < 2 || guide.length < 2) return;

  const accuracy = calculateAccuracy();

  const covered =
    guide.filter(g => nearestDistance(g, trace) < COVERAGE_THRESHOLD_PX).length /
    guide.length;

  if (accuracyEl) {
    accuracyEl.textContent = `${accuracy.toFixed(1)}%`;
  }

  if (progressEl) {
    progressEl.textContent = `${(covered * 100).toFixed(1)}%`;
  }
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height
  };
}

function updateHeader() {
  const shape = currentShape();
  const trialCounter = document.getElementById('trialCounter');

  if (trialCounter && shape) {
    trialCounter.textContent = `${shape.label} ${currentAttempt}/${ATTEMPTS_PER_SHAPE}`;
  }

  trialStatus.textContent = '';
}

function prepareAttempt() {
  const shape = currentShape();

  if (!shape) return;

  guide = shape.createGuide();
  trace = [];
  drawing = false;
  cursor = null;
  testFinished = false;

  resetTimer();
  updateHeader();
  queueRender();
}

function advanceToNextAttempt() {
  if (currentAttempt < ATTEMPTS_PER_SHAPE) {
    currentAttempt += 1;
    prepareAttempt();
    return;
  }

  if (currentShapeIndex < SHAPES.length - 1) {
    currentShapeIndex += 1;
    currentAttempt = 1;
    prepareAttempt();
    return;
  }

  finishTest();
}

function finishAttempt() {
  const shape = currentShape();
  const accuracy = calculateAccuracy();
  const timeSeconds = elapsedMs / 1000;
  const resultName = formatResultName(shape.key, currentAttempt);

  results.push({
    name: resultName,
    accuracy,
    timeSeconds
  });

  trace = [];
  cursor = null;
  queueRender();

  if (
    currentAttempt === ATTEMPTS_PER_SHAPE &&
    currentShapeIndex < SHAPES.length - 1
  ) {
    const nextShape = SHAPES[currentShapeIndex + 1];
    trialStatus.textContent = `Next: ${nextShape.label} 1/${ATTEMPTS_PER_SHAPE}`;
  } else if (currentAttempt < ATTEMPTS_PER_SHAPE) {
    trialStatus.textContent = `Next: ${shape.label} ${currentAttempt + 1}/${ATTEMPTS_PER_SHAPE}`;
  }

  setTimeout(() => {
    advanceToNextAttempt();
  }, 700);
}

function buildResultsTSV() {
  const lines = ['name\taccuracy_percent\ttime_seconds'];

  results.forEach(result => {
    lines.push(
      `${result.name}\t${result.accuracy.toFixed(1)}\t${result.timeSeconds.toFixed(2)}`
    );
  });

  return lines.join('\n');
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
    trialCounter.textContent = 'All tests complete';
  }

  trialStatus.textContent = '';

  const tsv = buildResultsTSV();

  finalResults.style.display = 'block';
  finalResults.innerHTML = `
    <h2>Results</h2>
    <p>Copy and paste this directly into Excel:</p>
    <textarea id="resultsText" rows="24" style="width: 100%; box-sizing: border-box;" readonly>${tsv}</textarea>
    <div style="margin-top: 12px;">
      <button id="copyResultsBtn">Copy Results</button>
      <button id="restartTestBtn">Restart Test</button>
    </div>
  `;

  const copyResultsBtn = document.getElementById('copyResultsBtn');
  const restartTestBtn = document.getElementById('restartTestBtn');
  const resultsText = document.getElementById('resultsText');

  copyResultsBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(tsv);
      copyResultsBtn.textContent = 'Copied!';

      setTimeout(() => {
        copyResultsBtn.textContent = 'Copy Results';
      }, 1200);
    } catch (err) {
      resultsText.select();
    }
  });

  restartTestBtn.addEventListener('click', () => {
    resetFullTest();
  });
}

function resetFullTest() {
  currentShapeIndex = 0;
  currentAttempt = 1;
  results = [];
  testFinished = false;

  finalResults.style.display = 'none';
  finalResults.innerHTML = '';

  prepareAttempt();
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
  finishAttempt();
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
