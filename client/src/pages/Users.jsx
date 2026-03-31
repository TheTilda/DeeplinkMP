import { useEffect, useState } from 'react';
import { Trash2, UserPlus, Eye, EyeOff, X, ShieldCheck, User } from 'lucide-react';
import { useApiFetch } from '../hooks/useAuth';

export default function Users() {
  const apiFetch = useApiFetch();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionId, setActionId] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/users')
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (id) => {
    if (!confirm('Удалить пользователя?')) return;
    setActionId(id);
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
    setActionId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление доступом к системе</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <UserPlus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {showForm && (
        <CreateUserForm
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
          apiFetch={apiFetch}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Нет пользователей</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {u.username[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{u.username}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                    u.role === 'admin'
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                {u.email && <div className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</div>}
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(u.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {u.role !== 'admin' && (
                <button
                  onClick={() => remove(u.id)}
                  disabled={actionId === u.id}
                  title="Удалить"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onClose, onCreated, apiFetch }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, email: email || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Новый пользователь</h2>
        <button onClick={onClose} className="btn-icon btn-ghost text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="input"
              required
              minLength={3}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Email <span className="text-gray-400">(необязательно)</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 8 символов"
                className="input pr-10"
                required
                minLength={8}
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
          <div>
            <label className="label">Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost text-sm px-4 py-2">Отмена</button>
          <button type="submit" disabled={loading} className="btn-primary text-sm px-5 py-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}
