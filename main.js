import * as faceapi from 'face-api.js';

// Expression to Emoji mapping
const expressionEmojiMap = {
    neutral: ['😐', '😑', '😶'],
    happy: ['😊', '😀', '😃'],
    sad: ['😢', '😞', '☹️'],
    angry: ['😠', '😡', '💢'],
    fearful: ['😨', '😰', '😱'],
    disgusted: ['🤢', '🤮', '😖'],
    surprised: ['😲', '😯', '😮']
};

let video, canvas, displaySize;
let modelsLoaded = false;
let lastTopExpressions = [];
const EXPRESSION_CHANGE_THRESHOLD = 0.15; // 15% change needed to swap emojis

// Mobile optimization - declare early
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const SMOOTHING_WINDOW = isMobile ? 300 : 500; // Shorter window on mobile for faster response
let expressionBuffer = [];

// Settings
let showLandmarks = true;
let showContours = false;
let showMesh = false;
let landmarkDensity = 100; // percentage

// Educational settings
let showAllExpressions = false;
let confidenceThreshold = 0.05; // 5%
let showStats = false;
let frameCount = 0;
let lastFpsUpdate = Date.now();
let fps = 0;

// Mobile-specific model options - smaller = faster
const mobileDetectorOptions = {
    inputSize: 128, // Much smaller input for mobile (128 vs 416) = ~10x faster
    scoreThreshold: 0.7 // Higher threshold compensates for smaller input
};

const desktopDetectorOptions = {
    inputSize: 416,
    scoreThreshold: 0.5
};

// Initialize the application
async function init() {
    try {
        console.log('Loading face detection models...');
        
        // Get the base URL for models (works both locally and on GitHub Pages)
        const baseUrl = import.meta.env.BASE_URL || '/';
        const modelsPath = `${baseUrl}models`;
        
        console.log('Loading models from:', modelsPath);
        
        // Load face-api.js models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
            faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
        ]);
        
        modelsLoaded = true;
        console.log('Models loaded! Starting webcam...');
        
        // Start webcam
        await startVideo();
        
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Start video stream
async function startVideo() {
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    
    try {
        // Optimize camera resolution for mobile
        const videoConstraints = isMobile ? {
            width: { ideal: 480 },
            height: { ideal: 360 },
            facingMode: 'user'
        } : {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints
        });
        
        video.srcObject = stream;
        
        video.addEventListener('loadedmetadata', () => {
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Enable hardware acceleration hints
            const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
            
            displaySize = { 
                width: video.videoWidth, 
                height: video.videoHeight 
            };
            
            console.log('Webcam ready! Detecting faces...');
            
            // Start detection loop
            detectFaces();
        });
        
    } catch (error) {
        console.error('Webcam error:', error);
        alert('Error accessing webcam: ' + error.message);
    }
}

// Main face detection loop
async function detectFaces() {
    if (!modelsLoaded) return;
    
    const startTime = performance.now();
    const ctx = canvas.getContext('2d');
    
    // Use mobile-optimized settings
    const detectorOptions = isMobile ? mobileDetectorOptions : desktopDetectorOptions;
    
    // Detect faces with landmarks and expressions - use more lenient settings
    const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions(detectorOptions))
        .withFaceLandmarks()
        .withFaceExpressions();
    
    const detectionTime = performance.now() - startTime;
    
    // Update stats
    if (showStats) {
        updateStats(detectionTime);
    } else {
        $('#stats-overlay').hide();
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (detections && detections.length > 0) {
        // Resize detection results to match display size
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Draw facial features (optimized for both mobile and desktop)
        if (showLandmarks || showContours || showMesh) {
            drawFacialFeatures(canvas, resizedDetections[0]);
        }
        
        // Get the first face's expressions and add to buffer
        const expressions = detections[0].expressions;
        addToExpressionBuffer(expressions);
        
        // Get smoothed expressions (if buffer has data)
        if (expressionBuffer.length > 0) {
            const smoothedExpressions = getSmoothedExpressions();
            displayEmojis(smoothedExpressions);
        }
        
    } else {
        // No face detected - but keep showing last known expressions if buffer not empty
        if (expressionBuffer.length === 0) {
            $('#emoji-display').html(`
                <div class="emoji-item">
                    <span class="emoji-icon">🤔</span>
                    <span class="emoji-confidence">No face detected</span>
                </div>
            `);
        }
        // Clear buffer after 1 second of no detection
        if (expressionBuffer.length > 0) {
            const now = Date.now();
            const oldestEntry = expressionBuffer[0];
            if (now - oldestEntry.timestamp > 1000) {
                expressionBuffer = [];
            }
        }
    }
    
    // Continue detection loop
    requestAnimationFrame(detectFaces);
}

