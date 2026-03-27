import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, BarChart2, Trash2,
  MousePointerClick, Smartphone, Monitor, Apple,
  Link2
} from 'lucide-react';
import { useLinks, useDeleteLink } from '../hooks/useApi';
import MarketplaceBadge from '../components/MarketplaceBadge';
import CopyButton from '../components/CopyButton';

const MP_FILTERS = [
  { id: 'all',  label: 'Все' },
  { id: 'wb',   label: 'WB' },
  { id: 'ozon', label: 'Ozon' },
  { id: 'ym',   label: 'Я.Маркет' },
];

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function PlatformIcons({ ios, android, desktop }) {
  if (!ios && !android && !desktop) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {ios      > 0 && <span className="flex items-center gap-1"><Apple    className="w-3 h-3 text-gray-400" />{ios}</span>}
      {android  > 0 && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-gray-400" />{android}</span>}
      {desktop  > 0 && <span className="flex items-center gap-1"><Monitor  className="w-3 h-3 text-gray-400" />{desktop}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { links, loading, error, refetch } = useLinks();
  const deleteLink = useDeleteLink();
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [mpFilter, setMpFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const filtered = links.filter((l) => {
    const matchMp = mpFilter === 'all' || l.marketplace === mpFilter;
    const matchS  = !search || l.name.toLowerCase().includes(search.toLowerCase());
    return matchMp && matchS;
  });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Удалить эту ссылку и все её данные?')) return;
    setDeleting(id);
    try { await deleteLink(id); refetch(); }
    finally { setDeleting(null); }
  };

  const totalClicks = links.reduce((s, l) => s + (l.clicks_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ссылки</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {links.length} ссылок · {totalClicks} кликов
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          <Plus className="w-4 h-4" />
          Создать ссылку
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 bg-surface-muted p-1 rounded-xl">
          {MP_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMpFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mpFilter === id
                  ? 'bg-white text-gray-900 shadow-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-red-500 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {search || mpFilter !== 'all' ? 'Ничего не найдено' : 'Нет ссылок'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search || mpFilter !== 'all' ? 'Попробуйте другой фильтр' : 'Создайте первую диплинк-ссылку'}
          </p>
          {!search && mpFilter === 'all' && (
            <Link to="/create" className="btn-primary">
              <Plus className="w-4 h-4" /> Создать ссылку
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-surface-subtle">
                <th className="th">Название</th>
                <th className="th">Площадка</th>
                <th className="th">Короткая ссылка</th>
                <th className="th text-right">Клики</th>
                <th className="th">Устройства</th>
                <th className="th">Дата</th>
                <th className="th w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((link) => {
                const shortUrl = `${window.location.origin}/r/${link.short_code}`;
                return (
                  <tr
                    key={link.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/links/${link.id}`)}
                  >
                    {/* Name */}
                    <td className="td max-w-[200px]">
                      <div className="font-medium text-gray-900 truncate">{link.name}</div>
                      <a
                        href={link.original_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-gray-400 hover:text-brand-600 truncate block max-w-[180px] transition-colors"
                      >
                        {link.original_url}
                      </a>
                    </td>

                    {/* Marketplace */}
                    <td className="td">
                      <MarketplaceBadge marketplace={link.marketplace} />
                    </td>

                    {/* Short URL */}
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-brand-600 hover:underline"
                        >
                          /r/{link.short_code}
                        </a>
                        <CopyButton text={shortUrl} />
                      </div>
                    </td>

                    {/* Clicks */}
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5 text-gray-300" />
                        <span className="font-semibold text-gray-900">{link.clicks_total || 0}</span>
                      </div>
                    </td>

                    {/* Platforms */}
                    <td className="td">
                      <PlatformIcons ios={link.clicks_ios} android={link.clicks_android} desktop={link.clicks_desktop} />
                    </td>

                    {/* Date */}
                    <td className="td text-gray-400 text-xs">{formatDate(link.created_at)}</td>

                    {/* Actions */}
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/links/${link.id}`)}
                          className="btn-icon btn-ghost text-gray-400 hover:text-brand-600"
                          title="Аналитика"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(link.id, e)}
                          disabled={deleting === link.id}
                          className="btn-icon btn-ghost text-gray-400 hover:text-red-500"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
