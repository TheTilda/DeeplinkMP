import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MousePointerClick, Users, Apple, Smartphone,
  Monitor, Tag, ExternalLink, Globe, Link2, Clock,
  Layers, Map, Share2, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useLinkAnalytics } from '../hooks/useApi';
import MarketplaceBadge from '../components/MarketplaceBadge';
import CopyButton from '../components/CopyButton';
import BreakdownBar from '../components/BreakdownBar';
import Heatmap from '../components/Heatmap';

/* ── palette ── */
const PLT_COLORS  = { ios: '#007AFF', android: '#34C759', desktop: '#8E8E93' };
const PLT_ICONS   = { ios: Apple, android: Smartphone, desktop: Monitor };
const PLT_LABEL   = { ios: 'iOS', android: 'Android', desktop: 'Desktop' };
const OS_PALETTE  = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#64748b'];
const REF_PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#64748b'];

const PERIOD_OPTS = [
  { label: '7д',  value: '7' },
  { label: '30д', value: '30' },
  { label: '90д', value: '90' },
];

const TABS = [
  { id: 'overview', label: 'Обзор',     icon: Activity },
  { id: 'devices',  label: 'Устройства', icon: Layers },
  { id: 'geo',      label: 'География',  icon: Map },
  { id: 'sources',  label: 'Источники',  icon: Share2 },
  { id: 'heatmap',  label: 'Активность', icon: Clock },
];

