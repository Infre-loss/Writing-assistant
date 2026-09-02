import React, { useEffect, useRef } from 'react';

// 全屏烟花（canvas 2D）—— 温和亮度 · 蓝白黄紫
// 构图：屏幕中央一朵大烟花缓缓升空、绽放（直径约屏宽 1/3），光点绽放后缓缓飘落；
//       四周持续有小烟花绽放补位，尽量让天空不留空白。
// finaleAtMs：结尾加一轮庆祝齐射；尊重系统“减少动态”则跳过
const BLUES = ['#3f6df4', '#5b8bff', '#7fa6ff', '#9db9ff'];
const PURPLES = ['#7b66ff', '#9b85ff', '#bca6ff'];
const YELLOWS = ['#ffcf5e', '#ffe9a8'];
const WHITES = ['#ffffff', '#eef3ff'];

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

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
    let hero = null;
    let lastHeroAt = 0;
    let nextHero = 1800;
    let lastAmbientAt = 0;
    let nextAmbient = 300;
    let startT = 0;
    let finaleDone = false;
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

    function bloom(x, y, count, speedMax, color, bright = true) {
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
        });
      }
    }

    // 中央大烟花：reach 使花朵直径约屏宽 1/3
    function bigBloom(x, y) {
      const color = Math.random() < 0.55 ? pick(BLUES) : pick([...PURPLES, ...YELLOWS]);
      const reach = Math.max(120, W * 0.165);
      bloom(x, y, Math.round(150 + reach * 0.5), reach * 0.075, color, true);
    }

    // 周边小烟花（蓝白黄紫为主）
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

    // 细碎流星光：缓缓下落填补空隙
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
        x: W * 0.5 + rand(-30, 30),
        y: H + 20,
        vx: rand(-0.45, 0.45),
        vy: -Math.max(5.6, H * 0.006),
        targetY: H * (0.3 + Math.random() * 0.12),
      };
    }

    const tick = (t) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      if (!startT) startT = t;

      // 结尾庆祝齐射
      if (finaleAtMs > 0 && !finaleDone && t - startT > finaleAtMs) {
        finaleDone = true;
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (!alive) return;
            const reach = Math.max(90, W * 0.1);
            bloom(
              W * 0.5 + (Math.random() - 0.5) * W * 0.7,
              H * (0.15 + Math.random() * 0.3),
              90,
              reach * 0.08,
              pick(BLUES),
              true
            );
          }, i * 200);
        }
      }

      // 中央大烟花周期
      if (t - lastHeroAt > nextHero) {
        launchHero();
        nextHero = rand(3400, 4600);
        lastHeroAt = t;
      }

      // 周边小烟花 + 流星光：持续补位
      if (t - lastAmbientAt > nextAmbient) {
        smallBloom();
        if (Math.random() < 0.3) smallBloom();
        if (Math.random() < 0.35) drizzle();
        nextAmbient = rand(420, 800);
        lastAmbientAt = t;
      }

      // 大烟花缓缓上升
      if (hero) {
        const hk = hero;
        hk.x += hk.vx;
        hk.y += hk.vy;
        hk.vy *= 0.9995;
        // 上升亮尾
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

      // 粒子：光点缓缓飘落、淡出
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.032;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.987;
        p.vy *= 0.987;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 40) {
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
      if (particles.length > 2400) particles.splice(0, particles.length - 2400);
    };

    // 开场小烟花，避免开场太空
    setTimeout(() => {
      if (!alive) return;
      smallBloom();
      setTimeout(() => {
        if (alive) smallBloom();
      }, 280);
    }, 180);

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [finaleAtMs]);

  return <canvas ref={ref} className="fireworks-canvas" />;
}
