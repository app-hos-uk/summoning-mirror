import { useState, useCallback, useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { BRAND } from '../utils/branding';
import { RefreshCw, TrendingUp, Users, Share2, Mail, BarChart3, LogOut, ChevronLeft, ChevronRight, Trash2, Download, Settings } from 'lucide-react';
import { clearAdminToken, adminHeaders, adminJsonHeaders } from '../utils/adminAuth';

interface EmailEntry {
  email: string;
  fandomId: string;
  fandomName: string;
  source: string;
  timestamp: string;
}

interface EmailsResponse {
  emails: EmailEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AnalyticsDashboardProps {
  onLogout: () => void;
}

export default function AnalyticsDashboard({ onLogout }: AnalyticsDashboardProps) {
  const { data, loading, error, refetch } = useAnalytics();
  const [showEmails, setShowEmails] = useState(false);
  const [emailData, setEmailData] = useState<EmailsResponse | null>(null);
  const [emailPage, setEmailPage] = useState(1);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);

  const fetchEmails = useCallback(async (page: number) => {
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/admin/emails?page=${page}&limit=20`, { headers: adminHeaders() });
      if (res.ok) {
        const d = await res.json();
        setEmailData(d);
        setEmailPage(d.page);
      }
    } catch { /* ignore */ } finally {
      setEmailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showEmails) fetchEmails(emailPage);
  }, [showEmails, emailPage, fetchEmails]);

  const handleDeleteEmail = async (email: string) => {
    if (!confirm(`Delete all records for ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(email)}`, {
        method: 'DELETE', headers: adminHeaders(),
      });
      if (res.ok) {
        setEmailMessage('Email deleted');
        setTimeout(() => setEmailMessage(''), 2000);
        fetchEmails(emailPage);
        refetch();
      }
    } catch { setEmailMessage('Failed to delete'); }
  };

  const handleExportEmails = async () => {
    try {
      let allEmails: EmailEntry[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(`/api/admin/emails?page=${page}&limit=100`, { headers: adminHeaders() });
        if (!res.ok) break;
        const d: EmailsResponse = await res.json();
        allEmails = allEmails.concat(d.emails);
        if (page >= d.totalPages) break;
        page++;
      }
      const csv = 'Email,Fandom,Source,Timestamp\n' + allEmails.map(e =>
        `"${e.email}","${e.fandomName}","${e.source}","${e.timestamp}"`
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `emails-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { setEmailMessage('Export failed'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full"
        style={{ backgroundColor: BRAND.colors.navy }}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4"
        style={{ backgroundColor: BRAND.colors.navy }}>
        <p className="text-sm tracking-wider" style={{ color: 'rgba(197,165,90,0.6)' }}>
          {error || 'Failed to load analytics'}
        </p>
        <button onClick={refetch}
          className="px-4 py-2 rounded border cursor-pointer text-sm tracking-wider"
          style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto p-4 md:p-8 z-50"
      style={{ backgroundColor: BRAND.colors.navy }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-wider"
              style={{ color: BRAND.colors.gold }}>
              <BarChart3 className="inline mr-3" size={28} />
              ANALYTICS DASHBOARD
            </h1>
            <p className="text-xs md:text-sm mt-1 tracking-wider"
              style={{ color: 'rgba(197,165,90,0.4)' }}>
              The Summoning Mirror — Live Performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="flex items-center gap-2 px-4 py-2 rounded border cursor-pointer transition-all hover:scale-105"
              style={{
                borderColor: BRAND.colors.gold,
                color: BRAND.colors.gold,
                backgroundColor: 'rgba(197,165,90,0.1)',
              }}>
              <RefreshCw size={16} />
              <span className="text-sm tracking-wider">REFRESH</span>
            </button>
            <button
              onClick={() => {
                clearAdminToken();
                onLogout();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all hover:scale-105"
              style={{
                borderColor: 'rgba(255,80,80,0.3)',
                color: 'rgba(255,120,120,0.7)',
              }}>
              <LogOut size={16} />
              <span className="text-xs tracking-wider">LOGOUT</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={<TrendingUp size={20} />} label="Cards Generated" value={data.totalCards} />
          <KpiCard icon={<Share2 size={20} />} label="Social Shares" value={data.totalShares} />
          <KpiCard icon={<Mail size={20} />} label="Emails Collected" value={data.totalEmails}
            onClick={() => setShowEmails(!showEmails)} clickable />
          <KpiCard icon={<Users size={20} />} label="Active Fandoms" value={Object.keys(data.fandomCounts).length} />
        </div>

        {/* Email List (expanded) */}
        {showEmails && (
          <div className="mb-8 p-4 md:p-6 rounded-lg border"
            style={{ borderColor: 'rgba(197,165,90,0.15)', backgroundColor: 'rgba(197,165,90,0.02)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider" style={{ color: BRAND.colors.gold }}>
                COLLECTED EMAILS
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handleExportEmails}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer text-xs tracking-wider transition-all hover:scale-105"
                  style={{ borderColor: 'rgba(197,165,90,0.3)', color: BRAND.colors.gold }}>
                  <Download size={13} /> CSV
                </button>
                <button onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer text-xs tracking-wider transition-all hover:scale-105"
                  style={{ borderColor: 'rgba(197,165,90,0.3)', color: BRAND.colors.gold }}>
                  <Settings size={13} /> SMTP
                </button>
              </div>
            </div>

            {emailMessage && (
              <div className="mb-3 p-2 rounded text-xs tracking-wider text-center"
                style={{ backgroundColor: 'rgba(197,165,90,0.1)', color: BRAND.colors.gold }}>
                {emailMessage}
              </div>
            )}

            {/* SMTP Settings Panel */}
            {showSmtpSettings && <SmtpSettingsPanel />}

            {emailLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : emailData && emailData.emails.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(197,165,90,0.15)' }}>
                        <th className="text-left py-2 px-2 tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>EMAIL</th>
                        <th className="text-left py-2 px-2 tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>FANDOM</th>
                        <th className="text-left py-2 px-2 tracking-wider hidden md:table-cell" style={{ color: 'rgba(197,165,90,0.5)' }}>SOURCE</th>
                        <th className="text-left py-2 px-2 tracking-wider hidden md:table-cell" style={{ color: 'rgba(197,165,90,0.5)' }}>DATE</th>
                        <th className="py-2 px-2" style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailData.emails.map((e, i) => (
                        <tr key={`${e.email}-${i}`}
                          style={{ borderBottom: '1px solid rgba(197,165,90,0.07)' }}>
                          <td className="py-2 px-2" style={{ color: 'white' }}>{e.email}</td>
                          <td className="py-2 px-2" style={{ color: 'rgba(197,165,90,0.7)' }}>{e.fandomName}</td>
                          <td className="py-2 px-2 hidden md:table-cell" style={{ color: 'rgba(197,165,90,0.4)' }}>{e.source}</td>
                          <td className="py-2 px-2 hidden md:table-cell" style={{ color: 'rgba(197,165,90,0.4)' }}>
                            {new Date(e.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2">
                            <button onClick={() => handleDeleteEmail(e.email)}
                              className="cursor-pointer hover:opacity-100 opacity-40 transition-opacity"
                              style={{ color: 'rgba(255,80,80,0.7)' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {emailData.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button onClick={() => setEmailPage(Math.max(1, emailPage - 1))}
                      disabled={emailPage <= 1}
                      className="p-1.5 rounded cursor-pointer disabled:opacity-20 transition-opacity"
                      style={{ color: BRAND.colors.gold }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>
                      Page {emailData.page} of {emailData.totalPages} ({emailData.total} total)
                    </span>
                    <button onClick={() => setEmailPage(Math.min(emailData.totalPages, emailPage + 1))}
                      disabled={emailPage >= emailData.totalPages}
                      className="p-1.5 rounded cursor-pointer disabled:opacity-20 transition-opacity"
                      style={{ color: BRAND.colors.gold }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-center py-6 tracking-wider" style={{ color: 'rgba(197,165,90,0.3)' }}>
                No emails collected yet.
              </p>
            )}
          </div>
        )}

        {/* Top Fandoms */}
        <div className="mb-8 p-4 md:p-6 rounded-lg border"
          style={{
            borderColor: 'rgba(197,165,90,0.15)',
            backgroundColor: 'rgba(197,165,90,0.02)',
          }}>
          <h2 className="text-sm font-bold tracking-wider mb-4"
            style={{ color: BRAND.colors.gold }}>
            TOP FANDOMS
          </h2>
          <div className="space-y-3">
            {data.topFandoms.map((f, idx) => {
              const maxCount = data.topFandoms[0]?.count || 1;
              const pct = (f.count / maxCount) * 100;
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-6 text-right"
                    style={{ color: 'rgba(197,165,90,0.5)' }}>
                    #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm tracking-wider" style={{ color: 'white' }}>
                        {f.name}
                      </span>
                      <span className="text-xs font-bold"
                        style={{ color: BRAND.colors.gold }}>
                        {f.count}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgba(197,165,90,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${BRAND.colors.gold}, rgba(197,165,90,0.4))`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {data.topFandoms.length === 0 && (
              <p className="text-xs text-center tracking-wider"
                style={{ color: 'rgba(197,165,90,0.3)' }}>
                No data yet. Cards will appear here once fans start using the mirror.
              </p>
            )}
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="mb-8 p-4 md:p-6 rounded-lg border"
          style={{
            borderColor: 'rgba(197,165,90,0.15)',
            backgroundColor: 'rgba(197,165,90,0.02)',
          }}>
          <h2 className="text-sm font-bold tracking-wider mb-4"
            style={{ color: BRAND.colors.gold }}>
            HOURLY ACTIVITY (TODAY)
          </h2>
          <div className="flex items-end gap-1 h-32">
            {(() => {
              const maxH = Math.max(1, ...data.hourly.map((x) => x.count));
              return data.hourly.map((h) => {
              const height = (h.count / maxH) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px]" style={{ color: 'rgba(197,165,90,0.4)' }}>
                    {h.count || ''}
                  </span>
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      background: h.count > 0
                        ? `linear-gradient(180deg, ${BRAND.colors.gold}, rgba(197,165,90,0.3))`
                        : 'rgba(197,165,90,0.05)',
                    }}
                  />
                  <span className="text-[8px]" style={{ color: 'rgba(197,165,90,0.3)' }}>
                    {h.hour}
                  </span>
                </div>
              );
            });
            })()}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 flex gap-4 justify-center"
          style={{ borderTop: '1px solid rgba(197,165,90,0.1)' }}>
          <a href="/admin"
            className="text-sm tracking-wider transition-opacity hover:opacity-100 opacity-60"
            style={{ color: BRAND.colors.gold }}>
            \u2190 FANDOM MANAGEMENT
          </a>
          <a href="/"
            className="text-sm tracking-wider transition-opacity hover:opacity-100 opacity-60"
            style={{ color: BRAND.colors.gold }}>
            \u2190 SUMMONING MIRROR
          </a>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, onClick, clickable }: {
  icon: React.ReactNode; label: string; value: number; onClick?: () => void; clickable?: boolean;
}) {
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`p-4 md:p-6 rounded-lg border text-center transition-all ${clickable ? 'cursor-pointer hover:scale-105 hover:border-gold/40' : ''}`}
      style={{
        borderColor: 'rgba(197,165,90,0.15)',
        backgroundColor: 'rgba(197,165,90,0.03)',
        ...(clickable ? { background: 'none' } : {}),
      }}>
      <div className="flex justify-center mb-2" style={{ color: BRAND.colors.gold }}>
        {icon}
      </div>
      <p className="text-2xl md:text-4xl font-bold"
        style={{ color: BRAND.colors.gold }}>
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] md:text-xs tracking-wider mt-1"
        style={{ color: 'rgba(197,165,90,0.5)' }}>
        {label}
        {clickable && <span className="block text-[8px] mt-0.5 opacity-60">CLICK TO VIEW</span>}
      </p>
    </Tag>
  );
}

function SmtpSettingsPanel() {
  const [form, setForm] = useState({ host: '', port: '', user: '', pass: '', from: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/smtp-settings', { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => { setForm(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/smtp-settings', {
        method: 'PUT',
        headers: adminJsonHeaders(),
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('SMTP settings saved!');
      } else {
        const err = await res.json();
        setMsg(err.error || 'Failed to save');
      }
    } catch { setMsg('Network error'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleTestEmail = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/smtp-test', {
        method: 'POST', headers: adminHeaders(),
      });
      const d = await res.json();
      setMsg(d.success ? 'Test email sent!' : (d.error || 'Test failed'));
    } catch { setMsg('Network error'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 5000); }
  };

  const inputStyle = {
    backgroundColor: 'rgba(197,165,90,0.05)',
    borderColor: 'rgba(197,165,90,0.2)',
    color: 'white',
  };

  if (loading) return <div className="py-4 text-center"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: 'rgba(197,165,90,0.15)', backgroundColor: 'rgba(197,165,90,0.02)' }}>
      <h3 className="text-xs font-bold tracking-wider mb-3" style={{ color: BRAND.colors.gold }}>EMAIL / SMTP CONFIGURATION</h3>
      {msg && <div className="mb-3 p-2 rounded text-xs tracking-wider text-center" style={{ backgroundColor: 'rgba(197,165,90,0.1)', color: BRAND.colors.gold }}>{msg}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] tracking-wider mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>SMTP HOST</label>
          <input type="text" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })}
            placeholder="smtp.gmail.com" className="w-full px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] tracking-wider mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>SMTP PORT</label>
          <input type="text" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })}
            placeholder="587" className="w-full px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] tracking-wider mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>SMTP USER</label>
          <input type="text" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })}
            placeholder="user@example.com" className="w-full px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] tracking-wider mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>SMTP PASSWORD</label>
          <input type="password" value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })}
            placeholder="••••••••" className="w-full px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[10px] tracking-wider mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>FROM ADDRESS</label>
        <input type="text" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}
          placeholder="House of Spells <noreply@houseofspells.com>" className="w-full px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded border cursor-pointer text-xs tracking-wider disabled:opacity-50 transition-all hover:scale-105"
          style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
          {saving ? 'SAVING...' : 'SAVE SETTINGS'}
        </button>
        <button onClick={handleTestEmail} disabled={saving}
          className="px-4 py-2 rounded border cursor-pointer text-xs tracking-wider disabled:opacity-50 transition-all hover:scale-105"
          style={{ borderColor: 'rgba(197,165,90,0.3)', color: 'rgba(197,165,90,0.6)' }}>
          SEND TEST EMAIL
        </button>
      </div>
      <p className="text-[9px] tracking-wider mt-2" style={{ color: 'rgba(197,165,90,0.3)' }}>
        Settings are stored on the server and persist across deployments. Leave blank to use environment variables.
      </p>
    </div>
  );
}
