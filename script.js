const APP = {
  signData: [
    { emoji: '👋', name: 'Hello', meaning: 'A greeting used to welcome someone.', example: 'Hello! Nice to meet you.' },
    { emoji: '✌️', name: 'Peace', meaning: 'A gesture of harmony or victory.', example: 'Peace out and stay calm.' },
    { emoji: '👍', name: 'Good', meaning: 'Approval or positive affirmation.', example: 'This is really good.' },
    { emoji: '👌', name: 'Okay', meaning: 'Agreement or that everything is fine.', example: 'Okay, I understand.' },
    { emoji: '🤟', name: 'I Love You', meaning: 'Expressing love with a hand sign.', example: 'I love you, friend.' },
    { emoji: '✋', name: 'Stop', meaning: 'A command to halt or pause action.', example: 'Please stop for a moment.' },
    { emoji: '👏', name: 'Clap', meaning: 'Applause or approval gesture.', example: 'Great job, clap for them.' },
    { emoji: '👎', name: 'Bad', meaning: 'Disapproval or negative feedback.', example: 'That is bad news.' },
    { emoji: '🙏', name: 'Thanks', meaning: 'Expressing gratitude and appreciation.', example: 'Thanks for your help.' },
    { emoji: '👊', name: 'Yes', meaning: 'A strong affirmative sign or agreement.', example: 'Yes, I agree.' },
    { emoji: '✖️', name: 'No', meaning: 'A negative sign or refusal.', example: 'No, that is incorrect.' },
  ],
  labels: {
    Hello: { meaning: 'A greeting used to welcome someone.', emoji: '👋' },
    Peace: { meaning: 'A gesture of harmony or victory.', emoji: '✌️' },
    Good: { meaning: 'Approval or positive affirmation.', emoji: '👍' },
    Okay: { meaning: 'Agreement or that everything is fine.', emoji: '👌' },
    'I Love You': { meaning: 'Expressing love with a hand sign.', emoji: '🤟' },
    Stop: { meaning: 'A command to halt or pause action.', emoji: '✋' },
    Clap: { meaning: 'Applause or approval gesture.', emoji: '👏' },
    Bad: { meaning: 'Disapproval or negative feedback.', emoji: '👎' },
    Thanks: { meaning: 'Expressing gratitude and appreciation.', emoji: '🙏' },
    Yes: { meaning: 'A strong affirmative sign or agreement.', emoji: '👊' },
    No: { meaning: 'A negative sign or refusal.', emoji: '✖️' }
  },
  fingerIndices: {
    thumb: [1, 2, 3, 4],
    index: [5, 6, 7, 8],
    middle: [9, 10, 11, 12],
    ring: [13, 14, 15, 16],
    pinky: [17, 18, 19, 20]
  },
  state: {
    enabled: false,
    lastSign: null,
    sentenceParts: [],
    startTime: null,
    detections: 0,
    totalConfidence: 0,
    voiceEnabled: true,
    latestRawData: null
  }
};

const elements = {
  webcam: document.getElementById('webcam'),
  overlayCanvas: document.getElementById('overlayCanvas'),
  detectedSign: document.getElementById('detectedSign'),
  meaningText: document.getElementById('meaningText'),
  confidenceBar: document.getElementById('confidenceBar'),
  confidenceText: document.getElementById('confidenceText'),
  statusBadge: document.getElementById('statusBadge'),
  sentenceBubble: document.getElementById('sentenceBubble'),
  assistantText: document.getElementById('assistantText'),
  startBtn: document.getElementById('startBtn'),
  learnBtn: document.getElementById('learnBtn'),
  searchInput: document.getElementById('searchInput'),
  cardGrid: document.getElementById('cardGrid'),
  voiceToggle: document.getElementById('voiceToggle'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  screenshotBtn: document.getElementById('screenshotBtn'),
  downloadReportBtn: document.getElementById('downloadReportBtn'),
  totalSignCount: document.getElementById('totalSignCount'),
  accuracyValue: document.getElementById('accuracyValue'),
  spmValue: document.getElementById('spmValue'),
  sessionDuration: document.getElementById('sessionDuration'),
  durationRing: document.getElementById('durationRing'),
  meterExcellent: document.getElementById('meterExcellent'),
  meterTrack: document.getElementById('meterTrack')
};

// Simplified MediaPipe hand connections (used for drawing skeleton)
const MP_HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];
function createSignCards() {
  elements.cardGrid.innerHTML = '';
  APP.signData.forEach(sign => {
    const card = document.createElement('article');
    card.className = 'sign-card';
    card.innerHTML = `
      <div class="sign-card-header">
        <div class="icon">${sign.emoji}</div>
      </div>
      <div class="sign-card-body">
        <span class="card-tag">${sign.name}</span>
        <h3 class="mt-4 text-2xl font-semibold text-white">${sign.name}</h3>
        <p class="mt-3 text-slate-300">${sign.meaning}</p>
        <p class="mt-4 text-sm text-slate-400">Example: ${sign.example}</p>
      </div>
    `;
    elements.cardGrid.appendChild(card);
  });
}

