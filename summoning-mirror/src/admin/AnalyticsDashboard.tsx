import { useAnalytics } from '../hooks/useAnalytics';
import { BRAND } from '../utils/branding';
import { RefreshCw, TrendingUp, Users, Share2, Mail, BarChart3, LogOut } from 'lucide-react';
import { clearAdminToken } from '../utils/adminAuth';

interface AnalyticsDashboardProps {
  onLogout: () => void;
}

export default function AnalyticsDashboard({ onLogout }: AnalyticsDashboardProps) {
  const { data, loading, error, refetch } = useAnalytics();

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
          <KpiCard icon={<Mail size={20} />} label="Emails Collected" value={data.totalEmails} />
          <KpiCard icon={<Users size={20} />} label="Active Fandoms" value={Object.keys(data.fandomCounts).length} />
        </div>

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

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-4 md:p-6 rounded-lg border text-center"
      style={{
        borderColor: 'rgba(197,165,90,0.15)',
        backgroundColor: 'rgba(197,165,90,0.03)',
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
      </p>
    </div>
  );
}
