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
    <h1 id="trialCounter">Line 1/5</h1>
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
    key: 'line',
    label: 'Line',
    dotColor: '#f2c94c',
    createGuide: createLineGuide
  },
  {
    key: 'loop',
    label: 'Loop',
    dotColor: '#f2c94c',
    createGuide: createLoopGuide
  },
  {
    key: 'boxy',
    label: 'Boxy',
    dotColor: '#ff3333',
    createGuide: createBoxyGuide
  },
  {
    key: 'angular',
    label: 'Angular',
    dotColor: '#bb6bd9',
    createGuide: createAngularGuide
  },
  {
    key: 'underloop',
    label: 'Underloop',
    dotColor: '#0f52ba',
    createGuide: createUnderloopGuide
  },
  {
    key: 'wavy',
    label: 'Wavy',
    dotColor: '#00c853',
    createGuide: createWavyGuide
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

function addArc(points, cx, cy, r, startAngle, endAngle, steps = 60) {
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

function createLineGuide(pointsCount = 500) {
  const y = canvas.height / 2;
  const startX = 120;
  const endX = canvas.width - 80;
  const points = [];

  for (let i = 0; i < pointsCount; i++) {
    const t = i / (pointsCount - 1);
    points.push({
      x: startX + (endX - startX) * t,
      y
    });
  }

  return points;
}

function createLoopGuide() {
  const points = [];

  const loops = 5;
  const startX = 130;
  const centerY = canvas.height / 2;
  const loopWidth = 52;
  const loopHeight = 72;
  const spacing = 115;

  for (let loop = 0; loop < loops; loop++) {
    const cx = startX + loop * spacing + loopWidth / 2;

    if (loop > 0) {
      const prevBottomX = startX + (loop - 1) * spacing + loopWidth / 2;
      const nextBottomX = cx;

      addLineSegment(
        points,
        prevBottomX,
        centerY + loopHeight / 2,
        nextBottomX,
        centerY + loopHeight / 2,
        25
      );
    }

    const steps = 110;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = Math.PI / 2 + t * 2 * Math.PI;

      points.push({
        x: cx + (loopWidth / 2) * Math.cos(angle),
        y: centerY + (loopHeight / 2) * Math.sin(angle)
      });
    }
  }

  return points;
}

function createBoxyGuide() {
  const points = [];
  const startX = 120;
  const topY = canvas.height / 2 - 55;
  const bottomY = canvas.height / 2 + 15;
  const unit = 90;

  let x = startX;
  let y = bottomY;

  addLineSegment(points, x, y, x, topY, 30);
  y = topY;

  for (let i = 0; i < 4; i++) {
    addLineSegment(points, x, y, x + unit, y, 30);
    x += unit;

    addLineSegment(points, x, y, x, bottomY, 24);
    y = bottomY;

    addLineSegment(points, x, y, x + unit, y, 30);
    x += unit;

    addLineSegment(points, x, y, x, topY, 24);
    y = topY;
  }

  addLineSegment(points, x, y, x + unit, y, 30);

  return points;
}

function createAngularGuide() {
  const points = [];
  const startX = 120;
  const midY = canvas.height / 2;
  const topY = midY - 70;
  const bottomY = midY + 70;
  const stepX = 95;

  let x = startX;
  let goingDown = true;

  for (let i = 0; i < 8; i++) {
    const nextX = x + stepX;
    const nextY = goingDown ? bottomY : topY;

    addLineSegment(points, x, goingDown ? topY : bottomY, nextX, nextY, 28);
    x = nextX;
    goingDown = !goingDown;
  }

  return points;
}

function createUnderloopGuide() {
  const points = [];
  const startX = 130;
  const topY = canvas.height / 2 - 40;
  const radius = 42;
  const scallops = 5;
  const diameter = radius * 2;

  for (let i = 0; i < scallops; i++) {
    const cx = startX + i * diameter + radius;
    addArc(points, cx, topY, radius, Math.PI, 2 * Math.PI, 70);
  }

  return points;
}

function createWavyGuide(pointsCount = 700) {
  const points = [];
  const startX = 120;
  const endX = canvas.width - 80;
  const width = endX - startX;
  const midY = canvas.height / 2 + 5;
  const amplitude = 45;
  const cycles = 2.5;

  for (let i = 0; i < pointsCount; i++) {
    const t = i / (pointsCount - 1);
    points.push({
      x: startX + width * t,
      y: midY + amplitude * Math.sin(t * cycles * 2 * Math.PI + Math.PI)
    });
  }

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
    <textarea id="resultsText" rows="20" style="width: 100%; box-sizing: border-box;" readonly>${tsv}</textarea>
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