function filterCards(query) {
  const normalized = query.trim().toLowerCase();
  const filtered = APP.signData.filter(sign => {
    return sign.name.toLowerCase().includes(normalized) || sign.meaning.toLowerCase().includes(normalized) || sign.example.toLowerCase().includes(normalized);
  });
  elements.cardGrid.innerHTML = '';
  filtered.forEach(sign => {
    const card = document.createElement('article');
    card.className = 'sign-card';
    card.innerHTML = `
      <div class="sign-card-header">
        <div class="icon">${sign.emoji}</div>
      </div>
      <div class="sign-card-body">
        <span class="card-tag">${sign.name}</span>
        <h3 class="mt-4 text-2xl font-semibold text-white">${sign.name}</h3>
        <p class="mt-3 text-slate-300">${sign.meaning}</p>
        <p class="mt-4 text-sm text-slate-400">Example: ${sign.example}</p>
      </div>
    `;
    elements.cardGrid.appendChild(card);
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function getFingerState(landmarks, finger) {
  const points = APP.fingerIndices[finger].map(index => landmarks[index]);
  const base = points[0];
  const tip = points[points.length - 1];
  return tip.y < base.y;
}

function getHandOrientation(landmarks) {
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  return indexBase.x < wrist.x ? 'left' : 'right';
}

function buildFeatureVector(landmarks) {
  const features = ['thumb', 'index', 'middle', 'ring', 'pinky'].map(finger => getFingerState(landmarks, finger) ? 1 : 0);
  const spread = distance(landmarks[5], landmarks[17]);
  features.push(spread);
  return tf.tensor([features]);
}

function predictIntent(landmarks) {
  const states = {
    thumb: getFingerState(landmarks, 'thumb'),
    index: getFingerState(landmarks, 'index'),
    middle: getFingerState(landmarks, 'middle'),
    ring: getFingerState(landmarks, 'ring'),
    pinky: getFingerState(landmarks, 'pinky')
  };
  const orientation = getHandOrientation(landmarks);
  const extended = Object.values(states).filter(Boolean).length;
  const palmSpread = distance(landmarks[5], landmarks[17]);

  const possible = [];
  if (states.index && states.middle && !states.thumb && !states.ring && !states.pinky) {
    possible.push('Peace');
  }
  if (states.thumb && !states.index && !states.middle && !states.ring && !states.pinky) {
    if (landmarks[4].y < landmarks[2].y) possible.push('Good');
    else possible.push('Bad');
  }
  if (states.thumb && states.index && !states.middle && !states.ring && states.pinky) {
    possible.push('I Love You');
  }
  if (states.index && states.middle && states.ring && states.pinky && states.thumb) {
    possible.push('Hello');
    possible.push('Stop');
  }
  if (states.index && states.thumb && !states.middle && !states.ring && !states.pinky) {
    possible.push('Okay');
  }
  if (!states.index && !states.middle && !states.ring && !states.pinky && !states.thumb) {
    possible.push('Yes');
  }
  if (states.index && !states.middle && !states.ring && !states.pinky && !states.thumb) {
    possible.push('No');
  }
  if (!states.index && !states.middle && !states.ring && states.thumb && states.pinky) {
    possible.push('Clap');
  }
  if (states.index && states.middle && states.ring && states.pinky && !states.thumb) {
    possible.push('Thanks');
  }

  const features = buildFeatureVector(landmarks);
  const raw = tf.tidy(() => {
    const weights = tf.tensor2d([
      [3, 1, 0.8, 0.6, 0.8, 1.2],
      [0.2, 2.8, 2.9, 0.1, 0.1, 0.8],
      [2.6, 0.3, 0.2, 0.1, 2.5, 0.7],
      [3.2, 3.1, 3.0, 2.8, 2.9, 0.5],
      [1.6, 1.8, 0.4, 0.4, 1.6, 0.9],
      [0.2, 3.0, 0.1, 0.1, 0.5, 0.3],
      [0.8, 2.0, 0.2, 0.2, 0.8, 0.3],
      [0.2, 0.1, 0.1, 0.1, 0.1, 0.5],
      [0.5, 1.7, 1.5, 1.3, 0.9, 0.6],
      [0.1, 0.3, 0.1, 0.1, 0.1, 0.2],
      [0.1, 0.9, 0.1, 0.1, 0.1, 0.2]
    ]);
    return tf.softmax(tf.matMul(features, weights, false, true)).arraySync()[0];
  });

  let best = { name: 'Detecting...', score: 0.16 };
  const labels = ['Hello','Peace','Good','Okay','I Love You','Stop','Clap','Bad','Thanks','Yes','No'];
  raw.forEach((score, index) => {
    if (score > best.score) best = { name: labels[index], score };
  });
  if (possible.length) {
    const preferred = possible[0];
    const index = labels.indexOf(preferred);
    best = { name: preferred, score: Math.max(best.score, raw[index] + 0.1) };
  }
  best.score = Math.min(1, best.score + Math.min(0.25, palmSpread * 0.5));
  return best;
}

function drawLandmarks(results) {
  const canvas = elements.overlayCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  if (results.multiHandLandmarks.length > 0) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
      ctx.lineWidth = 2;
      const connections = MP_HAND_CONNECTIONS;
      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.clientWidth, startPoint.y * canvas.clientHeight);
        ctx.lineTo(endPoint.x * canvas.clientWidth, endPoint.y * canvas.clientHeight);
        ctx.stroke();
      });
      landmarks.forEach(point => {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(point.x * canvas.clientWidth, point.y * canvas.clientHeight, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  ctx.restore();
}

function updateUI(sign, confidence) {
  const label = APP.labels[sign] || { meaning: 'Recognizing the gesture...', emoji: '🤖' };
  elements.detectedSign.textContent = `${label.emoji} ${sign}`;
  elements.meaningText.textContent = label.meaning;
  const percent = Math.round(confidence * 100);
  elements.confidenceBar.style.width = `${percent}%`;
  elements.confidenceText.textContent = `${percent}%`;
  elements.statusBadge.textContent = confidence > 0.25 ? 'Hand Detected ✅' : 'Listening...';
  elements.statusBadge.className = confidence > 0.25 ? 'rounded-full bg-slate-900/80 px-3 py-1 text-sm text-neongreen ring-1 ring-neongreen/20' : 'rounded-full bg-slate-900/80 px-3 py-1 text-sm text-slate-300 ring-1 ring-white/10';

  if (APP.state.lastSign !== sign && confidence > 0.35) {
    APP.state.lastSign = sign;
    APP.state.sentenceParts.push(sign);
    if (APP.state.sentenceParts.length > 8) APP.state.sentenceParts.shift();
    const sentence = APP.state.sentenceParts.join(' ');
    elements.sentenceBubble.textContent = sentence || 'Ready to build your sentence.';
    const message = `Sign Detected: ${sign}. ${label.meaning}`;
    elements.assistantText.textContent = message;
    if (APP.state.voiceEnabled) speakText(sign);
  }
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.1;
  utterance.voice = speechSynthesis.getVoices().find(voice => voice.lang.startsWith('en')) || null;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function updateAnalytics(confidence) {
  if (!APP.state.startTime) return;
  APP.state.detections += 1;
  APP.state.totalConfidence += confidence;
  const elapsed = (Date.now() - APP.state.startTime) / 1000;
  const average = APP.state.totalConfidence / APP.state.detections;
  const perMinute = elapsed > 0 ? (APP.state.detections / elapsed) * 60 : 0;
  elements.totalSignCount.textContent = APP.state.detections;
  elements.accuracyValue.textContent = `${Math.round(average * 100)}%`;
  elements.spmValue.textContent = `${Math.round(perMinute)}`;
  const duration = new Date(Date.now() - APP.state.startTime).toISOString().substr(11, 8);
  elements.sessionDuration.textContent = duration;
  const ringPercent = Math.min(100, Math.round((elapsed / 240) * 100));
  elements.durationRing.textContent = `${ringPercent}%`;
  elements.meterExcellent.textContent = `${Math.round(Math.min(100, average * 100))}%`;
  elements.meterTrack.style.width = `${Math.min(100, Math.round(average * 100))}%`;
}

function onResults(results) {
  console.debug('onResults: hands=', results.multiHandLandmarks?.length ?? 0);
  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    elements.statusBadge.textContent = 'No hand detected';
    elements.statusBadge.className = 'rounded-full bg-slate-900/80 px-3 py-1 text-sm text-slate-300 ring-1 ring-white/10';
    drawLandmarks(results);
    return;
  }
  drawLandmarks(results);
  const candidate = predictIntent(results.multiHandLandmarks[0]);
  const confidence = candidate.score;
  updateUI(candidate.name, confidence);
  updateAnalytics(confidence);
}

let cameraInstance;
const hands = new Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  // lower thresholds to improve initial detection in varied lighting
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onResults);

function startCamera() {
  if (APP.state.enabled) return;
  APP.state.enabled = true;
  if (!APP.state.startTime) APP.state.startTime = Date.now();
  cameraInstance = new Camera(elements.webcam, {
    onFrame: async () => {
      await hands.send({ image: elements.webcam });
    },
    width: 1280,
    height: 720
  });
  cameraInstance.start();
  elements.startBtn.textContent = 'Detecting...';
  elements.startBtn.disabled = true;
  elements.startBtn.classList.add('opacity-80', 'cursor-not-allowed');
}

function captureScreenshot() {
  const capture = document.createElement('canvas');
  capture.width = elements.webcam.videoWidth;
  capture.height = elements.webcam.videoHeight;
  const ctx = capture.getContext('2d');
  ctx.drawImage(elements.webcam, 0, 0, capture.width, capture.height);
  ctx.drawImage(elements.overlayCanvas, 0, 0, capture.width, capture.height);
  capture.toBlob(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'signspeak-screenshot.png';
    link.click();
  });
}

function downloadReport() {
  const elapsed = APP.state.startTime ? Math.round((Date.now() - APP.state.startTime) / 1000) : 0;
  const report = {
    sessionStarted: new Date(APP.state.startTime).toISOString(),
    durationSeconds: elapsed,
    totalDetections: APP.state.detections,
    averageConfidence: APP.state.detections ? `${Math.round((APP.state.totalConfidence / APP.state.detections) * 100)}%` : '0%',
    detectedSigns: APP.state.sentenceParts,
    summary: `Detected ${APP.state.detections} signs in ${elapsed} seconds with average confidence ${APP.state.detections ? Math.round((APP.state.totalConfidence / APP.state.detections) * 100) : 0}%`
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'signspeak-report.json';
  link.click();
}

function toggleFullscreen() {
  const element = document.querySelector('main');
  if (!document.fullscreenElement) {
    element.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function init() {
  createSignCards();
  elements.searchInput.addEventListener('input', e => filterCards(e.target.value));
  elements.startBtn.addEventListener('click', startCamera);
  elements.learnBtn.addEventListener('click', () => document.getElementById('dictionary').scrollIntoView({ behavior: 'smooth' }));
  elements.voiceToggle.addEventListener('click', () => {
    APP.state.voiceEnabled = !APP.state.voiceEnabled;
    elements.voiceToggle.textContent = APP.state.voiceEnabled ? 'Voice On' : 'Voice Off';
  });
  elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
  elements.screenshotBtn.addEventListener('click', captureScreenshot);
  elements.downloadReportBtn.addEventListener('click', downloadReport);
  setInterval(() => updateAnalytics(0), 1000);
}

window.addEventListener('DOMContentLoaded', init);
