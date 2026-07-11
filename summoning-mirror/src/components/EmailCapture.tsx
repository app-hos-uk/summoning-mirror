import { useState, useRef } from 'react';
import { Mail, Send, Check } from 'lucide-react';
import { submitEmail } from '../hooks/useAnalytics';
import { registerFounderMember } from '../utils/loyalty';
import type { Lang } from '../types/fandom';
import { t } from '../utils/i18n';

interface Props {
  fandomId: string;
  fandomName: string;
  lang: Lang;
}

export default function EmailCapture({ fandomId, fandomName, lang }: Props) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sentWithFounder, setSentWithFounder] = useState(false);
  const formStartedAt = useRef(Date.now());
  const i = t(lang);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = firstName.trim().length > 0 && isValidEmail(email);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');

    const emailOk = await submitEmail(email, fandomId);
    if (!emailOk) {
      setStatus('idle');
      return;
    }

    if (consent) {
      await registerFounderMember({
        firstName: firstName.trim(),
        email: email.trim(),
        fandomName,
        formStartedAt: formStartedAt.current,
      });
      setSentWithFounder(true);
    }

    setStatus('sent');
  };

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded border"
        style={{
          borderColor: 'rgba(50,200,80,0.3)',
          backgroundColor: 'rgba(50,200,80,0.05)',
        }}>
        <Check size={14} style={{ color: 'rgba(50,200,80,0.8)' }} />
        <span className="text-xs tracking-wider" style={{ color: 'rgba(50,200,80,0.8)' }}>
          {sentWithFounder ? i.emailSentFounder : i.emailSent}
        </span>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: 'rgba(197,165,90,0.05)',
    borderColor: 'rgba(197,165,90,0.2)',
    color: 'white',
  };

  return (
    <div className="w-full max-w-xs">
      <p className="text-[10px] tracking-wider mb-2 text-center"
        style={{ color: 'rgba(197,165,90,0.4)' }}>
        <Mail size={10} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
        {i.emailHint}
      </p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={i.firstNamePlaceholder}
          autoComplete="given-name"
          className="w-full px-3 py-2 text-xs rounded border outline-none"
          style={inputStyle}
        />
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={i.emailPlaceholder}
            autoComplete="email"
            className="flex-1 px-3 py-2 text-xs rounded border outline-none"
            style={inputStyle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || status === 'sending'}
            className="px-3 py-2 rounded border text-xs tracking-wider cursor-pointer transition-all hover:scale-105 disabled:opacity-40"
            style={{
              borderColor: 'rgba(197,165,90,0.3)',
              color: '#C5A55A',
            }}>
            <Send size={14} />
          </button>
        </div>
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-[#C5A55A]"
          />
          <span className="text-[10px] leading-relaxed tracking-wider"
            style={{ color: 'rgba(197,165,90,0.55)' }}>
            {i.founderConsent}
          </span>
        </label>
      </div>
    </div>
  );
}
