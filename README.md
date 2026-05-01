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
3. Set source to **Deploy from a branch** and select the **main** branch with `/root`.
4. Save and use the generated Pages URL.


## Troubleshooting

- If drawing seems unresponsive, click **Start Test** first to reset the guide and state.
- The app supports mouse, touch, and stylus via Pointer Events; ensure JavaScript is enabled in your browser.


## GitHub Pages showing old content? (Exact fix)

If your site URL still shows the old README-style page (like your screenshot) instead of the tracing canvas, your Pages source is still pointing at older content or an old deployment.

1. Go to **Repo → Settings → Pages**.
2. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
3. Click **Save**.
4. Wait for the Pages deploy to finish in **Actions** (usually 1–3 minutes).
5. Hard refresh your browser on the site URL:
   - Windows/Linux: `Ctrl+Shift+R`
   - macOS: `Cmd+Shift+R`
6. Open these direct URLs to verify the new files are live:
   - `https://<username>.github.io/Line-Tracing-with-Mouse-and-Keyboard/index.html`
   - `https://<username>.github.io/Line-Tracing-with-Mouse-and-Keyboard/script.js`

If those URLs still show old content, the latest commit likely is not on `main` yet. Push/merge the latest commit into `main`, then redeploy from Pages settings.
