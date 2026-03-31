import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Link2, Tag, ChevronDown, ChevronUp,
  Check, BarChart2, Plus, Info, Layers
} from 'lucide-react';
import { useCreateLink, useCreateMultiLink } from '../hooks/useApi';
import CopyButton from '../components/CopyButton';

const MARKETPLACES = [
  {
    id: 'wb',
    label: 'Wildberries',
    accent: 'border-wb bg-wb-light',
    active: 'border-wb ring-2 ring-wb/30 bg-wb-light',
    dot: 'bg-wb',
    hint: 'Артикул WB (nmID) — число из URL: /catalog/{ID}/detail.aspx',
    placeholder: '16023994',
    example: 'https://www.wildberries.ru/catalog/16023994/detail.aspx',
  },
  {
    id: 'ozon',
    label: 'Ozon',
    accent: 'border-ozon bg-ozon-light',
    active: 'border-ozon ring-2 ring-ozon/30 bg-ozon-light',
    dot: 'bg-ozon',
    hint: 'ID товара из URL Ozon: /product/{slug}-{ID}/',
    placeholder: '1234567890',
    example: 'https://www.ozon.ru/product/1234567890/',
  },
  {
    id: 'ym',
    label: 'Яндекс Маркет',
    accent: 'border-ym bg-ym-light',
    active: 'border-ym ring-2 ring-ym/30 bg-ym-light',
    dot: 'bg-ym',
    hint: 'ID товара из URL: market.yandex.ru/product/{ID}',
    placeholder: '1730475462',
    example: 'https://market.yandex.ru/product/1730475462',
  },
];

const URL_BUILDERS = {
  wb:   (id) => `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
  ozon: (id) => `https://www.ozon.ru/product/${id}/`,
  ym:   (id) => `https://market.yandex.ru/product/${id}`,
};

function buildPreviewUrl(marketplace, productId, utms) {
  if (!marketplace || !productId) return null;
  try {
    const url = new URL(URL_BUILDERS[marketplace](productId));
    if (utms.source)   url.searchParams.set('utm_source',   utms.source);
    if (utms.medium)   url.searchParams.set('utm_medium',   utms.medium);
    if (utms.campaign) url.searchParams.set('utm_campaign', utms.campaign);
    if (utms.content)  url.searchParams.set('utm_content',  utms.content);
    if (utms.term)     url.searchParams.set('utm_term',     utms.term);
    return url.toString();
  } catch { return null; }
}

const UTM_FIELDS = [
  { key: 'source',   label: 'utm_source',   placeholder: 'telegram, vk, google' },
  { key: 'medium',   label: 'utm_medium',   placeholder: 'cpc, organic, social' },
  { key: 'campaign', label: 'utm_campaign', placeholder: 'summer_sale_2026' },
  { key: 'content',  label: 'utm_content',  placeholder: 'banner_top' },
  { key: 'term',     label: 'utm_term',     placeholder: 'кроссовки nike' },
];

export default function CreateLink() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('single'); // 'single' | 'multi'

  if (mode === 'multi') return <CreateMultiLink onBack={() => setMode('single')} />;
  return <CreateSingleLink onSwitchToMulti={() => setMode('multi')} />;
}