// Add expression data to buffer with timestamp
function addToExpressionBuffer(expressions) {
    const now = Date.now();
    expressionBuffer.push({ expressions, timestamp: now });
    
    // Remove old entries outside the smoothing window
    expressionBuffer = expressionBuffer.filter(
        entry => now - entry.timestamp <= SMOOTHING_WINDOW
    );
}

// Calculate average expressions over the buffer window
function getSmoothedExpressions() {
    if (expressionBuffer.length === 0) {
        return {};
    }
    
    // Initialize sums
    const sums = {
        neutral: 0,
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0
    };
    
    // Sum all expression values
    expressionBuffer.forEach(({ expressions }) => {
        Object.keys(sums).forEach(key => {
            sums[key] += expressions[key] || 0;
        });
    });
    
    // Calculate averages
    const count = expressionBuffer.length;
    const averages = {};
    Object.keys(sums).forEach(key => {
        averages[key] = sums[key] / count;
    });
    
    return averages;
}

// Update detection statistics
function updateStats(detectionTime) {
    frameCount++;
    const now = Date.now();
    
    if (now - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
    }
    
    const statsHtml = `
        FPS: ${fps}<br>
        Detection: ${detectionTime.toFixed(1)}ms
    `;
    
    $('#stats-overlay').html(statsHtml).show();
}

