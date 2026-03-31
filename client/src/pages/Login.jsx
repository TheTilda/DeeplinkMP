import { useState } from 'react';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-subtle">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-white font-bold text-lg">DeepLinker</span>
        </div>

        <div>
          <h2 className="text-white text-3xl font-bold leading-tight mb-4">
            Умные диплинки<br/>для маркетплейсов
          </h2>
          <p className="text-brand-200 text-sm leading-relaxed mb-8">
            Короткие ссылки с UTM-трекингом для Wildberries, Ozon и Яндекс Маркет. Открывают приложение напрямую.
          </p>

          <div className="space-y-4">
            {[
              { icon: '⚡', title: 'Мгновенный редирект', desc: 'Открывает приложение за ~100мс' },
              { icon: '📊', title: 'Детальная аналитика', desc: 'Клики, гео, устройства, источники' },
              { icon: '🔗', title: 'Мульти-ссылки', desc: 'Один диплинк — все маркетплейсы' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-base shrink-0 mt-0.5">
                  {icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-brand-200 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
            {[
              { value: 'WB',   label: 'Wildberries' },
              { value: 'Ozon', label: 'Ozon' },
              { value: 'ЯМ',   label: 'Яндекс Маркет' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-white font-bold text-sm">{value}</p>
                <p className="text-brand-300 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-300 text-xs">© 2026 DeepLinker</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">DeepLinker</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Добро пожаловать</h1>
            <p className="text-sm text-gray-500">Войдите в личный кабинет</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Логин</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="input"
                autoFocus
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">Пароль</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm mt-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Входим...
                </>
              ) : 'Войти'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
