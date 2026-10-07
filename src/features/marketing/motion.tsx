import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from 'react';

// Outils d'animation de la page marketing, sans dépendance : apparition au
// défilement, compteurs, mot qui défile, halo qui suit la souris.
// Tous respectent le réglage système "réduire les animations".

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// true dès que l'élément entre dans l'écran (une seule fois si `once`)
export function useInView<T extends Element>(options: { once?: boolean; threshold?: number; rootMargin?: string } = {}) {
  const { once = true, threshold = 0.2, rootMargin = '0px 0px -10% 0px' } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, inView };
}

// Apparition au défilement (fondu + glissement). Le contenu est visible par
// défaut : il n'est masqué que s'il est encore sous la ligne de flottaison au
// montage, pour ne jamais laisser un bloc invisible (aperçus, impression…).
export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
  from = 'up',
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  from?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // déjà visible : pas d'effet
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={state === 'idle' ? undefined : state}
      data-reveal-from={from}
      style={{ transitionDelay: state === 'shown' ? `${delay}ms` : undefined } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

// Compteur animé de 0 à `value` quand il devient visible
export function CountUp({ value, duration = 1400, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.6 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubique
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {display.toLocaleString('fr-FR')}
      {suffix}
    </span>
  );
}

// Valeur numérique qui glisse en douceur vers sa nouvelle valeur (totaux)
export function useAnimatedNumber(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const v = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      setValue(v);
      fromRef.current = v;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

// Mot qui change en glissant (ex. bars → restaurants → hôtels).
// `wordClassName` s'applique à CHAQUE mot : un dégradé (bg-clip-text) posé
// sur le conteneur ne s'affiche pas sur des enfants transformés — les mots
// deviendraient transparents, donc invisibles.
export function RotatingWord({
  words,
  interval = 2200,
  className = '',
  wordClassName = '',
}: {
  words: string[];
  interval?: number;
  className?: string;
  wordClassName?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || words.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  // Le mot le plus long réserve la largeur : le titre ne "saute" pas
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
  const previous = (index - 1 + words.length) % words.length;

  return (
    // overflow-hidden masque les mots qui entrent/sortent ; le léger padding
    // vertical (compensé par une marge négative) évite de couper les
    // jambages (g, p) et les accents.
    <span className={`relative -my-[0.15em] inline-grid overflow-hidden py-[0.15em] align-bottom ${className}`}>
      <span aria-hidden="true" className={`invisible col-start-1 row-start-1 ${wordClassName}`}>
        {longest}
      </span>
      <span className="sr-only">{words.join(', ')}</span>
      {words.map((w, i) => (
        <span
          key={w}
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-[transform,opacity] duration-500 ease-out ${wordClassName} ${
            i === index
              ? 'translate-y-0 opacity-100'
              : i === previous
                ? '-translate-y-full opacity-0'
                : 'translate-y-full opacity-0'
          }`}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

// Carte avec halo lumineux qui suit la souris (variables CSS --x / --y)
export function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };
  return (
    <div onMouseMove={onMove} className={`spotlight-card group relative overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// Progression du défilement de la page (0 → 1) pour la barre en haut
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { progress, scrolled };
}

// Section actuellement à l'écran, pour souligner le lien du menu
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  return active;
}
