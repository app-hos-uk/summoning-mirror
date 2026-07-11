import { useEffect, useState, useRef } from 'react';
import { playCountdownBeep } from '../utils/sounds';
import type { Lang } from '../types/fandom';
import { t } from '../utils/i18n';

interface Props {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
  lang: Lang;
}

export default function CountdownOverlay({ seconds, onComplete, onCancel, lang }: Props) {
  const [count, setCount] = useState(seconds);
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const i = t(lang);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (count <= 0) {
      onCompleteRef.current();
      return;
    }

    playCountdownBeep();

    const timer = setTimeout(() => {
      if (mountedRef.current) setCount((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(12,20,40,0.7)' }}
      onClick={onCancel}>
      <div key={count} className="countdown-number text-8xl md:text-[12rem] font-bold"
        style={{
          color: '#C5A55A',
          fontFamily: 'Georgia, serif',
          textShadow: '0 0 40px rgba(197,165,90,0.5), 0 0 80px rgba(197,165,90,0.3)',
        }}>
        {count}
      </div>
      <p className="text-sm md:text-lg tracking-[0.3em] mt-4"
        style={{ color: 'rgba(197,165,90,0.6)' }}>
        {i.getReady.toUpperCase()}
      </p>
      <p className="text-xs tracking-wider mt-6 opacity-40"
        style={{ color: 'rgba(197,165,90,0.4)' }}>
        {lang === 'en' ? 'Tap to cancel' : ''}
      </p>
    </div>
  );
}
