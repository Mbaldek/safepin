// Step 6 — Celebration (confetti + summary)

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

type Props = {
  contactAdded: boolean;
  contactName: string;
  homeZoneSet: boolean;
  onDone: () => void;
};

function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);

  const colors = ['#D4A853', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const particles = Array.from({ length: 80 }, () => ({
    x: w / 2,
    y: h / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.9) * 14,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 5 + 2,
    life: 1,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
  }));

  let frame: number;
  const c = ctx; // non-null alias
  function animate() {
    c.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.life -= 0.015;
      p.rotation += p.rotationSpeed;
      c.save();
      c.translate(p.x, p.y);
      c.rotate((p.rotation * Math.PI) / 180);
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      c.restore();
    }
    if (alive) frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frame);
}

function SummaryRow({ emoji, label, done, detail }: { emoji: string; label: string; done: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {detail && <p className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>{detail}</p>}
      </div>
      <span className="text-sm">{done ? '✅' : '⏭️'}</span>
    </div>
  );
}

export default function StepCelebration({ contactAdded, contactName, homeZoneSet, onDone }: Props) {
  const t = useTranslations('onboarding');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = fireConfetti(canvasRef.current);
    return cleanup;
  }, []);

  const fullySetUp = contactAdded && homeZoneSet;

  return (
    <div className="flex flex-col items-center text-center pt-4 pb-4 relative">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="text-5xl mb-4 relative z-10"
      >
        🎉
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black mb-1 relative z-10"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('doneTitle')}
      </motion.h2>

      {fullySetUp && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs font-bold mb-4 relative z-10"
          style={{ color: '#22c55e' }}
        >
          {t('doneFullSetup')}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full rounded-2xl p-4 mb-6 relative z-10"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <SummaryRow emoji="🗺️" label="Map & reporting" done />
        <SummaryRow emoji="🆘" label="SOS emergency" done />
        <SummaryRow
          emoji="👥"
          label="Trusted circle"
          done={contactAdded}
          detail={contactAdded ? contactName : 'Add later in My Breveil'}
        />
        <SummaryRow
          emoji="🏠"
          label="Home zone"
          done={homeZoneSet}
          detail={homeZoneSet ? 'Zone set' : 'Using current location'}
        />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onDone}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] relative z-10"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('doneEnter')} →
      </motion.button>
    </div>
  );
}
