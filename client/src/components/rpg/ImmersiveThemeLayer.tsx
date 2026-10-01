import React, { useEffect, useRef, useState } from 'react';
import type { ImmersiveThemeDef } from '../../lib/rpgThemeRegistry';

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; phase?: number };

function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (document.documentElement.getAttribute('data-low-power') === 'true') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const low = document.documentElement.getAttribute('data-low-power') === 'true';
      setAllowed(!low && !mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-low-power'] });
    return () => {
      mq.removeEventListener('change', sync);
      obs.disconnect();
    };
  }, []);
  return allowed;
}

/**
 * Performant CSS/canvas ambient layer for immersive Roguelike themes.
 * Pointer-events none; respects prefers-reduced-motion + Low-Power.
 */
export const ImmersiveThemeLayer: React.FC<{ theme: ImmersiveThemeDef | null }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionOk = useMotionAllowed();

  useEffect(() => {
    if (!theme || theme.motion === 'aurora' || theme.defaultUnlocked || !motionOk) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const cols = Math.ceil(w() / 16);
    const drops = Array.from({ length: cols }, () => Math.random() * h());
    const glyphs = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ<>|/∑∂';
    const particles: P[] = Array.from({ length: 72 }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      r: 2 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.2 - Math.random() * 0.9,
      a: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    }));

    const tick = () => {
      if (!running) return;
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);
      const t = performance.now() * 0.001;
      const motion = theme.motion;

      if (motion === 'matrix') {
        ctx.fillStyle = 'rgba(2,6,23,0.08)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = '13px ui-monospace, monospace';
        for (let i = 0; i < drops.length; i++) {
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          const bright = Math.random() > 0.92;
          ctx.fillStyle = bright ? 'rgba(190,242,100,0.85)' : 'rgba(74,222,128,0.45)';
          ctx.fillText(ch, i * 16, drops[i] * 16);
          if (drops[i] * 16 > height && Math.random() > 0.965) drops[i] = 0;
          drops[i] += 0.45 + Math.random() * 0.45;
        }
      } else if (motion === 'bokeh') {
        for (const p of particles) {
          p.x += p.vx * 0.3;
          p.y += Math.sin(p.x * 0.01) * 0.15;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(251,191,36,${p.a})`);
          g.addColorStop(1, 'rgba(251,191,36,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (motion === 'grid') {
        const horizon = height * 0.42;
        ctx.strokeStyle = 'rgba(34,211,238,0.18)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 24; i++) {
          const y = horizon + ((i * 28 + (t * 40) % 28) * (1 + i * 0.04));
          if (y > height) continue;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        for (let i = -20; i <= 20; i++) {
          ctx.beginPath();
          ctx.moveTo(width / 2 + i * 40, horizon);
          ctx.lineTo(width / 2 + i * 120, height);
          ctx.stroke();
        }
        const glow = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 20);
        glow.addColorStop(0, 'rgba(34,211,238,0)');
        glow.addColorStop(1, 'rgba(34,211,238,0.12)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, horizon - 40, width, 60);
      } else if (motion === 'accretion') {
        const cx = width * 0.5;
        const cy = height * 0.45;
        for (let i = 0; i < 60; i++) {
          const ang = t * 0.4 + i * 0.22;
          const rad = 40 + (i % 12) * 14;
          const x = cx + Math.cos(ang) * rad * 2.2;
          const y = cy + Math.sin(ang) * rad * 0.55;
          ctx.fillStyle = `rgba(167,139,250,${0.15 + (i % 5) * 0.05})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        const hole = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
        hole.addColorStop(0, 'rgba(0,0,0,0.9)');
        hole.addColorStop(1, 'rgba(76,29,149,0)');
        ctx.fillStyle = hole;
        ctx.beginPath();
        ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        ctx.fill();
      } else if (motion === 'eclipse') {
        const cx = width * 0.72;
        const cy = height * 0.22;
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
        g.addColorStop(0, 'rgba(127,29,29,0.9)');
        g.addColorStop(0.4, 'rgba(239,68,68,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, 120, 0, Math.PI * 2);
        ctx.fill();
        for (const p of particles) {
          p.y += (p.vy || -0.4) * -0.4;
          p.x += p.vx;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(248,113,113,${p.a * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        const vig = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      } else if (motion === 'sakura' || motion === 'sakura-cafe') {
        for (const p of particles) {
          p.x += p.vx + Math.sin(p.y * 0.02) * 0.3;
          p.y += Math.abs(p.vy) * 0.5;
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          const pink = motion === 'sakura-cafe' ? `rgba(249,168,212,${p.a})` : `rgba(244,114,182,${p.a})`;
          ctx.fillStyle = pink;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, p.x * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
        if (motion === 'sakura-cafe') {
          const sun = ctx.createRadialGradient(width * 0.85, height * 0.12, 10, width * 0.85, height * 0.12, 160);
          sun.addColorStop(0, 'rgba(253,224,71,0.35)');
          sun.addColorStop(1, 'rgba(253,224,71,0)');
          ctx.fillStyle = sun;
          ctx.fillRect(0, 0, width, height);
        }
      } else if (motion === 'frost') {
        // Refracting prism panes + soft frost wash
        for (let i = 0; i < 10; i++) {
          const x = ((i * 137 + t * 28) % (width + 160)) - 80;
          const y = (i * 89 + Math.sin(t + i) * 12) % height;
          const g = ctx.createLinearGradient(x, y, x + 220, y + 140);
          g.addColorStop(0, 'rgba(165,243,252,0.02)');
          g.addColorStop(0.35, 'rgba(255,255,255,0.12)');
          g.addColorStop(0.65, 'rgba(103,232,249,0.08)');
          g.addColorStop(1, 'rgba(14,165,233,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x, y + 20);
          ctx.lineTo(x + 160, y);
          ctx.lineTo(x + 220, y + 100);
          ctx.lineTo(x + 40, y + 140);
          ctx.closePath();
          ctx.fill();
        }
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
          ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
        }
      } else if (motion === 'ocean') {
        for (const p of particles) {
          p.y += p.vy;
          p.x += Math.sin(p.y * 0.02 + t) * 0.55;
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
          ctx.strokeStyle = `rgba(56,189,248,${p.a})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
          core.addColorStop(0, `rgba(125,211,252,${p.a * 0.5})`);
          core.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // pressure wave bands
        ctx.strokeStyle = 'rgba(14,165,233,0.08)';
        for (let i = 0; i < 5; i++) {
          const y = ((t * 30 + i * 80) % (height + 40)) - 20;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= width; x += 24) {
            ctx.lineTo(x, y + Math.sin(x * 0.02 + t + i) * 6);
          }
          ctx.stroke();
        }
      } else if (motion === 'synthwave') {
        const sunY = height * 0.38;
        const sunR = Math.min(width, height) * 0.18;
        const sg = ctx.createRadialGradient(width / 2, sunY, 4, width / 2, sunY, sunR);
        sg.addColorStop(0, 'rgba(251,113,133,0.9)');
        sg.addColorStop(0.55, 'rgba(236,72,153,0.45)');
        sg.addColorStop(1, 'rgba(236,72,153,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(width / 2, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(26,5,51,0.55)';
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(width / 2 - sunR, sunY + i * 10 - 20, sunR * 2, 4);
        }
        ctx.strokeStyle = 'rgba(34,211,238,0.45)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 20) {
          const y = height * 0.62 + Math.sin(x * 0.02 + t) * 18 + Math.abs(Math.sin(x * 0.01)) * 80;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        for (const px of [width * 0.12, width * 0.88]) {
          ctx.fillRect(px, height * 0.55, 4, height * 0.3);
          ctx.beginPath();
          ctx.ellipse(px, height * 0.55, 40, 12, -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (motion === 'solar') {
        for (const p of particles) {
          p.x += p.vx * 2;
          p.y += p.vy * -1.2;
          if (p.y < -10 || p.x < -10 || p.x > width + 10) {
            p.x = width * 0.5 + (Math.random() - 0.5) * 80;
            p.y = height * 0.55;
          }
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(253,224,71,${p.a})`);
          g.addColorStop(0.5, `rgba(249,115,22,${p.a * 0.5})`);
          g.addColorStop(1, 'rgba(154,52,18,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (motion === 'noir') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let y = 0; y < height; y += 28) {
          ctx.fillRect(0, y, width, 10);
        }
        for (let i = 0; i < 120; i++) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
          ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
      } else if (motion === 'biopunk') {
        ctx.strokeStyle = 'rgba(163,230,53,0.35)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 40; i++) {
          const x = ((i * 37 + t * 80) % (width + 40)) - 20;
          ctx.beginPath();
          ctx.moveTo(x, -20);
          ctx.lineTo(x + 30, height + 20);
          ctx.stroke();
        }
      } else if (motion === 'elden') {
        for (const p of particles) {
          p.y += p.vy;
          p.x += Math.sin((p.phase || 0) + t) * 0.3;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(251,191,36,${p.a * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (motion === 'badlands') {
        for (const p of particles) {
          p.x += 0.8 + p.vx;
          p.y += Math.sin(t + (p.phase || 0)) * 0.2;
          if (p.x > width + 20) {
            p.x = -20;
            p.y = Math.random() * height;
          }
          ctx.fillStyle = `rgba(234,88,12,${p.a * 0.35})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r * 3, p.r, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(253,186,116,0.04)';
        for (let i = 0; i < 6; i++) {
          const y = height * 0.4 + Math.sin(t * 2 + i) * 12 + i * 30;
          ctx.fillRect(0, y, width, 8);
        }
      } else if (motion === 'lofi') {
        ctx.strokeStyle = 'rgba(214,211,209,0.35)';
        for (let i = 0; i < 80; i++) {
          const x = (i * 47 + t * 120) % width;
          const y = (i * 73 + t * 400) % height;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 2, y + 14);
          ctx.stroke();
        }
        const steam = ctx.createRadialGradient(width * 0.2, height * 0.75, 4, width * 0.2, height * 0.75, 50 + Math.sin(t) * 10);
        steam.addColorStop(0, 'rgba(253,230,138,0.2)');
        steam.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = steam;
        ctx.beginPath();
        ctx.arc(width * 0.2, height * 0.75, 60, 0, Math.PI * 2);
        ctx.fill();
      } else if (motion === 'glitch') {
        if (width >= 2 && height >= 2 && Math.random() > 0.92) {
          const sliceY = Math.random() * height;
          const sliceH = 8 + Math.random() * 40;
          ctx.drawImage(canvas, 0, sliceY, width, sliceH, (Math.random() - 0.5) * 30, sliceY, width, sliceH);
        }
        ctx.fillStyle = `rgba(34,211,238,${0.04 + Math.random() * 0.06})`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = `rgba(244,63,94,${0.03 + Math.random() * 0.05})`;
        ctx.fillRect(2, 0, width, height);
      } else if (motion === 'chibi') {
        ctx.strokeStyle = 'rgba(68,64,60,0.2)';
        for (let i = 0; i < 24; i++) {
          const y = (i / 24) * height;
          ctx.beginPath();
          ctx.moveTo(width * 0.55, height * 0.5);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 8) {
          for (let x = (y % 16 === 0 ? 0 : 4); x < width; x += 8) {
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (motion === 'webtoon') {
        for (const p of particles) {
          p.x += p.vx;
          p.y += Math.sin(t * 2 + (p.phase || 0)) * 0.4;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          ctx.fillStyle = `rgba(249,168,212,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(196,181,253,${p.a * 0.7})`;
          ctx.fillRect(p.x - 1, p.y - p.r, 2, p.r * 2);
          ctx.fillRect(p.x - p.r, p.y - 1, p.r * 2, 2);
        }
      } else if (motion === 'hearth') {
        for (const p of particles) {
          p.y += p.vy * 0.6;
          p.x += Math.sin(t + (p.phase || 0)) * 0.4;
          if (p.y < -10) {
            p.y = height * 0.85;
            p.x = width * 0.5 + (Math.random() - 0.5) * 120;
          }
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
          g.addColorStop(0, `rgba(251,191,36,${p.a})`);
          g.addColorStop(1, 'rgba(217,119,6,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const glow = ctx.createRadialGradient(width / 2, height, 10, width / 2, height, height * 0.45);
        glow.addColorStop(0, `rgba(217,119,6,${0.18 + Math.sin(t * 3) * 0.05})`);
        glow.addColorStop(1, 'rgba(217,119,6,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [theme, motionOk]);

  if (!theme || theme.defaultUnlocked || theme.motion === 'aurora') {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden fios-aurora-layer fios-theme-layer" aria-hidden>
        <div className="fios-aurora-blob fios-aurora-a" />
        <div className="fios-aurora-blob fios-aurora-b" />
      </div>
    );
  }

  if (!motionOk) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden fios-theme-layer" aria-hidden>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, color-mix(in srgb, ${theme.palette.from} 35%, transparent), transparent 55%),
              radial-gradient(ellipse at 80% 70%, color-mix(in srgb, ${theme.palette.to} 28%, transparent), transparent 50%)`,
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden fios-theme-layer" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {theme.motion === 'grid' && <div className="fios-scanline absolute inset-0" />}
      {theme.motion === 'glitch' && <div className="fios-glitch-overlay absolute inset-0" />}
      {theme.motion === 'frost' && <div className="fios-frost-pane absolute inset-0 opacity-40" />}
    </div>
  );
};

export default ImmersiveThemeLayer;
