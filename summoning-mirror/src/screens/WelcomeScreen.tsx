import { useEffect, useRef } from 'react';
import { BRAND } from '../utils/branding';
import type { Lang } from '../types/fandom';
import { t } from '../utils/i18n';
import LanguageSelector from '../components/LanguageSelector';
import FanCounter from '../components/FanCounter';

interface Props {
  onStart: () => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export default function WelcomeScreen({ onStart, lang, onLangChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const i = t(lang);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    let animId: number;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; decay: number; color: string;
    }
    interface Orbit {
      cx: number; cy: number; rx: number; ry: number;
      angle: number; speed: number; size: number; alpha: number;
    }

    const particles: Particle[] = [];
    const orbits: Orbit[] = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let idx = 0; idx < 6; idx++) {
      orbits.push({
        cx: canvas.width / 2,
        cy: canvas.height * 0.38,
        rx: 80 + idx * 50,
        ry: 30 + idx * 20,
        angle: (Math.PI * 2 / 6) * idx,
        speed: 0.003 + Math.random() * 0.004,
        size: 1.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.3,
      });
    }

    function spawnSparkle() {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.5,
        size: Math.random() * 2.5 + 0.5,
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0.003 + Math.random() * 0.005,
        color: Math.random() > 0.5 ? '#C5A55A' : '#E8D5A3',
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.length < 40 && Math.random() > 0.85) spawnSparkle();

      for (let idx = particles.length - 1; idx >= 0; idx--) {
        const p = particles[idx];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(idx, 1); continue; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size * 2, p.y);
        ctx.lineTo(p.x + p.size * 2, p.y);
        ctx.moveTo(p.x, p.y - p.size * 2);
        ctx.lineTo(p.x, p.y + p.size * 2);
        ctx.stroke();
      }

      for (const orb of orbits) {
        orb.angle += orb.speed;
        orb.cx = canvas.width / 2;
        orb.cy = canvas.height * 0.38;
        const x = orb.cx + Math.cos(orb.angle) * orb.rx;
        const y = orb.cy + Math.sin(orb.angle) * orb.ry;

        ctx.beginPath();
        ctx.arc(x, y, orb.size, 0, Math.PI * 2);
        ctx.fillStyle = '#C5A55A';
        ctx.globalAlpha = orb.alpha * (0.6 + 0.4 * Math.sin(orb.angle * 3));
        ctx.fill();

        const grad = ctx.createRadialGradient(x, y, 0, x, y, orb.size * 8);
        grad.addColorStop(0, 'rgba(197,165,90,0.15)');
        grad.addColorStop(1, 'rgba(197,165,90,0)');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.5;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    }

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="screen-enter flex flex-col items-center justify-center h-full w-full relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${BRAND.colors.navyLight} 0%, ${BRAND.colors.navyDark} 100%)`,
      }}>

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(197,165,90,0.08) 0%, transparent 55%)',
        }} />

      {/* Language selector at top */}
      <div className="absolute top-4 md:top-8 z-20 px-4">
        <LanguageSelector lang={lang} onChange={onLangChange} />
      </div>

      {/* Main content */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-12 z-10 px-4">
        <img
          src={BRAND.assets.emblemCircle}
          alt="House of Spells"
          className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl"
        />
        <img
          src={BRAND.assets.wordogram}
          alt="House of Spells"
          className="w-40 sm:w-48 md:w-72 object-contain drop-shadow-xl"
        />
      </div>

      <h1 className="text-xl sm:text-2xl md:text-5xl font-bold tracking-[0.15em] mt-5 sm:mt-8 md:mt-12 z-10 text-glow-gold px-4 text-center"
        style={{ color: BRAND.colors.gold, fontFamily: 'Georgia, serif' }}>
        {i.title}
      </h1>

      <p className="text-xs sm:text-sm md:text-xl mt-2 sm:mt-3 md:mt-5 tracking-[0.2em] z-10 px-4 text-center"
        style={{ color: 'rgba(197,165,90,0.6)' }}>
        {i.subtitle}
      </p>

      <p className="text-[10px] sm:text-xs md:text-base mt-1.5 sm:mt-2 md:mt-3 tracking-wider z-10"
        style={{ color: 'rgba(197,165,90,0.4)' }}>
        {BRAND.text.handle}
      </p>

      {/* Fan counter */}
      <div className="mt-3 sm:mt-4 z-10">
        <FanCounter lang={lang} />
      </div>

      <button
        onClick={onStart}
        className="btn-gold-shimmer mt-5 sm:mt-8 md:mt-12 px-8 sm:px-10 md:px-16 py-3 sm:py-4 md:py-5 text-xs sm:text-sm md:text-lg font-bold tracking-[0.2em] rounded-sm border-2 cursor-pointer z-10 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'transparent',
          borderColor: BRAND.colors.gold,
          color: BRAND.colors.gold,
        }}>
        {i.cta}
      </button>

      {/* Seasonal badge */}
      {BRAND.seasonal.active && (
        <div className="mt-3 sm:mt-4 z-10 px-4 py-1.5 rounded-full border"
          style={{
            borderColor: 'rgba(197,165,90,0.25)',
            backgroundColor: 'rgba(197,165,90,0.08)',
          }}>
          <span className="text-[10px] md:text-xs tracking-[0.2em]"
            style={{ color: 'rgba(197,165,90,0.6)' }}>
            {i.seasonalBadge}
          </span>
        </div>
      )}

      <div className="absolute bottom-4 sm:bottom-8 md:bottom-12 w-32 sm:w-40 md:w-60 h-px z-10"
        style={{ backgroundColor: 'rgba(197,165,90,0.2)' }} />
    </div>
  );
}