function CreateSingleLink({ onSwitchToMulti }) {
  const navigate = useNavigate();
  const createLink = useCreateLink();

  const [mp, setMp] = useState('wb');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [utms, setUtms] = useState({ source: '', medium: '', campaign: '', content: '', term: '' });
  const [showUtm, setShowUtm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const mpCfg = MARKETPLACES.find((m) => m.id === mp);
  const previewUrl = !useCustom ? buildPreviewUrl(mp, productId, utms) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const link = await createLink({
        name,
        marketplace: mp,
        ...(useCustom ? { custom_url: customUrl } : { product_id: productId }),
        utm_source:   utms.source   || undefined,
        utm_medium:   utms.medium   || undefined,
        utm_campaign: utms.campaign || undefined,
        utm_content:  utms.content  || undefined,
        utm_term:     utms.term     || undefined,
      });
      setCreated(link);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (created) {
    const shortUrl = `${window.location.origin}/r/${created.short_code}`;
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-slide-up">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Ссылка создана!</h2>
          <p className="text-sm text-gray-500 mb-6">{created.name}</p>

          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-4 text-left">
            <p className="text-xs font-semibold text-brand-500 mb-2 uppercase tracking-wide">Короткая ссылка</p>
            <p className="font-mono font-bold text-brand-700 text-base break-all mb-3">{shortUrl}</p>
            <CopyButton text={shortUrl} label className="w-full justify-center py-2" />
          </div>

          <div className="bg-surface-subtle rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-gray-400 font-medium mb-1.5">Целевой URL</p>
            <p className="text-xs font-mono text-gray-600 break-all">{created.original_url}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setCreated(null); setName(''); setProductId(''); setCustomUrl(''); setUtms({ source: '', medium: '', campaign: '', content: '', term: '' }); }}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" /> Ещё одну
            </button>
            <button onClick={() => navigate(`/links/${created.id}`)} className="btn-primary">
              <BarChart2 className="w-4 h-4" /> Аналитика
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-icon btn-ghost text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Создать ссылку</h1>
          <p className="text-sm text-gray-500">Диплинк с трекингом для маркетплейса</p>
        </div>
        <button
          type="button"
          onClick={onSwitchToMulti}
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
        >
          <Layers className="w-4 h-4" />
          Мульти-ссылка
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="card p-5">
          <label className="label">
            <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-gray-400" /> Название</div>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Кроссовки Nike — Telegram реклама"
            className="input"
            required
            autoFocus
          />
        </div>

        {/* Marketplace */}
        <div className="card p-5">
          <p className="label"><div className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-gray-400" /> Маркетплейс</div></p>
          <div className="grid grid-cols-3 gap-3">
            {MARKETPLACES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMp(m.id); setProductId(''); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                  mp === m.id ? m.active : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${m.dot}`} />
                <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{m.label}</span>
                {mp === m.id && <Check className="w-3.5 h-3.5 text-gray-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Product */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label mb-0">Товар</p>
            <button
              type="button"
              onClick={() => setUseCustom(!useCustom)}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              {useCustom ? '← По ID товара' : 'Вставить URL →'}
            </button>
          </div>

          {useCustom ? (
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://www.wildberries.ru/catalog/..."
              className="input"
              required
            />
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value.replace(/\D/g, ''))}
                placeholder={mpCfg.placeholder}
                className="input font-mono"
                required
              />
              <div className="flex items-start gap-1.5 text-xs text-gray-400">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{mpCfg.hint}</span>
              </div>
            </div>
          )}

          {/* URL preview */}
          {previewUrl && (
            <div className="mt-3 p-3 bg-surface-subtle rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-400 font-medium mb-1">Итоговый URL:</p>
              <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">{previewUrl}</p>
            </div>
          )}
        </div>

        {/* UTM */}
        <div className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowUtm(!showUtm)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-subtle transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">UTM-параметры</p>
                <p className="text-xs text-gray-400">Для отслеживания источника трафика</p>
              </div>
            </div>
            {showUtm
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showUtm && (
            <div className="px-5 pb-5 pt-1 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UTM_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label-xs">{label}</label>
                  <input
                    type="text"
                    value={utms[key]}
                    onChange={(e) => setUtms((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input input-sm font-mono"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <Info className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Создаём...</>
          ) : (
            <><Link2 className="w-4 h-4" /> Создать диплинк</>
          )}
        </button>
      </form>
    </div>
  );
}

const MP_MULTI = [
  { id: 'wb',   label: 'Wildberries',   dot: 'bg-wb',   placeholder: 'https://www.wildberries.ru/catalog/...' },
  { id: 'ozon', label: 'Ozon',          dot: 'bg-ozon', placeholder: 'https://www.ozon.ru/product/...' },
  { id: 'ym',   label: 'Яндекс Маркет', dot: 'bg-ym',   placeholder: 'https://market.yandex.ru/product/...' },
];

function CreateMultiLink({ onBack }) {
  const navigate = useNavigate();
  const createMultiLink = useCreateMultiLink();

  const [name, setName] = useState('');
  const [urls, setUrls] = useState({ wb: '', ozon: '', ym: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const link = await createMultiLink({
        name,
        wb_url:   urls.wb   || undefined,
        ozon_url: urls.ozon || undefined,
        ym_url:   urls.ym   || undefined,
      });
      setCreated(link);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    const shortUrl = `${window.location.origin}/r/${created.short_code}`;
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-slide-up">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Мульти-ссылка создана!</h2>
          <p className="text-sm text-gray-500 mb-6">{created.name}</p>
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-4 text-left">
            <p className="text-xs font-semibold text-brand-500 mb-2 uppercase tracking-wide">Короткая ссылка</p>
            <p className="font-mono font-bold text-brand-700 text-base break-all mb-3">{shortUrl}</p>
            <CopyButton text={shortUrl} label className="w-full justify-center py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setCreated(null); setName(''); setUrls({ wb: '', ozon: '', ym: '' }); }} className="btn-secondary">
              <Plus className="w-4 h-4" /> Ещё одну
            </button>
            <button onClick={() => navigate('/')} className="btn-primary">
              <BarChart2 className="w-4 h-4" /> К ссылкам
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-icon btn-ghost text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Мульти-ссылка</h1>
          <p className="text-sm text-gray-500">Один диплинк — выбор маркетплейса при переходе</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-5">
          <label className="label"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-gray-400" /> Название</div></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Кроссовки Nike — все площадки"
            className="input"
            required
            autoFocus
          />
        </div>

        <div className="card p-5 space-y-4">
          <p className="label"><div className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-gray-400" /> Ссылки на маркетплейсы</div></p>
          <p className="text-xs text-gray-400 -mt-2">Добавьте хотя бы одну. Только добавленные МП будут показаны при выборе.</p>
          {MP_MULTI.map(({ id, label, dot, placeholder }) => (
            <div key={id}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                {label}
              </label>
              <input
                type="url"
                value={urls[id]}
                onChange={(e) => setUrls((p) => ({ ...p, [id]: e.target.value }))}
                placeholder={placeholder}
                className="input"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <Info className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Создаём...</>
            : <><Layers className="w-4 h-4" /> Создать мульти-ссылку</>
          }
        </button>
      </form>
    </div>
  );
}
