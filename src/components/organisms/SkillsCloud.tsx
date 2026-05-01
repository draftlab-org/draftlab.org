import { useEffect, useMemo, useRef } from 'react';

export interface SkillsCloudSkill {
  slug: string;
  name: string;
  iconSvg: string;
}

interface Props {
  skills: SkillsCloudSkill[];
}

function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

const MOUSE_SHIFT_PX = 22;
const SCROLL_SHIFT_PX = 28;

export default function SkillsCloud({ skills }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const positioned = useMemo(() => {
    const n = skills.length;
    return skills.map((s, i) => {
      const phi = (i + 0.5) * Math.PI * (3 - Math.sqrt(5));
      const r = Math.sqrt((i + 0.5) / n);
      const jitter = hash01(`${s.slug}:j`);
      const x = 50 + Math.cos(phi) * r * 40 + (jitter - 0.5) * 6;
      const y = 50 + Math.sin(phi) * r * 38 + (hash01(`${s.slug}:k`) - 0.5) * 6;
      const zRaw = hash01(s.slug);
      const z = (zRaw - 0.5) * 360;
      const depth = 0.4 + zRaw * 1.1;
      return { ...s, x, y, z, depth, delayIndex: i };
    });
  }, [skills]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const host =
      (el.closest('[data-skills-cloud-root]') as HTMLElement | null) ?? el;

    let mx = 0;
    let my = 0;
    let sy = 0;
    let pending = false;
    let enteringTimer: number | null = null;

    const flush = () => {
      pending = false;
      el.style.setProperty('--mx', `${mx}px`);
      el.style.setProperty('--my', `${my}px`);
      el.style.setProperty('--sy', `${sy}px`);
    };
    const schedule = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(flush);
      }
    };

    const onMouse = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mx = -nx * MOUSE_SHIFT_PX;
      my = -ny * MOUSE_SHIFT_PX;
      if (el.dataset.returning !== 'entering') {
        el.dataset.returning = 'false';
      }
      schedule();
    };

    const onEnter = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mx = -nx * MOUSE_SHIFT_PX;
      my = -ny * MOUSE_SHIFT_PX;
      el.dataset.returning = 'entering';
      schedule();
      if (enteringTimer !== null) window.clearTimeout(enteringTimer);
      enteringTimer = window.setTimeout(() => {
        if (el.dataset.returning === 'entering') {
          el.dataset.returning = 'false';
        }
        enteringTimer = null;
      }, 900);
    };

    const onLeave = () => {
      mx = 0;
      my = 0;
      el.dataset.returning = 'true';
      if (enteringTimer !== null) {
        window.clearTimeout(enteringTimer);
        enteringTimer = null;
      }
      schedule();
    };

    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const centered = (rect.top + rect.height / 2 - vh / 2) / vh;
      sy = -centered * SCROLL_SHIFT_PX;
      schedule();
    };

    host.addEventListener('mousemove', onMouse);
    host.addEventListener('mouseenter', onEnter);
    host.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      host.removeEventListener('mousemove', onMouse);
      host.removeEventListener('mouseenter', onEnter);
      host.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      if (enteringTimer !== null) window.clearTimeout(enteringTimer);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="skills-cloud">
      {positioned.map((s) => (
        <span
          key={s.slug}
          className="skills-cloud__icon"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            ['--depth' as string]: String(s.depth),
            ['--z' as string]: `${s.z}px`,
            ['--delay' as string]: `${(s.delayIndex % 7) * 0.6}s`,
            ['--duration' as string]: `${6 + (s.delayIndex % 5)}s`,
            ['--size' as string]: `${Math.round(26 + s.depth * 22)}px`,
            opacity: 0.45 + s.depth * 0.4,
          }}
          dangerouslySetInnerHTML={{ __html: s.iconSvg }}
        />
      ))}
    </div>
  );
}
