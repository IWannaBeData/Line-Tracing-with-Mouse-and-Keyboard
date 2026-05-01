# Line Tracing with Mouse and Keyboard

A browser-based tracing benchmark focused on one task: tracing a **straight grey dotted line** as accurately as possible.

## What the page shows

- Instruction text: **"Trace the line as accurately as possible."**
- A drawing canvas with a horizontal grey dotted guide line.
- A red cursor indicator on the canvas.
- Live metrics for:
  - **Accuracy**
  - **Progress**
  - **Time**

## Accuracy documentation

Accuracy is calculated as follows:

1. While drawing, the app samples points from your red stroke.
2. For each sampled stroke point, it finds the nearest point on the grey guide line.
3. It computes the mean of those nearest-point distances.
4. It maps that mean distance to a percentage score from `0` to `100`:

```text
accuracy = max(0, 100 - (mean_distance / 35) * 100)
```

Lower average distance error yields a higher accuracy score.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Set source to **Deploy from a branch** and select your default branch with `/root`.
4. Save and use the generated Pages URL.
