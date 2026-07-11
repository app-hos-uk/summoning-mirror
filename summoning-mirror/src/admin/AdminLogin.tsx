import { useState, type FormEvent } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import { BRAND } from '../utils/branding';

interface Props {
  onLogin: (token: string) => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      const { token } = await res.json();
      sessionStorage.setItem('admin_token', token);
      onLogin(token);
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'rgba(197,165,90,0.05)',
    borderColor: 'rgba(197,165,90,0.25)',
    color: 'white',
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: BRAND.colors.navy }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={BRAND.assets.emblem} alt="" className="w-16 h-16 mb-4 opacity-70" />
          <h1 className="text-xl font-bold tracking-[0.2em]"
            style={{ color: BRAND.colors.gold }}>
            ADMIN ACCESS
          </h1>
          <p className="text-xs tracking-wider mt-1"
            style={{ color: 'rgba(197,165,90,0.4)' }}>
            The Summoning Mirror
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-wider mb-1.5"
              style={{ color: 'rgba(197,165,90,0.5)' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@houseofspells.com"
              className="w-full px-4 py-3 rounded border text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.25)'; }}
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-wider mb-1.5"
              style={{ color: 'rgba(197,165,90,0.5)' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded border text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(197,165,90,0.25)'; }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded text-xs tracking-wider"
              style={{
                backgroundColor: 'rgba(255,60,60,0.08)',
                border: '1px solid rgba(255,60,60,0.25)',
                color: 'rgba(255,120,120,0.9)',
              }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold tracking-[0.15em] rounded border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: BRAND.colors.gold,
              color: BRAND.colors.gold,
              backgroundColor: 'rgba(197,165,90,0.1)',
            }}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                SIGN IN
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] tracking-wider mt-8"
          style={{ color: 'rgba(197,165,90,0.2)' }}>
          {BRAND.text.eventLine}
        </p>
      </div>
    </div>
  );
}