// Display top 3 emojis based on expression confidence
function displayEmojis(expressions) {
    if (showAllExpressions) {
        displayAllExpressions(expressions);
        return;
    }
    
    // Convert expressions object to array and sort by confidence
    const sortedExpressions = Object.entries(expressions)
        .map(([expression, confidence]) => ({ expression, confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .filter(item => item.confidence > confidenceThreshold);
    
    // Take top 3
    const topExpressions = sortedExpressions.slice(0, 3);
    
    if (topExpressions.length === 0) {
        $('#emoji-display').html(`
            <div class="emoji-item">
                <span class="emoji-icon">😶</span>
                <span class="emoji-confidence">No strong expression</span>
            </div>
        `);
        lastTopExpressions = [];
        return;
    }
    
    // Check if we should update emojis (significant change detected)
    const shouldUpdateEmojis = shouldUpdateEmojiDisplay(topExpressions);
    
    if (shouldUpdateEmojis) {
        // Significant change - update emojis
        lastTopExpressions = topExpressions.map(e => ({...e}));
        buildEmojiDisplay(topExpressions);
    } else {
        // Minor change - only update confidence values
        updateConfidenceOnly(topExpressions);
    }
}

// Check if emoji display should be updated (significant expression change)
function shouldUpdateEmojiDisplay(newExpressions) {
    if (lastTopExpressions.length === 0) return true;
    
    // Check if top expressions have changed significantly
    for (let i = 0; i < Math.min(3, newExpressions.length); i++) {
        const oldExpr = lastTopExpressions[i];
        const newExpr = newExpressions[i];
        
        if (!oldExpr) return true;
        
        // If expression type changed or confidence changed dramatically
        if (oldExpr.expression !== newExpr.expression) {
            // Check if the new expression has significantly higher confidence
            const confidenceDiff = Math.abs(newExpr.confidence - oldExpr.confidence);
            if (confidenceDiff > EXPRESSION_CHANGE_THRESHOLD) {
                return true;
            }
        }
    }
    
    return false;
}

// Build complete emoji display HTML
function buildEmojiDisplay(topExpressions) {
    let html = '';
    topExpressions.forEach(({ expression, confidence }) => {
        const emojis = expressionEmojiMap[expression] || ['😐'];
        const emoji = emojis[0];
        const percentage = (confidence * 100).toFixed(1);
        
        html += `
            <div class="emoji-item" data-expression="${expression}">
                <span class="emoji-icon">${emoji}</span>
                <span class="emoji-confidence">${percentage}%</span>
                <span class="emoji-label">${expression}</span>
            </div>
        `;
    });
    
    $('#emoji-display').html(html);
}

// Display all expressions with bar chart
function displayAllExpressions(expressions) {
    const sortedExpressions = Object.entries(expressions)
        .map(([expression, confidence]) => ({ expression, confidence }))
        .sort((a, b) => b.confidence - a.confidence);
    
    let html = '<div class="expression-bars"><h3>All Expressions</h3>';
    
    sortedExpressions.forEach(({ expression, confidence }) => {
        const percentage = (confidence * 100).toFixed(1);
        const emoji = expressionEmojiMap[expression]?.[0] || '😐';
        
        html += `
            <div class="expression-bar">
                <div class="expression-bar-label">
                    <span>${emoji} ${expression}</span>
                    <span>${percentage}%</span>
                </div>
                <div class="expression-bar-fill">
                    <div class="expression-bar-value" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    $('#emoji-display').html(html);
}

// Update only confidence values without changing emojis
function updateConfidenceOnly(topExpressions) {
    topExpressions.forEach(({ expression, confidence }) => {
        const percentage = (confidence * 100).toFixed(1);
        const $item = $(`.emoji-item[data-expression="${expression}"]`);
        if ($item.length > 0) {
            $item.find('.emoji-confidence').text(`${percentage}%`);
        }
    });
}

// Draw facial features based on settings
function drawFacialFeatures(canvas, detection) {
    const ctx = canvas.getContext('2d');
    const landmarks = detection.landmarks;
    const positions = landmarks.positions;
    
    // Calculate which landmarks to show based on density
    const step = Math.ceil(100 / landmarkDensity);
    
    // Batch canvas operations for better performance
    ctx.save();
    
    if (showMesh) {
        // Draw face mesh (triangulated surface)
        drawFaceMesh(ctx, positions);
    }
    
    if (showContours) {
        // Draw facial contours (connecting lines)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Batch all contours into single path
        const contourGroups = [
            positions.slice(0, 17),
            positions.slice(17, 22),
            positions.slice(22, 27),
            positions.slice(27, 31),
            positions.slice(31, 36),
            [...positions.slice(36, 42), positions[36]],
            [...positions.slice(42, 48), positions[42]],
            [...positions.slice(48, 60), positions[48]],
            [...positions.slice(60, 68), positions[60]]
        ];
        
        contourGroups.forEach(group => {
            if (group.length > 1) {
                ctx.moveTo(group[0].x, group[0].y);
                for (let i = 1; i < group.length; i++) {
                    ctx.lineTo(group[i].x, group[i].y);
                }
            }
        });
        
        ctx.stroke();
    }
    
    if (showLandmarks) {
        // Draw landmark points in cyan - batch operations
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        
        positions.forEach((point, index) => {
            if (index % step === 0) {
                ctx.moveTo(point.x + 2, point.y);
                ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            }
        });
        
        ctx.fill();
    }
    
    ctx.restore();
}

function drawContour(ctx, points, options) {
    if (points.length < 2) return;
    
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
}

// Draw face mesh - creates a wireframe connecting all landmarks
function drawFaceMesh(ctx, positions) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    // Define connections between landmarks to create mesh
    const connections = [
        // Jaw connections
        ...Array.from({length: 16}, (_, i) => [i, i + 1]),
        // Eyebrow connections
        ...Array.from({length: 4}, (_, i) => [17 + i, 18 + i]),
        ...Array.from({length: 4}, (_, i) => [22 + i, 23 + i]),
        // Nose connections
        ...Array.from({length: 3}, (_, i) => [27 + i, 28 + i]),
        ...Array.from({length: 4}, (_, i) => [31 + i, 32 + i]),
        // Eye connections
        ...Array.from({length: 5}, (_, i) => [36 + i, 37 + i]),
        [41, 36],
        ...Array.from({length: 5}, (_, i) => [42 + i, 43 + i]),
        [47, 42],
        // Mouth connections
        ...Array.from({length: 11}, (_, i) => [48 + i, 49 + i]),
        [59, 48],
        ...Array.from({length: 7}, (_, i) => [60 + i, 61 + i]),
        [67, 60],
        // Cross connections for mesh effect
        [0, 36], [16, 45], [1, 31], [15, 35],
        [27, 39], [27, 42], [30, 33], [30, 51],
        [8, 57], [48, 31], [54, 35]
    ];
    
    connections.forEach(([start, end]) => {
        if (positions[start] && positions[end]) {
            ctx.beginPath();
            ctx.moveTo(positions[start].x, positions[start].y);
            ctx.lineTo(positions[end].x, positions[end].y);
            ctx.stroke();
        }
    });
}

// Setup event listeners for settings
function setupSettings() {
    // Initialize values to match current settings
    $('#show-landmarks').prop('checked', showLandmarks);
    $('#show-contours').prop('checked', showContours);
    $('#show-mesh').prop('checked', showMesh);
    $('#landmark-density').val(landmarkDensity);
    $('#density-value').text(landmarkDensity + '%');
    $('#show-all-expressions').prop('checked', showAllExpressions);
    $('#confidence-threshold').val(confidenceThreshold * 100);
    $('#threshold-value').text((confidenceThreshold * 100) + '%');
    $('#show-stats').prop('checked', showStats);
    
    // Burger menu toggle
    $('#burger-menu').on('click', function() {
        $(this).toggleClass('active');
        $('#settings-panel').toggleClass('active');
    });
    
    // Close settings panel when clicking outside on mobile
    $(document).on('click', function(e) {
        if ($('#settings-panel').hasClass('active') && 
            !$(e.target).closest('#settings-panel').length && 
            !$(e.target).closest('#burger-menu').length) {
            $('#burger-menu').removeClass('active');
            $('#settings-panel').removeClass('active');
        }
    });
    
    // Landmarks toggle
    $('#show-landmarks').on('change', function() {
        showLandmarks = this.checked;
        console.log('Show landmarks:', showLandmarks);
    });
    
    // Contours toggle
    $('#show-contours').on('change', function() {
        showContours = this.checked;
        console.log('Show contours:', showContours);
    });
    
    // Mesh toggle
    $('#show-mesh').on('change', function() {
        showMesh = this.checked;
        console.log('Show mesh:', showMesh);
    });
    
    // Landmark density slider
    $('#landmark-density').on('input', function() {
        landmarkDensity = parseInt(this.value);
        $('#density-value').text(landmarkDensity + '%');
        console.log('Landmark density:', landmarkDensity + '%');
    });
    
    // Show all expressions toggle
    $('#show-all-expressions').on('change', function() {
        showAllExpressions = this.checked;
        console.log('Show all expressions:', showAllExpressions);
    });
    
    // Confidence threshold slider
    $('#confidence-threshold').on('input', function() {
        confidenceThreshold = parseInt(this.value) / 100;
        $('#threshold-value').text(this.value + '%');
        console.log('Confidence threshold:', confidenceThreshold);
    });
    
    // Show stats toggle
    $('#show-stats').on('change', function() {
        showStats = this.checked;
        console.log('Show stats:', showStats);
        if (!showStats) {
            $('#stats-overlay').hide();
        }
    });
}

// Generate QR code
function generateQRCode() {
    const url = window.location.href;
    $('#qr-url').text(url);
    
    // Generate QR code - 60% of viewport height to prevent overflow
    const qrSize = Math.floor(window.innerHeight * 0.6);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}`;
    
    const img = $('<img>').attr('src', qrUrl).attr('alt', 'QR Code');
    $('#qr-code').html(img);
}

// Setup QR modal handlers
function setupQRModal() {
    $('#qr-button').on('click', function() {
        $('#qr-modal').addClass('active');
        generateQRCode();
    });
    
    $('#qr-close').on('click', function() {
        $('#qr-modal').removeClass('active');
    });
    
    // Close on outside click
    $('#qr-modal').on('click', function(e) {
        if (e.target.id === 'qr-modal') {
            $(this).removeClass('active');
        }
    });
}

    // Start the app when page loads
$(document).ready(() => {
    setupSettings();
    setupQRModal();
    init();
    
    // Log mobile detection and adjust UI
    if (isMobile) {
        console.log('Mobile device detected - using optimized settings:');
        console.log('- Input size: 128x128 (vs 416x416) - ~10x faster');
        console.log('- Camera: 480x360');
        console.log('- Smoothing window: 300ms');
        console.log('- Target: 10+ FPS');
        
        // Keep landmarks enabled but disable expensive features
        showContours = false;
        showMesh = false;
        $('#show-contours').prop('checked', false);
        $('#show-mesh').prop('checked', false);
    }
});