import { useState, useEffect, useCallback } from 'react';
import {
  Lock, Eye, EyeOff, Check, AlertCircle, ShieldCheck,
  Key, Plus, Trash2, Copy, X, Terminal, RefreshCw,
} from 'lucide-react';
import { useAuth, useApiFetch } from '../hooks/useAuth';

// ── Password change section ───────────────────────────────────────────────────

function PasswordSection() {
  const apiFetch = useApiFetch();
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (next !== confirm) { setError('Новые пароли не совпадают'); return; }
    if (next.length < 8)  { setError('Пароль должен быть не менее 8 символов'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = next.length === 0 ? null
    : next.length < 8  ? 'weak'
    : next.length < 12 ? 'medium'
    : 'strong';

  const strengthCfg = {
    weak:   { label: 'Слабый',   bar: 'w-1/3 bg-red-400' },
    medium: { label: 'Средний',  bar: 'w-2/3 bg-amber-400' },
    strong: { label: 'Надёжный', bar: 'w-full bg-emerald-400' },
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Смена пароля</h2>
          <p className="text-xs text-gray-400 mt-0.5">После смены все другие сессии будут закрыты</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Текущий пароль</label>
          <div className="relative">
            <input
              type={showCur ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="input pr-10"
              required
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCur(!showCur)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
              {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Новый пароль</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Минимум 8 символов"
              className="input pr-10"
              required
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {strength && (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strengthCfg[strength].bar}`} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{strengthCfg[strength].label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="label">Подтверждение</label>
          <div className="relative">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`input pr-10 ${confirm && next !== confirm ? 'border-red-300 focus:ring-red-400' : ''}`}
              required
              autoComplete="new-password"
            />
            {confirm && next === confirm && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Пароль успешно изменён
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Сохраняем...</>
            : <><Lock className="w-4 h-4" />Сохранить пароль</>
          }
        </button>
      </form>
    </div>
  );
}

// ── API Tokens section (admin only) ──────────────────────────────────────────

function NewTokenBanner({ token, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-800">Токен создан — сохраните его сейчас!</p>
        </div>
        <button onClick={onDismiss} className="text-emerald-400 hover:text-emerald-600 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-emerald-700">Токен показывается только один раз. После закрытия его нельзя восстановить.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs bg-white border border-emerald-200 rounded-xl px-3 py-2.5 text-gray-900 truncate select-all">
          {token}
        </code>
        <button
          onClick={copy}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
            copied
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
    </div>
  );
}

function ApiTokensSection() {
  const apiFetch = useApiFetch();
  const [tokens,    setTokens]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [newToken,  setNewToken]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/admin/tokens')
      .then((r) => r.json())
      .then(setTokens)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/api/admin/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setNewToken(data.token);
      setNewName('');
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    if (!confirm('Отозвать токен? Все запросы с этим токеном перестанут работать.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/tokens/${id}`, { method: 'DELETE' });
      if (newToken) setNewToken(null);
      load();
    } catch (e) {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Key className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">API-токены</h2>
            <p className="text-xs text-gray-400 mt-0.5">Для доступа к API без авторизации в браузере</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); }}
          className="btn-secondary btn-sm gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Создать токен
        </button>
      </div>

      {/* New token banner */}
      {newToken && (
        <div className="mb-4">
          <NewTokenBanner token={newToken} onDismiss={() => setNewToken(null)} />
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={create} className="mb-4 p-4 bg-surface-subtle rounded-2xl border border-gray-100 space-y-3">
          <p className="text-xs font-medium text-gray-700">Новый токен</p>
          <div>
            <label className="label-xs">Название <span className="text-gray-400">(например: «CI сервер», «Интеграция 1С»)</span></label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название токена"
              className="input"
              required
              autoFocus
              maxLength={64}
            />
          </div>
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="btn btn-ghost btn-sm">Отмена</button>
            <button type="submit" disabled={creating || !newName.trim()} className="btn-primary btn-sm">
              {creating
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Key className="w-3.5 h-3.5" />Создать</>
              }
            </button>
          </div>
        </form>
      )}

      {/* Token list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Загрузка...
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Terminal className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Токенов пока нет</p>
          <p className="text-xs text-gray-400">Создайте токен для доступа к API из внешних систем</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-surface-subtle rounded-xl border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Key className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                  <code className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                    {t.token_prefix}…
                  </code>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>Создан {formatDate(t.created_at)}</span>
                  {t.last_used_at && <span>· Использован {formatDate(t.last_used_at)}</span>}
                  {!t.last_used_at && <span className="text-gray-300">· Не использовался</span>}
                </div>
              </div>
              <button
                onClick={() => revoke(t.id)}
                disabled={deletingId === t.id}
                title="Отозвать токен"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Usage hint */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Использование</p>
        <code className="text-xs font-mono text-gray-600 block leading-relaxed">
          Authorization: Bearer dlk_xxxxxxxxxx…
        </code>
      </div>
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────

export default function Settings() {
  const { username, isAdmin } = useAuth();

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-0.5">Управление аккаунтом и доступом</p>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
            {username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{username}</p>
              {isAdmin
                ? <span className="badge bg-brand-50 text-brand-600 border border-brand-100"><ShieldCheck className="w-3 h-3" />Администратор</span>
                : <span className="badge bg-gray-50 text-gray-600 border border-gray-200">Пользователь</span>
              }
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Ваш профиль в системе</p>
          </div>
        </div>
      </div>

      <PasswordSection />

      {isAdmin && <ApiTokensSection />}
    </div>
  );
}
