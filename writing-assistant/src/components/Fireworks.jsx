import React, { useEffect, useRef } from 'react';

// 全屏震撼烟花（canvas 2D）—— 黑色夜幕，成批同时绽放
// 特点：每次齐射 10+ 发、爆炸半径大、光点更多更亮
// finaleAtMs：结尾再追加一轮更大齐射；尊重系统“减少动态”则跳过
const COLORS = [
  '#4d8dff', '#6fa8ff', '#9dc1ff', '#ffe066', '#ffd25e',
  '#ff9a5e', '#ff6b9d', '#ff4f7e', '#9d7bff', '#b78cff',
  '#41e0c0', '#7ef0c8', '#ffffff',
];

export default function Fireworks({ finaleAtMs = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = cv.getContext('2d');
    const particles = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let nextVolley = 500;
    let startT = 0;
    let finaleDone = false;
    let alive = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    // 一次爆炸：大半径 + 大量光点
    function burst(cx, cy, scale = 1) {
      const color = pick(COLORS);
      const n = Math.round(rand(160, 280) * scale);
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(2, 13.5 * scale); // 大半径
        particles.push({
          x: cx,
          y: cy,
          px: cx,
          py: cy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          decay: rand(0.004, 0.011), // 更长的绽放时间
          size: rand(2.2, 4.6),
          color,
        });
      }
    }

    // 齐射：count 发烟花在天空中同时绽放（铺满屏幕、可重叠）
    function volley(count, scale = 1) {
      const total = Math.max(1, Math.round(count));
      for (let i = 0; i < total; i++) {
        const x = W * 0.5 + (Math.random() - 0.5) * W * 1.05;
        const y = H * (0.06 + Math.random() * 0.42);
        burst(x, y, rand(0.75, 1.3) * scale);
      }
    }

    // 开场：先炸一轮大的
    volley(14, 1.05);
    last = 0;

    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (!startT) startT = t;

      // 结尾高潮：更大的一轮（弹窗出现前）
      if (finaleAtMs > 0 && !finaleDone && t - startT > finaleAtMs) {
        finaleDone = true;
        volley(18, 1.25);
      }

      // 每隔约 1 秒，再来一轮 10~16 发同时绽放
      if (t - last > nextVolley) {
        volley(rand(10, 16));
        nextVolley = rand(900, 1500);
        last = t;
      }

      // 粒子：亮核 + 粗光拖尾 + 外圈光晕
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.028; // 轻重力，绽放更开
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const a = Math.max(0, Math.min(1, p.life));
        // 外圈光晕（让每颗点都发光发亮）
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a * 0.28;
        ctx.lineWidth = p.size * 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // 主体亮尾
        ctx.globalAlpha = a * 0.95;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // 白色亮核
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.62, 0, Math.PI * 2);
        ctx.fill();
        p.px = p.x;
        p.py = p.y;
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (particles.length > 6000) particles.splice(0, particles.length - 6000);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [finaleAtMs]);

  return <canvas ref={ref} className="fireworks-canvas" />;
}
