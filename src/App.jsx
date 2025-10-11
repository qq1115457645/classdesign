// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { detectGesture } from "./gesture";

/**
 * 说明：
 * - 本项目使用 MediaPipe Hands via CDN（see onResults 中的 import）
 * - 在现代浏览器（Chrome/Edge/Firefox）上测试
 */

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [command, setCommand] = useState("");
  const [ready, setReady] = useState(false);

  // 初始化 MediaPipe Hands（按需在 onMount 动态加载）
  useEffect(() => {
    let Hands, Camera;
    let handsInstance;
    let camera;
    let mounted = true;

    const init = async () => {
      // 通过 CDN 导入 MediaPipe (works with module import)
      const handsModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
      const cameraModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      Hands = handsModule.Hands;
      Camera = cameraModule.Camera;

      handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });

      handsInstance.onResults(onResults);

      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await handsInstance.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();

      if (mounted) setReady(true);
    };

    init();

    return () => {
      mounted = false;
      try {
        camera && camera.stop && camera.stop();
        handsInstance && handsInstance.close && handsInstance.close();
      } catch (e) {}
    };
  }, []);

  // 处理 MediaPipe 结果：绘制与识别
  function onResults(results) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // draw simple landmarks
      ctx.fillStyle = "rgba(255,0,0,0.9)";
      for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // draw simple skeleton lines (some connections)
      const connections = [
        [0,1],[1,2],[2,3],[3,4],    // thumb
        [0,5],[5,6],[6,7],[7,8],    // index
        [0,9],[9,10],[10,11],[11,12],// middle
        [0,13],[13,14],[14,15],[15,16],// ring
        [0,17],[17,18],[18,19],[19,20] // pinky
      ];
      ctx.strokeStyle = "rgba(0,150,255,0.9)";
      ctx.lineWidth = 2;
      for (const [a,b] of connections) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
      }

      // 调用识别器获得手势
      const g = detectGesture(landmarks);
      setCommand(g);
    } else {
      setCommand("");
    }
  }

  return (
    <div className="container">
      <h1>手势识别 → 文本指令 Demo</h1>
      <div className="stage">
        <video
          ref={videoRef}
          id="video"
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          style={{ transform: "scaleX(-1)" }} // 镜像更直观
        />
        <canvas
          ref={canvasRef}
          id="overlay"
          width="640"
          height="480"
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        />
        <div className="command">{command || "（未识别）"}</div>
      </div>
      <div className="notes">
        <p>说明：本 demo 使用 MediaPipe Hands（CDN），detectGesture 是基于 landmarks 的 rule-based 占位实现。</p>
        <p>下一步建议：把 rule-based 替换为浏览器 TF.js 模型或基于录制样本的 k-NN。</p>
      </div>
    </div>
  );
}
