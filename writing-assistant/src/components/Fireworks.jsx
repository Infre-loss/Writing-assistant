import React, { useEffect, useRef } from 'react';

// 全屏烟花（canvas 2D）—— 温和亮度 · 蓝白黄紫
// 构图：屏幕中央一朵大烟花快速升空、缓缓绽放，光点慢落；中央花下落结束时动画即结束。
//       四周小烟花持续绽放补位（ambientOnly=true 时只播小烟花，用作卡片背景）。
// 尊重系统“减少动态”则跳过动画
const BLUES = ['#3f6df4', '#5b8bff', '#7fa6ff', '#9db9ff'];
const PURPLES = ['#7b66ff', '#9b85ff', '#bca6ff'];
const YELLOWS = ['#ffcf5e', '#ffe9a8'];
const WHITES = ['#ffffff', '#eef3ff'];

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export default function Fireworks({ ambientOnly = false, onFinish }) {
  const ref = useRef(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = cv.getContext('2d');
    const particles = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let hero = null;
    let heroActive = 0; // 中央大烟花仍在飘落的光点数
    let heroBloomed = false;
    let finished = false;
    let lastHeroAt = 0;
    let nextHero = 2000;
    let lastAmbientAt = 0;
    let nextAmbient = 350;
    let alive = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
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

    // 普通绽放（小烟花/补位）—— 参数保持不变
    function bloom(x, y, count, speedMax, color, bright = true, isHero = false, g = 0.032) {
      for (let i = 0; i < count; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(speedMax * 0.18, speedMax);
        particles.push({
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          decay: rand(0.005, 0.014),
          size: rand(1.5, 3.2),
          color,
          bright,
          isHero,
          g,
        });
      }
    }

    // 中央大烟花：粒子更多、绽放更慢、下落更缓
    function bigBloom(x, y) {
      heroBloomed = true;
      const color = Math.random() < 0.55 ? pick(BLUES) : pick([...PURPLES, ...YELLOWS]);
      const reach = Math.max(120, W * 0.165);
      const count = Math.round(330 + reach * 0.7);
      heroActive += count;
      for (let i = 0; i < count; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(reach * 0.012, reach * 0.078);
        particles.push({
          x,
          y,
          px: x,
          py: y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1,
          decay: rand(0.003, 0.0062), // 缓慢淡出
          size: rand(1.6, 3.6),
          color,
          bright: true,
          isHero: true,
          g: 0.014, // 轻重力，慢慢下落
        });
      }
    }

    // 周边小烟花（保持不变）
    function smallBloom() {
      const roll = Math.random();
      const color =
        roll < 0.4
          ? pick(BLUES)
          : roll < 0.65
            ? pick(PURPLES)
            : roll < 0.85
              ? pick(YELLOWS)
              : pick(WHITES);
      const reach = Math.max(40, W * 0.05) * rand(0.8, 1.3);
      const x = W * 0.5 + (Math.random() - 0.5) * W * 0.96;
      const y = H * (0.08 + Math.random() * 0.52);
      bloom(x, y, Math.round(46 + reach * 0.9), reach * 0.085, color, Math.random() < 0.7);
    }

    // 流星光（保持不变）
    function drizzle() {
      const n = Math.round(rand(7, 14));
      for (let i = 0; i < n; i++) {
        particles.push({
          x: rand(0, W),
          y: rand(-20, H * 0.25),
          px: 0,
          py: 0,
          vx: rand(-0.25, 0.25),
          vy: rand(0.55, 1.5),
          life: rand(0.7, 1),
          decay: rand(0.004, 0.008),
          size: rand(1, 2),
          color: Math.random() < 0.6 ? pick(WHITES) : pick(BLUES),
          bright: false,
        });
      }
    }

    function launchHero() {
      hero = {
        x: W * 0.5 + rand(-24, 24),
        y: H + 20,
        vx: rand(-0.4, 0.4),
        vy: -Math.max(8.2, H * 0.0086), // 上升快一些
        targetY: H * 0.3 + Math.random() * H * 0.06,
      };
    }

    function finishShow() {
      if (finished || !alive) return;
      finished = true;
      alive = false; // 停掉本实例
      cancelAnimationFrame(raf);
      if (finishRef.current) finishRef.current();
    }

    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // 中央大烟花周期（全屏秀阶段才放）
      if (!ambientOnly && !heroBloomed && t - lastHeroAt > nextHero) {
        launchHero();
        lastHeroAt = t;
      }

      // 周边小烟花 + 流星光：持续补位
      if (t - lastAmbientAt > nextAmbient) {
        smallBloom();
        if (Math.random() < 0.3) smallBloom();
        if (Math.random() < 0.4) drizzle();
        nextAmbient = ambientOnly ? rand(600, 1000) : rand(380, 720);
        lastAmbientAt = t;
      }

      // 大烟花上升（快一些）
      if (hero) {
        const hk = hero;
        hk.x += hk.vx;
        hk.y += hk.vy;
        hk.vy *= 0.9992;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(hk.x, hk.y);
        ctx.lineTo(hk.x - hk.vx * 4, hk.y - hk.vy * 4 + 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hk.x, hk.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (hk.y <= hk.targetY) {
          bigBloom(hk.x, hk.y);
          hero = null;
        }
      }

      // 粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.987;
        p.vy *= 0.987;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 40) {
          if (p.isHero) heroActive -= 1;
          particles.splice(i, 1);
          continue;
        }
        const a = Math.max(0, Math.min(1, p.life));
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a * 0.85;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (p.bright) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.globalAlpha = a * 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        p.px = p.x;
        p.py = p.y;
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (particles.length > 2600) particles.splice(0, particles.length - 2600);

      // 中央大烟花的飘落结束 → 动画结束
      if (!ambientOnly && heroBloomed && !hero && heroActive <= 0) {
        finishShow();
      }
    };

    // 开场小烟花
    setTimeout(() => {
      if (!alive) return;
      smallBloom();
      setTimeout(() => {
        if (alive) smallBloom();
      }, 260);
    }, 160);

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [ambientOnly]);

  return <canvas ref={ref} className="fireworks-canvas" />;
}
