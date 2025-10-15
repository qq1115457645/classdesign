// DOM 元素
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const detGestureEl = document.getElementById('detGesture');
const detCommandEl = document.getElementById('detCommand');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// 默认手势映射
let gestureMap = {
  OPEN_PALM: '开始',
  FIST: '确认',
  V_SIGN: '返回',
  THUMB_UP: '赞',
  PINCH: '确定'
};

// 保存样本
let samples = JSON.parse(localStorage.getItem('samples') || '[]');

// 摄像头流
let stream = null;

// 初始化 Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.5, // 低阈值保证复杂环境可检测
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// getUserMedia 启动摄像头
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.play();
  requestAnimationFrame(processFrame);
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// 每帧处理
async function processFrame() {
  if (stream) {
    await hands.send({ image: video });
    requestAnimationFrame(processFrame);
  }
}

// 识别手势
function recognizeGesture(lm) {
  if (!lm) return '—';

  const [THUMB_TIP, THUMB_IP] = [4, 3];
  const [INDEX_TIP, INDEX_PIP] = [8, 6];
  const [MIDDLE_TIP, MIDDLE_PIP] = [12, 10];
  const [RING_TIP, RING_PIP] = [16, 14];
  const [PINKY_TIP, PINKY_PIP] = [20, 18];

  const thumbUp = lm[THUMB_TIP].x < lm[THUMB_IP].x;
  const indexUp = lm[INDEX_TIP].y < lm[INDEX_PIP].y;
  const middleUp = lm[MIDDLE_TIP].y < lm[MIDDLE_PIP].y;
  const ringUp = lm[RING_TIP].y < lm[RING_PIP].y;
  const pinkyUp = lm[PINKY_TIP].y < lm[PINKY_PIP].y;

  const fingers = [thumbUp, indexUp, middleUp, ringUp, pinkyUp];

  // PINCH 判断
  const distance = Math.hypot(
    lm[THUMB_TIP].x - lm[INDEX_TIP].x,
    lm[THUMB_TIP].y - lm[INDEX_TIP].y
  );
  if (distance < 0.05) return 'PINCH';

  if (fingers.every(f => f)) return 'OPEN_PALM';
  if (fingers.every(f => !f)) return 'FIST';
  if (indexUp && middleUp && !ringUp && !pinkyUp && !thumbUp) return 'V_SIGN';
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return 'THUMB_UP';

  return 'OPEN_PALM'; // 默认
}

// 处理结果
function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    drawConnectors(ctx, lm, HAND_CONNECTIONS);
    drawLandmarks(ctx, lm);

    const gesture = recognizeGesture(lm);
    detGestureEl.textContent = gesture;
    detCommandEl.textContent = gestureMap[gesture] || '—';
  } else {
    detGestureEl.textContent = '—';
    detCommandEl.textContent = '—';
  }
}

// 绑定按钮
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

