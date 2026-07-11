import { useState, useRef, useEffect } from 'react';
import { Mail, Send, Check } from 'lucide-react';
import { submitEmail, sendPhotoEmail } from '../hooks/useAnalytics';
import { registerFounderMember } from '../utils/loyalty';
import type { Fandom, Lang } from '../types/fandom';
import { t } from '../utils/i18n';

interface Props {
  fandomId: string;
  fandomName: string;
  lang: Lang;
  photoId?: string | null;
  guestName?: string;
  wishText?: string;
  fandoms?: Fandom[];
}

export default function EmailCapture({
  fandomId,
  fandomName,
  lang,
  photoId,
  guestName = '',
  wishText = '',
  fandoms = [],
}: Props) {
  const [firstName, setFirstName] = useState(guestName);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [preferredFandom, setPreferredFandom] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sentWithFounder, setSentWithFounder] = useState(false);
  const [photoEmailed, setPhotoEmailed] = useState(false);
  const formStartedAt = useRef(Date.now());
  const i = t(lang);

  useEffect(() => {
    if (guestName && !firstName) setFirstName(guestName);
  }, [guestName, firstName]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = firstName.trim().length > 0 && isValidEmail(email);

  const otherFandoms = fandoms
    .filter((f) => f.enabled && f.id !== fandomId)
    .slice(0, 6);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');

    const emailOk = await submitEmail(email, fandomId, {
      firstName: firstName.trim(),
      photoId: photoId || undefined,
      wishText: wishText || undefined,
      preferredFandom: preferredFandom || undefined,
    });
    if (!emailOk) {
      setStatus('idle');
      return;
    }

    let emailed = false;
    if (photoId) {
      emailed = await sendPhotoEmail(photoId, email.trim(), firstName.trim(), fandomName);
    }
    setPhotoEmailed(emailed);

    if (consent) {
      await registerFounderMember({
        firstName: firstName.trim(),
        email: email.trim(),
        fandomName: preferredFandom || fandomName,
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
          {sentWithFounder
            ? (photoEmailed ? i.emailSentFounder : i.emailRegisteredFounder)
            : (photoEmailed ? i.emailSent : i.emailRegistered)}
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
      <p className="text-[10px] sm:text-xs font-bold tracking-[0.12em] mb-1 text-center"
        style={{ color: 'rgba(197,165,90,0.6)' }}>
        <Mail size={10} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
        {i.keepMyCard}
      </p>
      <p className="text-[9px] tracking-wider mb-2 text-center"
        style={{ color: 'rgba(197,165,90,0.35)' }}>
        {i.emailMembershipHint}
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

        {otherFandoms.length > 0 && (
          <div>
            <p className="text-[9px] tracking-wider mb-1.5"
              style={{ color: 'rgba(197,165,90,0.35)' }}>
              {i.nextFandomLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {otherFandoms.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPreferredFandom(
                    preferredFandom === f.displayName ? '' : f.displayName
                  )}
                  className="fandom-chip"
                  style={{
                    borderColor: preferredFandom === f.displayName
                      ? f.accentColor : 'rgba(197,165,90,0.2)',
                    color: preferredFandom === f.displayName
                      ? f.accentColor : 'rgba(197,165,90,0.5)',
                    backgroundColor: preferredFandom === f.displayName
                      ? `${f.accentColor}15` : 'transparent',
                  }}>
                  {f.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

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
