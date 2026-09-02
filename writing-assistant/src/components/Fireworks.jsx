import React, { useEffect, useRef } from 'react';

// 全屏盛大烟花（canvas 2D）—— 用于「全书完成」庆祝的前奏秀
// finaleAtMs：在指定毫秒后追加一波齐射高潮（用于弹窗出现前的收尾）
// 尊重系统“减少动态”：不启动动画
const COLORS = [
  '#2d5bd8', '#5d7fe6', '#8fb1f2', '#ffd166', '#ffb347',
  '#f283b6', '#ff6b9d', '#7b61ff', '#35c2a4', '#7ef0c8', '#f8e16c',
];

export default function Fireworks({ finaleAtMs = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = cv.getContext('2d');
    const particles = [];
    const rockets = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let nextBurst = 400;
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

    // 烟花绽放（含闪亮光点 + 光晕拖尾）
    function burst(cx, cy, scale = 1) {
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      const color2 = COLORS[(Math.random() * COLORS.length) | 0];
      const n = Math.round(rand(110, 200) * scale);
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(1.2, 8.4 * scale);
        const useSecond = i % 3 === 0;
        particles.push({
          x: cx,
          y: cy,
          px: cx,
          py: cy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          decay: rand(0.006, 0.016),
          size: rand(1.6, 3.6),
          color: useSecond ? color2 : color,
        });
      }
    }

    // 升空火箭：拖着光尾飞上去，到达高空后爆炸
    function rocket() {
      const x = rand(W * 0.2, W * 0.8);
      rockets.push({
        x,
        y: H + 10,
        targetY: rand(H * 0.16, H * 0.42),
        vx: rand(-0.6, 0.6),
        vy: rand(-11, -8.4),
        color: '#ffe9a8',
      });
    }

    function salvo(count, scale = 1, delay = 150) {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (!alive) return;
          burst(rand(W * 0.15, W * 0.85), rand(H * 0.12, H * 0.5), scale);
        }, i * delay);
      }
    }

    function finale() {
      finaleDone = true;
      const spots = [];
      for (let i = 0; i < 6; i++) spots.push([rand(W * 0.12, W * 0.88), rand(H * 0.1, H * 0.55)]);
      spots.forEach(([x, y], i) => {
        setTimeout(() => {
          if (!alive) return;
          burst(x, y, 1.25);
          if (i % 2 === 0) burst(x + rand(-40, 40), y + rand(-30, 30), 0.8);
        }, i * 140);
      });
    }

    salvo(5, 1, 160); // 开场齐射

    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (!startT) startT = t;

      // 高潮齐射（弹窗出现前）
      if (finaleAtMs > 0 && !finaleDone && t - startT > finaleAtMs) finale();

      // 持续放烟花 + 升空火箭
      if (t - last > nextBurst) {
        const r = Math.random();
        if (r < 0.38) rocket();
        else burst(rand(W * 0.15, W * 0.85), rand(H * 0.12, H * 0.5), rand(0.8, 1.15));
        nextBurst = rand(600, 1200);
        last = t;
      }

      // 升空火箭
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rk = rockets[i];
        rk.x += rk.vx;
        rk.y += rk.vy;
        rk.vy += 0.16;
        if (rk.y <= rk.targetY) {
          burst(rk.x, rk.y, 1.1);
          rockets.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = rk.color;
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(rk.x, rk.y);
        ctx.lineTo(rk.x - rk.vx * 3, rk.y - rk.vy * 3 + 6);
        ctx.stroke();
      }

      // 爆炸粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.05;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.984;
        p.vy *= 0.984;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, Math.min(1, p.life));
        // 光晕拖尾
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // 白色亮核
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        p.px = p.x;
        p.py = p.y;
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (particles.length > 1600) particles.splice(0, particles.length - 1600);
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