const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-modal px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, sub, accent = 'bg-brand-50 text-brand-600' }) {
  return (
    <div className="stat-card">
      <div className={`w-8 h-8 rounded-xl ${accent} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Flag emoji from country code
function flag(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  );
}

/* ═══════════════════════════════════════════════ */
export default function LinkAnalytics() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [period,  setPeriod]  = useState('30');
  const [tab,     setTab]     = useState('overview');
  const { data, loading, error } = useLinkAnalytics(id, period);

  if (loading) return (
    <div className="card p-16 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
  if (error || !data) return (
    <div className="card p-8 text-center text-red-500 text-sm">{error || 'Ошибка загрузки'}</div>
  );

  const {
    link, total, totalUnique,
    byPlatform, byOs, byBrowser, byDeviceType,
    byCountry, byCity, byReferer,
    byDay, byHour, byWeekday,
  } = data;

  const shortUrl   = `${window.location.origin}/r/${link.short_code}`;
  const uniquePct  = total ? Math.round((totalUnique / total) * 100) : 0;

  /* pie data for platforms */
  const piePlatform = byPlatform.map((p) => ({
    name: PLT_LABEL[p.platform] || p.platform,
    value: p.count,
    color: PLT_COLORS[p.platform] || '#999',
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/')} className="btn-icon btn-ghost text-gray-400 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{link.name}</h1>
            <MarketplaceBadge marketplace={link.marketplace} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-sm text-brand-600">{shortUrl}</span>
            <CopyButton text={shortUrl} />
            <a href={link.original_url} target="_blank" rel="noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-surface-muted p-1 rounded-xl shrink-0">
          {PERIOD_OPTS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                period === value
                  ? 'bg-white text-gray-900 shadow-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MousePointerClick} label="Всего кликов"    value={total}        accent="bg-brand-50 text-brand-600" />
        <StatCard icon={Users}             label="Уникальных"      value={totalUnique}  sub={`${uniquePct}% от всех`} accent="bg-violet-50 text-violet-600" />
        {byPlatform.slice(0, 2).map((p) => {
          const Icon = PLT_ICONS[p.platform] || Monitor;
          const pct  = total ? `${Math.round((p.count / total) * 100)}%` : '0%';
          return (
            <StatCard key={p.platform} icon={Icon}
              label={PLT_LABEL[p.platform] || p.platform}
              value={p.count} sub={pct}
              accent="bg-gray-50 text-gray-500" />
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
              tab === tid
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Area chart */}
          <SectionCard title={`Клики за ${period} дней`} icon={Activity}>
            {byDay.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Нет данных за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={byDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#5353ff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#5353ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradUniq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="count"        name="кликов"      stroke="#5353ff" strokeWidth={2} fill="url(#gradTotal)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="unique_count" name="уникальных"  stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gradUniq)" dot={false} activeDot={{ r: 3 }} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Platform pie + top country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Платформы" icon={Layers}>
              {piePlatform.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={piePlatform} cx="50%" cy="45%" innerRadius={44} outerRadius={68}
                      dataKey="value" paddingAngle={2}>
                      {piePlatform.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #f0f0f0' }}
                      formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Топ стран" icon={Globe}>
              <BreakdownBar
                items={byCountry.filter((r) => r.country !== 'Неизвестно').slice(0, 6)}
                total={total}
                labelFn={(r) => `${flag(r.country_code)} ${r.country}`}
                valueFn={(r) => r.count}
                colorFn={(_, i) => OS_PALETTE[i % OS_PALETTE.length]}
              />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ══════════════ DEVICES ══════════════ */}
      {tab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Операционные системы" icon={Layers}>
            <BreakdownBar
              items={byOs}
              total={total}
              labelFn={(r) => r.os}
              valueFn={(r) => r.count}
              colorFn={(_, i) => OS_PALETTE[i % OS_PALETTE.length]}
            />
          </SectionCard>

          <SectionCard title="Браузеры" icon={Globe}>
            <BreakdownBar
              items={byBrowser}
              total={total}
              labelFn={(r) => r.browser}
              valueFn={(r) => r.count}
              colorFn={(_, i) => REF_PALETTE[i % REF_PALETTE.length]}
            />
          </SectionCard>

          <SectionCard title="Тип устройства" icon={Monitor} className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                { type: 'mobile',  icon: Smartphone, label: 'Мобильные' },
                { type: 'desktop', icon: Monitor,    label: 'Десктоп'   },
              ].map(({ type, icon: Icon, label }) => {
                const found = byDeviceType.find((d) => d.device_type === type);
                const count = found?.count || 0;
                const pct   = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type} className="text-center p-4 bg-surface-subtle rounded-xl">
                    <Icon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{pct}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    <p className="text-xs text-gray-400">{count} кликов</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════ GEO ══════════════ */}
      {tab === 'geo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Страны" icon={Globe} className="md:col-span-2">
            {byCountry.filter((r) => r.country !== 'Неизвестно').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Геоданные появятся после первых реальных переходов с публичного сервера</p>
            ) : (
              <div className="space-y-2">
                {byCountry.filter((r) => r.country !== 'Неизвестно').map((r, i) => {
                  const pct = total ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.country_code || i} className="flex items-center gap-3">
                      <span className="text-lg w-7 shrink-0 text-center">{flag(r.country_code)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-800 truncate">{r.country || 'Unknown'}</span>
                          <span className="text-gray-400 shrink-0 ml-2">{r.count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 bg-brand-500"
                            style={{ width: `${Math.max(pct, 1)}%`, opacity: 0.6 + 0.4 * (pct / 100) }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Топ городов" icon={Map}>
            <BreakdownBar
              items={byCity}
              total={total}
              labelFn={(r) => `${r.city}${r.country ? `, ${r.country}` : ''}`}
              valueFn={(r) => r.count}
              colorFn={() => '#6366f1'}
            />
          </SectionCard>
        </div>
      )}

      {/* ══════════════ SOURCES ══════════════ */}
      {tab === 'sources' && (
        <div className="space-y-4">
          <SectionCard title="Источники трафика" icon={Share2}>
            {byReferer.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {byReferer.map((r, i) => {
                  const domain   = r.referer_domain || 'unknown';
                  const pct      = total ? Math.round((r.count / total) * 100) : 0;
                  const color    = REF_PALETTE[i % REF_PALETTE.length];
                  const isDirect = domain === 'direct';
                  return (
                    <div key={domain + i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-xs"
                        style={{ background: color + '22', color }}>
                        {isDirect ? <Link2 className="w-3 h-3" /> : domain[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-800 truncate">
                            {isDirect ? 'Прямой переход' : domain}
                          </span>
                          <span className="text-gray-400 shrink-0 ml-2">{r.count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 1)}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* UTM params */}
          {(link.utm_source || link.utm_medium || link.utm_campaign) && (
            <SectionCard title="UTM-параметры" icon={Tag}>
              <div className="flex flex-wrap gap-2">
                {[
                  ['utm_source', link.utm_source],
                  ['utm_medium', link.utm_medium],
                  ['utm_campaign', link.utm_campaign],
                  ['utm_content', link.utm_content],
                  ['utm_term', link.utm_term],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="badge bg-indigo-50 border border-indigo-100 text-indigo-700">
                    <span className="text-indigo-400 font-normal">{k}=</span>{v}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ══════════════ HEATMAP ══════════════ */}
      {tab === 'heatmap' && (
        <div className="space-y-4">
          <SectionCard title="Активность по дням и часам" icon={Clock}>
            <p className="text-xs text-gray-400 mb-4">
              Распределение кликов по часам и дням недели (UTC). Тёмнее = больше кликов.
            </p>
            <Heatmap byHour={byHour} byWeekday={byWeekday} />
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="По часам суток" icon={Clock}>
              {byHour.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={Array.from({ length: 24 }, (_, h) => ({
                    hour: `${String(h).padStart(2, '0')}`,
                    count: byHour.find((x) => x.hour === h)?.count || 0,
                  }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                      interval={2} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f0f0f0' }}
                      formatter={(v) => [v, 'кликов']} />
                    <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="По дням недели" icon={Activity}>
              {byWeekday.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d, i) => ({
                    day: d,
                    count: byWeekday.find((x) => x.weekday === i)?.count || 0,
                  }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f0f0f0' }}
                      formatter={(v) => [v, 'кликов']} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
