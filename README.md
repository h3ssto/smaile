# Smaile 😊

Real-time facial expression recognition mapped to emojis using face-api.js.

[🚀 **Live Demo**](https://h3ssto.github.io/smaile/)

## Features

- Real-time webcam facial detection and expression analysis
- Top 3 emoji matches with confidence scores (>5% threshold)
- 68-point facial landmark tracking with visualization options
- Educational controls for teaching computer vision concepts
- Temporal smoothing (0.5s rolling average) for stable results
- Fully serverless - runs entirely in the browser

## Tech Stack

- Vite - Build tool and dev server
- jQuery - DOM manipulation
- face-api.js - Facial recognition (TensorFlow.js based)
- Vanilla CSS - Styling

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and allow webcam access.

## Educational Controls

Access via burger menu (top-right):

**Visualization Options:**
- **Landmarks** - Display 68 facial keypoints (cyan dots)
- **Contours** - Show facial feature outlines (green lines)
- **Mesh** - Render wireframe connections (white lines)
- **Landmark Density** - Adjust display from 10-100% (visualization only)

**Analysis Tools:**
- **All Expressions** - View confidence bars for all 7 emotions
- **Confidence Threshold** - Filter results (0-50%)
- **Detection Stats** - Real-time FPS and processing time

## How It Works

1. **Face Detection** - TinyFaceDetector identifies faces (416x416 input)
2. **Landmark Extraction** - 68 keypoints mapped to facial features
3. **Expression Analysis** - CNN evaluates 7 emotions (happy, sad, angry, surprised, fearful, disgusted, neutral)
4. **Temporal Smoothing** - 0.5s rolling average reduces jitter
5. **Emoji Mapping** - Top 3 expressions matched to relevant emojis

### Landmark Distribution
- Jawline: 17 points
- Eyebrows: 10 points
- Nose: 9 points
- Eyes: 12 points
- Mouth: 20 points

## Expression to Emoji Mapping

| Expression | Emojis |
|-----------|--------|
| Neutral | 😐 😑 😶 |
| Happy | 😊 😀 😃 |
| Sad | 😢 😞 ☹️ |
| Angry | 😠 😡 💢 |
| Fearful | 😨 😰 😱 |
| Disgusted | 🤢 🤮 😖 |
| Surprised | 😲 😯 😮 |

## Deployment

### GitHub Pages (Automatic)

1. Enable GitHub Pages in repository settings: **Settings → Pages → Source: GitHub Actions**
2. Push to main branch:
```bash
git add .
git commit -m "Deploy"
git push origin main
```
3. Site deploys automatically to `https://<username>.github.io/smaile/`

### Manual Build

```bash
npm run build
```

Deploy the `dist` folder to any static host (Netlify, Vercel, Cloudflare Pages, etc.)

## Browser Requirements

- Modern browser with WebRTC support
- Webcam access
- JavaScript enabled

## License

MIT
