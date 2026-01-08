# Smaile 😊

A serverless webapp that uses facial recognition to match your expression with emojis in real-time!

[🚀 **Live Demo**](https://h3ssto.github.io/smaile/)

## Features

- 📹 Live webcam feed
- 🎭 Real-time facial expression detection
- 😊 Top 3 emoji matches with confidence scores (>5%)
- 🎯 Facial landmark overlay on video (68 landmarks)
- 📱 Responsive design
- 🎛️ Educational controls (burger menu):
  - Toggle between landmarks (points) and facial contours (lines)
  - Adjust landmark density (10%-100%) to demonstrate impact
  - Perfect for teaching facial recognition concepts

## Tech Stack

- **Vite** - Fast build tool and dev server
- **jQuery** - DOM manipulation
- **face-api.js** - Facial recognition and expression detection
- **CSS3** - Modern styling

## Setup & Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser to `http://localhost:5173`

4. Allow webcam access when prompted

## How It Works

The app uses face-api.js to:
1. Detect faces in the webcam feed (using TinyFaceDetector with 416x416 input size)
2. Identify **68 facial landmarks** positioned at key points:
   - Jawline: 17 points
   - Eyebrows: 10 points (5 per eyebrow)
   - Nose: 9 points
   - Eyes: 12 points (6 per eye)
   - Mouth: 20 points (outer and inner contours)
3. Analyze facial expressions (happy, sad, angry, surprised, fearful, disgusted, neutral)
4. Apply temporal smoothing (0.5s rolling average) to reduce jitter
5. Map expressions to emojis with confidence scores
6. Display the top 3 matches with >5% confidence
7. Overlay landmarks/contours on the video feed based on settings

## Expression to Emoji Mapping

- **Neutral**: 😐 😑 😶
- **Happy**: 😊 😀 😃
- **Sad**: 😢 😞 ☹️
- **Angry**: 😠 😡 💢
- **Fearful**: 😨 😰 😱
- **Disgusted**: 🤢 🤮 😖
- **Surprised**: 😲 😯 😮

## Build for Production

```bash
npm run build
```

Deploy the `dist` folder to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages:

1. **First-time setup:**
   - Go to your GitHub repository settings
   - Navigate to **Pages** section
   - Under "Build and deployment", select **Source: GitHub Actions**

2. **Deploy:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Automatic deployment:**
   - Every push to the `main` branch triggers automatic build and deployment
   - Your site will be available at `https://<username>.github.io/smaile/`
   - Check the **Actions** tab to monitor deployment progress

## Browser Requirements

- Modern browser with WebRTC support
- Webcam access
- JavaScript enabled

## Educational Features

Use the burger menu (top-right) to:
- **Toggle Landmarks**: Show/hide the 68 individual landmark points (red dots)
- **Toggle Contours**: Show/hide facial contour lines (green lines) connecting landmarks
- **Adjust Density**: Control how many landmarks are displayed (10%-100%)
  - 100% = All 68 landmarks visible
  - 50% = Every other landmark (34 points)
  - 10% = Every 10th landmark (7 points)
  
This helps demonstrate how landmark density affects facial tracking accuracy and is perfect for educational presentations about computer vision.

## License

MIT
