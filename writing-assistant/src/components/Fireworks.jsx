import React, { useEffect, useRef } from 'react';

// 烟花庆祝动画（canvas 2D，全屏）—— 仅用于「全书完成」庆祝
// 尊重系统“减少动态”设置（此时不启动动画）
const COLORS = ['#2d5bd8', '#5d7fe6', '#8fb1f2', '#ffd166', '#f283b6', '#7b61ff', '#35c2a4', '#ff9a62', '#f8e16c'];

export default function Fireworks() {
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
    let nextBurst = 300;
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

    function burst(cx, cy) {
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      const n = 60 + ((Math.random() * 40) | 0);
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(1.4, 6.4);
        particles.push({
          x: cx,
          y: cy,
          px: cx,
          py: cy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          decay: rand(0.008, 0.02),
          size: rand(1.4, 3),
          color,
        });
      }
    }

    function salvo(count) {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (!alive) return;
          burst(rand(W * 0.15, W * 0.85), rand(H * 0.12, H * 0.5));
        }, i * 180);
      }
    }
    salvo(3); // 开场齐射

    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (t - last > nextBurst) {
        burst(rand(W * 0.15, W * 0.85), rand(H * 0.1, H * 0.5));
        nextBurst = rand(750, 1500);
        last = t;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.045; // 重力
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, Math.min(1, p.life)) * 0.9;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        p.px = p.x;
        p.py = p.y;
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // 总量保护（挂机不清理时防止内存持续增长）
      if (particles.length > 900) particles.splice(0, particles.length - 900);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="fireworks-canvas" />;
}
