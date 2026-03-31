import { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth, useApiFetch } from '../hooks/useAuth';

export default function Settings() {
  const { username, isAdmin } = useAuth();
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
    if (next !== confirm)  { setError('Новые пароли не совпадают'); return; }
    if (next.length < 8)   { setError('Пароль должен быть не менее 8 символов'); return; }
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
    weak:   { label: 'Слабый',    bar: 'w-1/3 bg-red-400' },
    medium: { label: 'Средний',   bar: 'w-2/3 bg-amber-400' },
    strong: { label: 'Надёжный',  bar: 'w-full bg-emerald-400' },
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-0.5">Управление аккаунтом</p>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
            {username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{username}</p>
              {isAdmin
                ? <span className="badge bg-brand-50 text-brand-600 border border-brand-100">Администратор</span>
                : <span className="badge bg-gray-50 text-gray-600 border border-gray-200">Пользователь</span>
              }
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Управление аккаунтом</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Смена пароля</h2>
            <p className="text-xs text-gray-400">После смены все другие сессии будут закрыты</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
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

          {/* New password */}
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

          {/* Confirm */}
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
    </div>
  );
}
