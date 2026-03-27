import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Link2, MousePointerClick, TrendingUp,
  Smartphone, Monitor, Apple, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAnalytics } from '../hooks/useApi';
import MarketplaceBadge from '../components/MarketplaceBadge';

const MP_COLORS  = { wb: '#CB11AB', ozon: '#005BFF', ym: '#FC3F1D' };
const PLT_COLORS = { ios: '#007AFF', android: '#34C759', desktop: '#8E8E93' };
const PLT_ICONS  = { ios: Apple, android: Smartphone, desktop: Monitor };
const PLT_LABEL  = { ios: 'iOS', android: 'Android', desktop: 'Desktop' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-modal px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">{payload[0].value} кликов</p>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, accent = 'bg-brand-50 text-brand-600' }) {
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { data, loading } = useAnalytics();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="card p-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { totalLinks, totalClicks, clicksByMarketplace, clicksByDay, clicksByPlatform, topLinks } = data;
  const chartData = [...(clicksByDay || [])].reverse();
  const avgPerLink = totalLinks ? Math.round(totalClicks / totalLinks) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Аналитика</h1>
        <p className="text-sm text-gray-500 mt-0.5">Сводная статистика по всем ссылкам</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Link2}            label="Ссылок создано"  value={totalLinks}  accent="bg-brand-50 text-brand-600" />
        <StatCard icon={MousePointerClick} label="Всего кликов"   value={totalClicks} accent="bg-violet-50 text-violet-600" />
        <StatCard icon={TrendingUp}        label="Avg. на ссылку" value={avgPerLink}  accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={BarChart3}         label="Маркетплейсов"  value={clicksByMarketplace.length} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Area chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Клики по дням</h2>
            <p className="text-xs text-gray-400">Последние 30 дней</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">Нет данных</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#5353ff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#5353ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#5353ff" strokeWidth={2} fill="url(#clickGrad)" dot={false} activeDot={{ r: 4, fill: '#5353ff' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By marketplace */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">По маркетплейсам</h2>
          {clicksByMarketplace.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {clicksByMarketplace.map(({ marketplace, clicks }) => {
                const pct = totalClicks ? Math.round((clicks / totalClicks) * 100) : 0;
                const label = marketplace === 'wb' ? 'Wildberries' : marketplace === 'ozon' ? 'Ozon' : 'Яндекс Маркет';
                const color = MP_COLORS[marketplace];
                return (
                  <div key={marketplace}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-gray-500 text-xs">{clicks} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By platform */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">По устройствам</h2>
          {clicksByPlatform.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {clicksByPlatform.map(({ platform, count }) => {
                const pct = totalClicks ? Math.round((count / totalClicks) * 100) : 0;
                const Icon = PLT_ICONS[platform] || Monitor;
                const color = PLT_COLORS[platform] || '#999';
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                        {PLT_LABEL[platform] || platform}
                      </span>
                      <span className="text-gray-500 text-xs">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top links */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Топ ссылок</h2>
        </div>
        {topLinks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Нет данных</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-subtle">
                <th className="th">#</th>
                <th className="th">Название</th>
                <th className="th">Площадка</th>
                <th className="th text-right">Клики</th>
                <th className="th w-10" />
              </tr>
            </thead>
            <tbody>
              {topLinks.map((l, i) => (
                <tr key={l.id} className="table-row cursor-pointer" onClick={() => navigate(`/links/${l.id}`)}>
                  <td className="td text-gray-400 font-mono text-xs w-10">{String(i + 1).padStart(2, '0')}</td>
                  <td className="td font-medium text-gray-900">{l.name}</td>
                  <td className="td"><MarketplaceBadge marketplace={l.marketplace} /></td>
                  <td className="td text-right font-bold text-gray-900">{l.clicks}</td>
                  <td className="td"><ArrowRight className="w-4 h-4 text-gray-300 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
