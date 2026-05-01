# Line Tracing with Mouse and Keyboard

A browser-based tracing benchmark that measures mouse control while following guide shapes.

## Features

- Multiple trace templates (sine wave, square wave, loops, zig-zag).
- Live metrics:
  - **Accuracy** (distance to target path).
  - **Smoothness** (jitter / direction-change penalty).
  - **Time-to-finish**.
  - **Progress** (% of path covered).
- Simple static site, ready for GitHub Pages.

## Run locally

Open `index.html` directly, or use a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default branch), folder `/root`
4. Save and wait for the Pages URL.

## Notes on scoring

- Accuracy is normalized so closer traces score higher.
- Smoothness penalizes frequent angle changes between consecutive movement segments.
- Time starts on first pointer-down and updates while tracing.

You can tune scoring thresholds in `script.js` to calibrate difficulty.
